/** Database settings for scripts: DB_* from .env locally, or Railway's MYSQL_URL / MYSQL* variables. */
export function dbConfig() {
  const env = process.env;
  const url = env.DATABASE_URL || env.MYSQL_URL;
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
