/**
 * ERA database engine (server only).
 *  - MySQL / MariaDB (local, Railway): DB_* in .env, or MYSQL_URL.
 *  - PostgreSQL (Neon on Vercel): DATABASE_URL / POSTGRES_URL starting with postgres://
 * Both are exposed through the same small mysql2-style API (execute / query / getConnection),
 * so the rest of the server keeps one set of queries. For PostgreSQL the queries are adapted on
 * the fly: `?` → $1…, `backticks` → "quotes", INSERT … RETURNING for insertId, and column names
 * are returned in their original camelCase.
 */
import mysql from "mysql2/promise";
import pg from "pg";

export type Header = { affectedRows: number; insertId: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export interface DbConn {
  execute<T = Row[] & Header>(sql: string, params?: unknown[]): Promise<[T, unknown]>;
  query<T = Row[] & Header>(sql: string, params?: unknown[]): Promise<[T, unknown]>;
}
export interface DbPool extends DbConn {
  getConnection(): Promise<DbConn & { release(): void }>;
}

const pgUrl = () => {
  const u = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  return /^postgres(ql)?:\/\//i.test(u) ? u : "";
};
export const isPostgres = () => Boolean(pgUrl());

/* ---------------- MySQL ---------------- */
function mysqlConfig() {
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
    database: env.DB_NAME || env.MYSQLDATABASE,
  };
}

/* ---------------- PostgreSQL adapter ---------------- */
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
const camel = (row: Row) => {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[CAMEL.get(k) ?? k] = v;
  return out;
};
let typesReady = false;
function pgTypes() {
  if (typesReady) return;
  typesReady = true;
  pg.types.setTypeParser(1082, (v) => v); // DATE → 'YYYY-MM-DD'
  pg.types.setTypeParser(1114, (v) => v.slice(0, 19)); // TIMESTAMP → 'YYYY-MM-DD HH:MM:SS'
  pg.types.setTypeParser(1184, (v) => v.slice(0, 19));
  pg.types.setTypeParser(20, (v) => Number(v)); // COUNT(*) etc.
}
function toPg(sqlText: string) {
  let n = 0;
  let s = sqlText.replace(/`/g, '"').replace(/\?/g, () => `$${++n}`);
  if (/^\s*INSERT\b/i.test(s) && !/\bRETURNING\b/i.test(s)) s += " RETURNING *";
  return s;
}
type PgRunner = { query: (text: string, values?: unknown[]) => Promise<pg.QueryResult> };
function pgConn(runner: PgRunner): DbConn {
  const run = async (sqlText: string, params: unknown[] = []) => {
    const r = await runner.query(toPg(sqlText), params);
    if (r.command === "SELECT") {
      return [r.rows.map(camel), r.fields] as [never, unknown];
    }
    const first = r.rows?.[0] ? Object.values(r.rows[0])[0] : undefined;
    const header: Header = { affectedRows: r.rowCount ?? 0, insertId: Number(first ?? 0) };
    return [header, r.fields] as [never, unknown];
  };
  return { execute: run, query: run };
}

/* ---------------- shared pool ---------------- */
let pool: DbPool | undefined;
export function db(): DbPool {
  if (pool) return pool;
  const url = pgUrl();
  if (url) {
    pgTypes();
    const p = new pg.Pool({
      connectionString: url,
      max: Number(process.env.ERA_PG_POOL_MAX || 5),
      idleTimeoutMillis: 10_000,
    });
    const base = pgConn(p);
    pool = {
      ...base,
      async getConnection() {
        const client = await p.connect();
        return { ...pgConn(client), release: () => client.release() };
      },
    };
  } else {
    const cfg = mysqlConfig();
    if (!cfg.database || !cfg.user)
      throw new Error("Missing database settings (DB_* in .env, MYSQL_URL or DATABASE_URL)");
    pool = mysql.createPool({
      ...cfg,
      dateStrings: true,
      waitForConnections: true,
      connectionLimit: 10,
    }) as unknown as DbPool;
  }
  return pool;
}
