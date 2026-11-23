/**
 * One command to prepare an ERA database (local or on Railway):
 *   npm run db:setup
 * 1. Creates every table and trigger from ERA_database.sql (safe to run again).
 * 2. Adds the Upload table for provider cover photos.
 * 3. Adds the demo content unless ERA_SEED_DEMO=false.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";
import { dbConfig } from "./db-config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

/** Split ERA_database.sql into statements, honouring DELIMITER blocks and skipping CREATE DATABASE / USE. */
function statements(sqlText) {
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

const cfg = dbConfig();
if (!cfg.user) {
  console.error("Missing database settings. Set DB_* in .env, or MYSQL_URL on Railway.");
  process.exit(1);
}

const db = await mysql.createConnection({ ...cfg, multipleStatements: false });
try {
  const list = statements(readFileSync(path.join(root, "ERA_database.sql"), "utf8"));
  for (const stmt of list) await db.query(stmt);
  await db.query(
    "CREATE TABLE IF NOT EXISTS Upload (uploadID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mime VARCHAR(30) NOT NULL, data MEDIUMBLOB NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB",
  );
  console.log(`Database ready: ${list.length} schema statements applied to "${cfg.database}".`);
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
