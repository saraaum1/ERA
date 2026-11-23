/**
 * One command to prepare an ERA database:   npm run db:setup
 *  - PostgreSQL (Neon / Vercel): runs ERA_database.postgres.sql
 *  - MySQL / MariaDB (local / Railway): runs ERA_database.sql (+ Upload table)
 * Safe to run again. Adds the demo content unless ERA_SEED_DEMO=false.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { connect, pgUrl } from "./db.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

/** Split the MySQL file into statements, honouring DELIMITER blocks and skipping CREATE DATABASE / USE. */
function mysqlStatements(sqlText) {
  const out = [];
  let delimiter = ";";
  let buf = [];
  for (const raw of sqlText.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!buf.length && (t === "" || t.startsWith("--"))) continue;
    const d = t.match(/^DELIMITER\s+(\S+)/i);
    if (d) {
      delimiter = d[1];
      continue;
    }
    buf.push(line);
    if (t.endsWith(delimiter)) {
      let stmt = buf.join("\n").trim();
      stmt = stmt.slice(0, stmt.length - delimiter.length).trim();
      buf = [];
      if (/^(CREATE\s+DATABASE|USE\s)/i.test(stmt)) continue;
      if (stmt) out.push(stmt);
    }
  }
  return out;
}

if (
  process.argv.includes("--if-configured") &&
  !pgUrl() &&
  !process.env.DB_HOST &&
  !process.env.MYSQL_URL &&
  !process.env.MYSQLHOST
) {
  console.log("No database configured yet — skipping database setup.");
  process.exit(0);
}

const db = await connect();
try {
  if (db.isPg) {
    await db.raw(readFileSync(path.join(root, "ERA_database.postgres.sql"), "utf8"));
    console.log("PostgreSQL database ready (tables, triggers, Upload table).");
  } else {
    const list = mysqlStatements(readFileSync(path.join(root, "ERA_database.sql"), "utf8"));
    for (const stmt of list) await db.query(stmt);
    await db.query(
      "CREATE TABLE IF NOT EXISTS Upload (uploadID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mime VARCHAR(30) NOT NULL, data MEDIUMBLOB NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB",
    );
    console.log(`MySQL database ready: ${list.length} schema statements applied.`);
  }
} finally {
  await db.end();
}

if (process.env.ERA_SEED_DEMO === "false") {
  console.log("ERA_SEED_DEMO=false — skipping demo content.");
} else {
  for (const script of ["seed-demo.mjs", "seed-saudi.mjs", "fix-dates.mjs"]) {
    const r = spawnSync(process.execPath, [path.join(here, script)], {
      stdio: "inherit",
      env: process.env,
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
console.log("ERA database setup complete.");
