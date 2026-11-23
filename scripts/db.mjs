/**
 * Database connection for ERA scripts — same rules as src/lib/era/db-engine.ts:
 *  - PostgreSQL (Neon): DATABASE_URL / POSTGRES_URL starting with postgres://
 *  - MySQL / MariaDB: DB_* in .env, or MYSQL_URL / MYSQL* variables.
 * Returns a mysql2-style object: execute / query → [rows | { affectedRows, insertId }], end().
 */
import mysql from "mysql2/promise";
import pg from "pg";

export function pgUrl() {
  const u = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  return /^postgres(ql)?:\/\//i.test(u) ? u : "";
}

export function mysqlConfig() {
  const env = process.env;
  const url =
    env.MYSQL_URL || (/^mysql:\/\//i.test(env.DATABASE_URL || "") ? env.DATABASE_URL : "");
  if (url && !env.DB_HOST) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  return {
    host: env.DB_HOST || env.MYSQLHOST || "127.0.0.1",
    port: Number(env.DB_PORT || env.MYSQLPORT || 3306),
    user: env.DB_USER || env.MYSQLUSER,
    password: env.DB_PASSWORD ?? env.MYSQLPASSWORD,
    database: env.DB_NAME || env.MYSQLDATABASE || "era_db",
  };
}

const COLUMNS = [
  "userID",
  "fullName",
  "passwordHash",
  "activityID",
  "providerID",
  "activityName",
  "availableCapacity",
  "imageAlt",
  "isDeleted",
  "stampShape",
  "stampColor",
  "stampIcon",
  "bookingID",
  "customerID",
  "bookingDate",
  "ticketID",
  "ticketCode",
  "issuedAt",
  "passportID",
  "createdAt",
  "stampID",
  "awardedAt",
  "uploadID",
];
const CAMEL = new Map(COLUMNS.map((c) => [c.toLowerCase(), c]));
const camel = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [CAMEL.get(k) ?? k, v]));

export async function connect() {
  const url = pgUrl();
  if (!url) {
    const conn = await mysql.createConnection(mysqlConfig());
    conn.isPg = false;
    return conn;
  }
  pg.types.setTypeParser(1082, (v) => v);
  pg.types.setTypeParser(1114, (v) => v.slice(0, 19));
  pg.types.setTypeParser(20, (v) => Number(v));
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const run = async (sqlText, params = []) => {
    let n = 0;
    let text = sqlText.replace(/`/g, '"').replace(/\?/g, () => `$${++n}`);
    if (/^\s*INSERT\b/i.test(text) && !/\bRETURNING\b/i.test(text)) text += " RETURNING *";
    const r = await client.query(text, params);
    if (r.command === "SELECT") return [r.rows.map(camel), r.fields];
    const first = r.rows?.[0] ? Object.values(r.rows[0])[0] : 0;
    return [{ affectedRows: r.rowCount ?? 0, insertId: Number(first ?? 0) }, r.fields];
  };
  return {
    isPg: true,
    execute: run,
    query: run,
    /** Run a whole SQL file as-is (PostgreSQL accepts many statements in one call). */
    raw: (text) => client.query(text),
    end: () => client.end(),
  };
}
