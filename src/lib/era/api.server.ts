/** ERA MySQL API. Server-only. Do not import into client components. */
import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isStampColor, isStampIcon, isStampShape } from "./stamps";

let pool: Pool | undefined;
/** Database settings: DB_* from .env locally, or Railway's MYSQL_URL / MYSQL* variables. */
function dbConfig() {
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
    database: env.DB_NAME || env.MYSQLDATABASE,
  };
}
function db() {
  if (!pool) {
    const cfg = dbConfig();
    if (!cfg.database || !cfg.user)
      throw new Error("Missing database settings (DB_* in .env or MYSQL_URL)");
    pool = mysql.createPool({
      ...cfg,
      dateStrings: true,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}
const COOKIE = "era_session";
const ERR_LOGIN = "We couldn't match those details. Please check and try again.";
const TTL = 15 * 60 * 1000; // 15 minutes of inactivity
const sql = async (statement: string, params: unknown[] = []) => {
  const [rows] = await db().execute(statement, params);
  return rows as RowDataPacket[];
};
type Identity = { id: number; role: "customer" | "provider" };

/**
 * Stamp identity columns (stampShape / stampColor / stampIcon) are added to Activity
 * automatically the first time the server runs against an older era_db.
 */
let stampColumns: Promise<boolean> | undefined;
function ensureStampColumns() {
  if (!stampColumns)
    stampColumns = (async () => {
      const rows = await sql(
        "SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'activity'",
      );
      const have = new Set(rows.map((r) => String(r.c).toLowerCase()));
      const wanted: [string, string][] = [
        ["stampShape", "VARCHAR(20)"],
        ["stampColor", "VARCHAR(20)"],
        ["stampIcon", "VARCHAR(30)"],
      ];
      const missing = wanted.filter(([c]) => !have.has(c.toLowerCase()));
      if (missing.length) {
        await db().query(
          `ALTER TABLE Activity ${missing.map(([c, t]) => `ADD COLUMN ${c} ${t} NULL`).join(", ")}`,
        );
        console.log(
          `ERA: added stamp identity columns to Activity (${missing.map((m) => m[0]).join(", ")}).`,
        );
      }
      return true;
    })().catch((e) => {
      console.error(
        "ERA: could not add stamp identity columns. Run ERA_stamp_identity.sql manually.",
        e,
      );
      stampColumns = undefined;
      return false;
    });
  return stampColumns;
}
/** Cover images uploaded by providers are saved to public/uploads and served as /uploads/<file>. */
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
function imageKind(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf.length > 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "png";
  if (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}
let uploadTable: Promise<void> | undefined;
function ensureUploadTable() {
  if (!uploadTable)
    uploadTable = db()
      .query(
        "CREATE TABLE IF NOT EXISTS Upload (uploadID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mime VARCHAR(30) NOT NULL, data MEDIUMBLOB NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB",
      )
      .then(() => undefined)
      .catch((e) => {
        uploadTable = undefined;
        throw e;
      });
  return uploadTable;
}
/** Serves an uploaded cover image stored in the database. */
export async function handleImageGet(id: string) {
  const n = numberId(id);
  if (!n) return new Response("Not found", { status: 404 });
  try {
    await ensureUploadTable();
    const [row] = await sql("SELECT mime, data FROM Upload WHERE uploadID=?", [n]);
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(row.data as Buffer), {
      headers: {
        "Content-Type": String(row.mime),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("ERA image error", e);
    return new Response("Unavailable", { status: 503 });
  }
}
const strongPassword = (p: string) =>
  p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);
const PASSWORD_RULE =
  "Use at least 8 characters, an uppercase letter, a lowercase letter, and a number.";
const tableFor = (r: Identity["role"]) => (r === "customer" ? "Customer" : "ServiceProvider");
const idString = (i: Identity) => `${i.role}:${i.id}`;
function sessionSecret() {
  const secret = process.env.ERA_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("ERA_SESSION_SECRET must be at least 32 characters long in .env");
  return secret;
}
function sign(s: string) {
  return createHmac("sha256", sessionSecret()).update(s).digest("hex");
}
function parseSession(request: Request): Identity | null {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || parts[1].length !== 64) return null;
  const expected = Buffer.from(sign(parts[0]), "hex");
  const actual = Buffer.from(parts[1], "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const obj = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (
      !["customer", "provider"].includes(obj.role) ||
      !Number.isSafeInteger(obj.id) ||
      obj.id < 1 ||
      Date.now() > obj.exp
    )
      return null;
    return { role: obj.role, id: obj.id };
  } catch {
    return null;
  }
}
function sessionCookie(who: Identity, request: Request) {
  const payload = Buffer.from(JSON.stringify({ ...who, exp: Date.now() + TTL })).toString(
    "base64url",
  );
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");
  const secure = proto === "https" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=900${secure}`;
}
function removeCookie() {
  return `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
function json(data: unknown, status = 200, cookie?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(JSON.stringify(data), { status, headers });
}
function invalid(err: string, status = 400) {
  return json({ ok: false, error: err }, status);
}
function ownInput(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function str(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}
function numberId(value: unknown) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function dataUser(row: RowDataPacket, role: Identity["role"]) {
  return {
    userId: idString({ id: Number(row.userID), role }),
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    role,
  };
}
function activityOf(a: RowDataPacket) {
  return {
    activityId: String(a.activityID),
    providerId: `provider:${a.providerID}`,
    name: a.activityName,
    type: a.type,
    description: a.description,
    destination: a.destination,
    location: a.location,
    date: String(a.date).slice(0, 10),
    time: String(a.time).slice(0, 5),
    availableCapacity: Number(a.availableCapacity),
    image: a.image || null,
    imageAlt: a.imageAlt || undefined,
    isDeleted: !!a.isDeleted,
    stampShape: a.stampShape || null,
    stampColor: a.stampColor || null,
    stampIcon: a.stampIcon || null,
  };
}
function bookingOf(b: RowDataPacket) {
  return {
    bookingId: String(b.bookingID),
    customerId: `customer:${b.customerID}`,
    activityId: String(b.activityID),
    status: b.status,
    numberOfParticipants: 1,
  };
}
function ticketOf(t: RowDataPacket) {
  return { ticketId: String(t.ticketID), bookingId: String(t.bookingID), ticketCode: t.ticketCode };
}
function stampOf(s: RowDataPacket) {
  return {
    stampId: String(s.stampID),
    passportId: String(s.passportID),
    bookingId: String(s.bookingID),
    activityId: String(s.activityID),
    awardedAt: String(s.awardedAt ?? "").slice(0, 19),
  };
}
function validProfile(data: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const fullName = str(data.fullName),
    username = str(data.username),
    email = str(data.email).toLowerCase();
  if (!fullName || fullName.length > 100)
    errors.fullName = "Please enter a full name (up to 100 characters).";
  if (!username || username.length > 50)
    errors.username = "Please enter a username (up to 50 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
    errors.email = "Please enter a valid email address.";
  return { fullName, username, email, errors };
}
function validActivity(data: Record<string, unknown>, creating: boolean) {
  const errors: Record<string, string> = {};
  const fields = ["name", "description", "destination", "location"] as const;
  for (const field of fields) if (!str(data[field])) errors[field] = `${field} is required.`;
  if (str(data.name).length > 150) errors.name = "Activity name is too long.";
  if (str(data.destination).length > 100) errors.destination = "Destination is too long.";
  if (str(data.location).length > 255) errors.location = "Location is too long.";
  if (!["Sport", "Wellness", "Entertainment"].includes(str(data.type)))
    errors.type = "Choose an activity type.";
  const date = str(data.date),
    time = str(data.time);
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || Number.isNaN(Date.parse(date)))
    errors.date = "Enter a valid date.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = "Enter a valid time.";
  const cap = Number(data.availableCapacity);
  if (
    data.availableCapacity === "" ||
    data.availableCapacity == null ||
    !Number.isSafeInteger(cap) ||
    cap < (creating ? 1 : 0)
  )
    errors.availableCapacity = creating
      ? "Capacity must be a positive whole number."
      : "Remaining capacity must be zero or a positive whole number.";
  else if (cap > 100000) errors.availableCapacity = "Capacity is too large.";
  const image = str(data.image);
  if (image && (image.length > 500 || !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(image)))
    errors.image = "Use a site path starting with / or an https:// image link.";
  const shape = str(data.stampShape),
    color = str(data.stampColor),
    icon = str(data.stampIcon);
  if (shape && !isStampShape(shape)) errors.stampShape = "Choose a stamp shape.";
  if (color && !isStampColor(color)) errors.stampColor = "Choose a stamp colour.";
  if (icon && !isStampIcon(icon)) errors.stampIcon = "Choose a stamp emblem.";
  return {
    errors,
    values: [
      str(data.name),
      str(data.type),
      str(data.description),
      str(data.destination),
      str(data.location),
      date,
      time,
      cap,
    ],
    image: image || null,
    stamp: [shape || null, color || null, icon || null],
  };
}
async function uniqueIdentity(
  conn: PoolConnection,
  username: string,
  email: string,
  except?: Identity,
) {
  for (const role of ["customer", "provider"] as const) {
    const table = tableFor(role);
    const params: unknown[] = [username, email];
    let clause = "";
    if (except?.role === role) {
      clause = " AND userID <> ?";
      params.push(except.id);
    }
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT username,email FROM ${table} WHERE (LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?))${clause} LIMIT 1`,
      params,
    );
    if (rows.length)
      return {
        field: rows[0].username.toLowerCase() === username.toLowerCase() ? "username" : "email",
      };
  }
  return null;
}
async function withIdentityLock<T>(fn: (conn: PoolConnection) => Promise<T>) {
  const conn = await db().getConnection();
  let locked = false;
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT GET_LOCK('era_identity_changes', 10) AS acquired",
    );
    if (rows[0]?.acquired !== 1) throw new Error("Identity registration is busy; try again.");
    locked = true;
    return await fn(conn);
  } finally {
    if (locked) await conn.query("SELECT RELEASE_LOCK('era_identity_changes')").catch(() => {});
    conn.release();
  }
}
async function snapshot(who: Identity | null) {
  if (!who) {
    // Guests can browse public experiences (no personal data is returned).
    const acts = await sql("SELECT * FROM Activity WHERE isDeleted=FALSE ORDER BY `date`, `time`");
    return {
      user: null,
      users: [],
      activities: acts.map(activityOf),
      bookings: [],
      tickets: [],
      passports: [],
      stamps: [],
    };
  }
  const rows = await sql(
    `SELECT userID,fullName,username,email FROM ${tableFor(who.role)} WHERE userID=?`,
    [who.id],
  );
  if (!rows.length)
    return {
      user: null,
      users: [],
      activities: [],
      bookings: [],
      tickets: [],
      passports: [],
      stamps: [],
    };
  const user = dataUser(rows[0], who.role);
  const bookings = await sql(
    who.role === "provider"
      ? "SELECT b.* FROM Booking b JOIN Activity a ON a.activityID=b.activityID WHERE a.providerID=? ORDER BY b.bookingID DESC"
      : "SELECT * FROM Booking WHERE customerID=? ORDER BY bookingID DESC",
    [who.id],
  );
  const acts = await sql(
    who.role === "provider"
      ? "SELECT * FROM Activity WHERE isDeleted=FALSE OR providerID=? ORDER BY `date`, `time`"
      : "SELECT * FROM Activity WHERE isDeleted=FALSE OR activityID IN (SELECT activityID FROM Booking WHERE customerID=?) ORDER BY `date`, `time`",
    [who.id],
  );
  const tickets = bookings.length
    ? await sql(
        `SELECT * FROM DigitalTicket WHERE bookingID IN (${bookings.map(() => "?").join(",")})`,
        bookings.map((b) => b.bookingID),
      )
    : [];
  const passport =
    who.role === "customer"
      ? await sql("SELECT * FROM DigitalActivityPassport WHERE customerID=?", [who.id])
      : [];
  const stamps =
    who.role === "customer"
      ? await sql(
          "SELECT s.*, b.activityID FROM DigitalStamp s JOIN Booking b ON s.bookingID=b.bookingID JOIN DigitalActivityPassport p ON s.passportID=p.passportID WHERE p.customerID=?",
          [who.id],
        )
      : [];
  const users =
    who.role === "provider" && bookings.length
      ? await sql(
          `SELECT userID,fullName FROM Customer WHERE userID IN (${[...new Set(bookings.map((b) => b.customerID))].map(() => "?").join(",")})`,
          [...new Set(bookings.map((b) => b.customerID))],
        )
      : [];
  return {
    user,
    users: [
      user,
      ...users.map((u) => ({
        userId: `customer:${u.userID}`,
        fullName: u.fullName,
        username: "",
        email: "",
        role: "customer",
      })),
    ],
    activities: acts.map(activityOf),
    bookings: bookings.map(bookingOf),
    tickets: tickets.map(ticketOf),
    passports: passport.map((p) => ({
      passportId: String(p.passportID),
      customerId: `customer:${p.customerID}`,
    })),
    stamps: stamps.map(stampOf),
  };
}
export async function handleEraGet(request: Request) {
  try {
    const who = parseSession(request);
    await ensureStampColumns();
    return json(
      { ok: true, snapshot: await snapshot(who) },
      200,
      who ? sessionCookie(who, request) : undefined,
    );
  } catch (e) {
    console.error("ERA snapshot error", e);
    return invalid("Database unavailable. Check MySQL and .env configuration.", 503);
  }
}
export async function handleEraPost(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const fwdHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const fwdProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");
  const publicOrigin = fwdHost ? `${fwdProto}://${fwdHost}` : new URL(request.url).origin;
  if (origin !== new URL(request.url).origin && origin !== publicOrigin && site !== "same-origin")
    return invalid("Cross-origin request blocked.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return invalid("Expected JSON body.", 415);
  try {
    const body = ownInput(await request.json());
    const action = str(body.action),
      input = ownInput(body.payload);
    const hasStampColumns = await ensureStampColumns();
    const who = parseSession(request);
    if (action === "logout")
      return json({ ok: true, snapshot: await snapshot(null) }, 200, removeCookie());
    if (action === "uploadImage") {
      if (!who || who.role !== "provider") return invalid("Service Provider access required.", 403);
      const data = typeof input.data === "string" ? input.data : "";
      if (!data || data.length > MAX_UPLOAD_BYTES * 1.4)
        return invalid("Image is too large. Please use a photo under 6 MB.", 413);
      const buf = Buffer.from(data, "base64");
      const kind = imageKind(buf);
      if (!kind) return invalid("Please upload a JPG, PNG or WebP image.", 415);
      if (buf.length > MAX_UPLOAD_BYTES)
        return invalid("Image is too large. Please use a photo under 6 MB.", 413);
      await ensureUploadTable();
      const mime = kind === "jpg" ? "image/jpeg" : `image/${kind}`;
      const [r] = await db().execute<ResultSetHeader>(
        "INSERT INTO Upload (mime, data) VALUES (?, ?)",
        [mime, buf],
      );
      return json({ ok: true, path: `/api/img/${r.insertId}` }, 200, sessionCookie(who, request));
    }
    if (action === "login") {
      const identifier = str(input.identifier).toLowerCase(),
        password = String(input.password || "");
      let account: { role: Identity["role"]; id: number } | null = null;
      for (const role of ["customer", "provider"] as const) {
        const rs = await sql(
          `SELECT userID,passwordHash FROM ${tableFor(role)} WHERE LOWER(username)=? OR LOWER(email)=? LIMIT 1`,
          [identifier, identifier],
        );
        if (rs.length && (await bcrypt.compare(password, rs[0].passwordHash))) {
          account = { role, id: Number(rs[0].userID) };
          break;
        }
      }
      if (!account) return invalid(ERR_LOGIN, 401);
      return json(
        { ok: true, snapshot: await snapshot(account) },
        200,
        sessionCookie(account, request),
      );
    }
    if (action === "signup") {
      const { fullName, username, email, errors } = validProfile(input);
      const password = String(input.password || "");
      if (!strongPassword(password)) errors.password = PASSWORD_RULE;
      if (password !== input.confirm) errors.confirm = "Passwords do not match.";
      if (!["customer", "provider"].includes(str(input.role)))
        errors.role = "Please choose an account type.";
      if (Object.keys(errors).length) return json({ ok: false, errors }, 400);
      const role = str(input.role) as Identity["role"];
      const result = await withIdentityLock(async (conn) => {
        const duplicate = await uniqueIdentity(conn, username, email);
        if (duplicate)
          return {
            ok: false as const,
            errors: { [duplicate.field]: `This ${duplicate.field} is already taken.` },
          };
        const hash = await bcrypt.hash(password, 12);
        const [r] = await conn.execute<ResultSetHeader>(
          `INSERT INTO ${tableFor(role)} (fullName,username,email,passwordHash) VALUES (?,?,?,?)`,
          [fullName, username, email, hash],
        );
        return { ok: true as const, account: { id: r.insertId, role } };
      });
      if (!result.ok) return json(result, 409);
      return json(
        { ok: true, snapshot: await snapshot(result.account) },
        200,
        sessionCookie(result.account, request),
      );
    }
    if (!who) return invalid("Please log in again.", 401);
    const self = await sql(`SELECT userID FROM ${tableFor(who.role)} WHERE userID=?`, [who.id]);
    if (!self.length) return invalid("Please log in again.", 401);
    if (action === "updateProfile") {
      const { fullName, username, email, errors } = validProfile(input);
      if (Object.keys(errors).length) return json({ ok: false, errors }, 400);
      const result = await withIdentityLock(async (conn) => {
        const duplicate = await uniqueIdentity(conn, username, email, who!);
        if (duplicate)
          return {
            ok: false as const,
            errors: { [duplicate.field]: `This ${duplicate.field} is already taken.` },
          };
        await conn.execute(
          `UPDATE ${tableFor(who!.role)} SET fullName=?,username=?,email=? WHERE userID=?`,
          [fullName, username, email, who!.id],
        );
        return { ok: true as const };
      });
      if (!result.ok) return json(result, 409);
    } else if (action === "createActivity" || action === "updateActivity") {
      if (who.role !== "provider") return invalid("Service Provider access required.", 403);
      const isNew = action === "createActivity";
      const { values, errors, image, stamp } = validActivity(input, isNew);
      if (Object.keys(errors).length) return json({ ok: false, errors }, 400);
      const extraCols = hasStampColumns
        ? ["image", "stampShape", "stampColor", "stampIcon"]
        : ["image"];
      const extraVals = hasStampColumns ? [image, ...stamp] : [image];
      if (isNew) {
        const cols = [
          "providerID",
          "activityName",
          "type",
          "description",
          "destination",
          "location",
          "`date`",
          "`time`",
          "availableCapacity",
          ...extraCols,
        ];
        await db().execute(
          `INSERT INTO Activity (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
          [who.id, ...values, ...extraVals],
        );
      } else {
        const id = numberId(input.activityId);
        if (!id) return invalid("Invalid activity.", 400);
        const sets = [
          "activityName",
          "type",
          "description",
          "destination",
          "location",
          "`date`",
          "`time`",
          "availableCapacity",
          ...extraCols,
        ]
          .map((c) => `${c}=?`)
          .join(",");
        const [res] = await db().execute<ResultSetHeader>(
          `UPDATE Activity SET ${sets} WHERE activityID=? AND providerID=? AND isDeleted=FALSE`,
          [...values, ...extraVals, id, who.id],
        );
        if (res.affectedRows === 0)
          return invalid("You can only edit your own active activities.", 403);
      }
    } else if (action === "deleteActivity") {
      if (who.role !== "provider") return invalid("Service Provider access required.", 403);
      const id = numberId(input.activityId);
      if (!id) return invalid("Invalid activity.", 400);
      const [res] = await db().execute<ResultSetHeader>(
        "UPDATE Activity SET isDeleted=TRUE WHERE activityID=? AND providerID=? AND isDeleted=FALSE",
        [id, who.id],
      );
      if (res.affectedRows === 0) return invalid("Activity not found or not yours.", 404);
    } else if (action === "createBooking") {
      if (who.role !== "customer") return invalid("Customer access required.", 403);
      const id = numberId(input.activityId);
      if (!id) return invalid("Invalid activity.", 400);
      const [act] = await sql(
        "SELECT (`date` < CURRENT_DATE()) AS past FROM Activity WHERE activityID=? AND isDeleted=FALSE",
        [id],
      );
      if (!act) return invalid("This activity is no longer available.", 404);
      if (Number(act.past) === 1)
        return invalid("This experience has already taken place and can no longer be booked.", 409);
      // Triggers atomically reserve ONE seat and create ONE ticket.
      await db().execute("INSERT INTO Booking (customerID,activityID) VALUES (?,?)", [who.id, id]);
    } else if (action === "confirmCompletion") {
      if (who.role !== "provider") return invalid("Service Provider access required.", 403);
      const id = numberId(input.bookingId);
      if (!id) return invalid("Invalid booking.", 400);
      const [when] = await sql(
        "SELECT (a.`date` > CURRENT_DATE()) AS future FROM Booking b JOIN Activity a ON a.activityID=b.activityID WHERE b.bookingID=? AND a.providerID=?",
        [id, who.id],
      );
      if (when && Number(when.future) === 1)
        return invalid(
          "This experience has not taken place yet. You can confirm completion on or after its date.",
          409,
        );
      const [res] = await db().execute<ResultSetHeader>(
        `UPDATE Booking b JOIN Activity a ON a.activityID=b.activityID SET b.status='Completed' WHERE b.bookingID=? AND a.providerID=? AND b.status='Confirmed' AND a.\`date\` <= CURRENT_DATE()`,
        [id, who.id],
      );
      if (!res.affectedRows)
        return invalid("Booking not found, not yours, or already completed.", 400);
    } else if (action === "changePassword") {
      const current = String(input.current || ""),
        next = String(input.password || "");
      const errors: Record<string, string> = {};
      if (!current) errors.current = "Please enter your current password.";
      if (!strongPassword(next)) errors.password = PASSWORD_RULE;
      if (next !== input.confirm) errors.confirm = "Passwords do not match.";
      if (!errors.current) {
        const [row] = await sql(`SELECT passwordHash FROM ${tableFor(who.role)} WHERE userID=?`, [
          who.id,
        ]);
        if (!row || !(await bcrypt.compare(current, row.passwordHash)))
          errors.current = "Your current password is incorrect.";
      }
      if (Object.keys(errors).length) return json({ ok: false, errors }, 400);
      await sql(`UPDATE ${tableFor(who.role)} SET passwordHash=? WHERE userID=?`, [
        await bcrypt.hash(next, 12),
        who.id,
      ]);
    } else return invalid("Unknown action.", 404);
    return json({ ok: true, snapshot: await snapshot(who) }, 200, sessionCookie(who, request));
  } catch (e) {
    console.error("ERA operation error", e);
    const err = e as { errno?: number; code?: string; message?: string };
    if (err.errno === 1644)
      return invalid(err.message || "Operation rejected by database rules.", 409);
    if (err.code === "ER_DUP_ENTRY")
      return invalid("That username or email is already registered.", 409);
    return invalid(
      "Database operation failed. Please check MySQL connection and server logs.",
      503,
    );
  }
}
