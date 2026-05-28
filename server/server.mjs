import { createServer } from "node:http";
import dns from "node:dns";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Expo } from "expo-server-sdk";
import pg from "pg";
import eventReminderJob from "./jobs/eventReminder.js";
import noticesRoutes from "./routes/notices.js";

const { startEventReminderJob } = eventReminderJob;
const { handleNoticeRoute } = noticesRoutes;
const { Pool } = pg;
const expo = new Expo();
dns.setDefaultResultOrder("ipv4first");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const storePath = process.env.STORE_PATH ? resolve(process.env.STORE_PATH) : join(root, "server", "data", "store.json");
const publicDir = join(root, "server", "public");
const webDir = join(root, "dist-web");
const port = Number(process.env.PORT ?? 3001);

async function loadEnvFileIfPresent() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  const lines = (await readFile(envPath, "utf8")).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

await loadEnvFileIfPresent();

const adminToken = process.env.ADMIN_TOKEN ?? "jim-admin-dev";
const databaseUrl = process.env.DATABASE_URL;
const useDatabase = Boolean(databaseUrl && !process.env.STORE_PATH);
const pool = useDatabase
  ? new Pool({
      connectionTimeoutMillis: 10000,
      connectionString: databaseUrl,
      idleTimeoutMillis: 30000,
      max: 10,
      ssl: { rejectUnauthorized: false }
    })
  : null;
let databaseOffline = false;
const defaultAdmin = {
  active: true,
  email: "rekha.attri@jaipuria.ac.in",
  id: "admin-1",
  name: "Dr. Rekha Attri",
  role: "Super Admin",
  token: adminToken
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Content-Type": type,
    "Expires": "0",
    "Pragma": "no-cache"
  });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readStore() {
  return JSON.parse(await readFile(storePath, "utf8"));
}

async function writeStore(store) {
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function rowToEvent(row) {
  return {
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    club: row.club,
    description: row.description,
    endsAt: toIso(row.ends_at),
    id: row.id,
    image: row.image ?? "",
    image_data: row.image_data ?? "",
    name: row.name,
    published: Boolean(row.published),
    registration_link: row.registration_link ?? "",
    reminder_sent: Boolean(row.reminder_sent),
    reminderSent: Boolean(row.reminder_sent),
    speakers: Array.isArray(row.speakers) ? row.speakers : [],
    startsAt: toIso(row.starts_at),
    venue: row.venue
  };
}

function rowToArchive(row) {
  return {
    club: row.club,
    date: toIso(row.date),
    driveUrl: row.drive_url,
    eventId: row.event_id,
    id: row.id,
    image: row.image ?? "",
    image_data: row.image_data ?? "",
    name: row.name,
    summary: row.summary,
    year: row.year
  };
}

function rowToWinner(row) {
  return {
    archiveId: row.archive_id,
    award: row.award,
    batch: row.batch,
    category: row.category,
    champion: Boolean(row.champion),
    club: row.club,
    eventName: row.event_name,
    id: row.id,
    image_data: row.image_data ?? "",
    name: row.name,
    portrait: row.portrait ?? ""
  };
}

function rowToNotice(row) {
  return {
    created_at: toIso(row.created_at),
    from_office: row.from_office,
    id: String(row.id),
    is_active: row.is_active !== false,
    message: row.message,
    priority: row.priority,
    title: row.title
  };
}

async function queryDatabase(sql, params = []) {
  if (!pool || databaseOffline) throw new Error("DATABASE_URL is not available");
  try {
    return await pool.query(sql, params);
  } catch (error) {
    databaseOffline = true;
    console.error("PostgreSQL connection unavailable, falling back to Railway store", error);
    throw error;
  }
}

function hasDatabase() {
  return useDatabase && !databaseOffline;
}

async function getDatabaseContent() {
  const [events, archive, winners, notices] = await Promise.all([
    queryDatabase("select * from events order by starts_at asc"),
    queryDatabase("select * from archive order by date desc, created_at desc"),
    queryDatabase("select * from hall_of_fame order by created_at desc"),
    queryDatabase("select id, title, message, from_office, priority, created_at, is_active from notices order by created_at desc")
  ]);

  return {
    archive: archive.rows.map(rowToArchive),
    events: events.rows.map(rowToEvent),
    notices: notices.rows.map(rowToNotice),
    winners: winners.rows.map(rowToWinner)
  };
}

async function hydrateStoreFromDatabase(store) {
  if (!hasDatabase()) return store;
  try {
    const content = await getDatabaseContent();
    store.archive = content.archive;
    store.events = content.events;
    store.notices = content.notices;
    store.winners = content.winners;
  } catch {
    return store;
  }
  return store;
}

async function upsertDatabaseEvent(item) {
  const result = await queryDatabase(
    `insert into events (
      id, name, starts_at, ends_at, venue, club, image, image_data, registration_link,
      description, speakers, attachments, published, reminder_sent, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, now())
    on conflict (id) do update set
      name = excluded.name,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      venue = excluded.venue,
      club = excluded.club,
      image = excluded.image,
      image_data = excluded.image_data,
      registration_link = excluded.registration_link,
      description = excluded.description,
      speakers = excluded.speakers,
      attachments = excluded.attachments,
      published = excluded.published,
      reminder_sent = excluded.reminder_sent,
      updated_at = now()
    returning *`,
    [
      item.id,
      item.name,
      item.startsAt,
      item.endsAt,
      item.venue,
      item.club,
      item.image ?? "",
      item.image_data ?? "",
      item.registration_link ?? "",
      item.description,
      JSON.stringify(item.speakers ?? []),
      JSON.stringify(item.attachments ?? []),
      Boolean(item.published),
      Boolean(item.reminder_sent ?? item.reminderSent)
    ]
  );
  return rowToEvent(result.rows[0]);
}

async function upsertDatabaseArchive(item) {
  const result = await queryDatabase(
    `insert into archive (
      id, event_id, name, date, club, year, image, image_data, summary, drive_url, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    on conflict (id) do update set
      event_id = excluded.event_id,
      name = excluded.name,
      date = excluded.date,
      club = excluded.club,
      year = excluded.year,
      image = excluded.image,
      image_data = excluded.image_data,
      summary = excluded.summary,
      drive_url = excluded.drive_url,
      updated_at = now()
    returning *`,
    [
      item.id,
      item.eventId,
      item.name,
      item.date,
      item.club,
      item.year,
      item.image ?? "",
      item.image_data ?? "",
      item.summary,
      item.driveUrl
    ]
  );
  return rowToArchive(result.rows[0]);
}

async function upsertDatabaseWinner(item) {
  const result = await queryDatabase(
    `insert into hall_of_fame (
      id, name, batch, award, category, club, event_name, archive_id, portrait, image_data, champion, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
    on conflict (id) do update set
      name = excluded.name,
      batch = excluded.batch,
      award = excluded.award,
      category = excluded.category,
      club = excluded.club,
      event_name = excluded.event_name,
      archive_id = excluded.archive_id,
      portrait = excluded.portrait,
      image_data = excluded.image_data,
      champion = excluded.champion,
      updated_at = now()
    returning *`,
    [
      item.id,
      item.name,
      item.batch,
      item.award,
      item.category,
      item.club,
      item.eventName,
      item.archiveId,
      item.portrait ?? "",
      item.image_data ?? "",
      Boolean(item.champion)
    ]
  );
  return rowToWinner(result.rows[0]);
}

async function getDatabasePushTokens() {
  if (!hasDatabase()) return [];
  const result = await queryDatabase("select platform, token, updated_at from push_tokens where token is not null order by updated_at desc");
  return result.rows.map((row) => ({ platform: row.platform, token: row.token, updatedAt: toIso(row.updated_at) }));
}

async function auditDatabase(action, module, id, user = "admin") {
  if (!hasDatabase()) return;
  await queryDatabase(
    `insert into audit_log (id, action, id_ref, module, "user")
     values ($1, $2, $3, $4, $5)`,
    [`audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, action, id, module, user]
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function publicEvent(event) {
  const { published, reminderSent, ...rest } = event;
  return {
    ...rest,
    image_data: rest.image_data ?? "",
    registration_link: rest.registration_link ?? ""
  };
}

function normalizeEventForStore(item, existing = {}) {
  const reminderValue = item.reminder_sent ?? item.reminderSent ?? existing.reminderSent ?? existing.reminder_sent ?? false;
  return {
    ...existing,
    ...item,
    image: item.image ?? existing.image ?? "",
    image_data: item.image_data ?? existing.image_data ?? "",
    registration_link: item.registration_link ?? existing.registration_link ?? "",
    reminder_sent: Boolean(reminderValue),
    reminderSent: Boolean(reminderValue)
  };
}

function normalizeArchiveForStore(item, existing = {}) {
  return {
    ...existing,
    ...item,
    image: item.image ?? existing.image ?? "",
    image_data: item.image_data ?? existing.image_data ?? ""
  };
}

function normalizeWinnerForStore(item, existing = {}, store = {}) {
  const eventName = String(item.eventName ?? existing.eventName ?? "").trim();
  const linkedArchive = eventName ? (store.archive ?? []).find((entry) => entry.name.toLowerCase() === eventName.toLowerCase()) : null;
  const category = String(item.category ?? "").trim() || existing.category || item.award || "";
  return {
    ...existing,
    ...item,
    archiveId: item.archiveId || existing.archiveId || linkedArchive?.id || "",
    category,
    eventName: eventName || linkedArchive?.name || existing.eventName || "",
    portrait: item.portrait ?? existing.portrait ?? "",
    image_data: item.image_data ?? existing.image_data ?? ""
  };
}

function requireAdmin(req, res) {
  const store = req.store;
  const token = req.headers["x-admin-token"];
  const admins = [...(store.admins ?? []), defaultAdmin];
  const admin = admins.find((entry) => entry.active !== false && entry.token === token);
  if (!admin) {
    send(res, 401, { error: "Unauthorized" });
    return null;
  }
  return admin;
}

function canWrite(admin, module) {
  if (admin.role === "Super Admin") return true;
  if (admin.role === "Content Manager") return ["events", "archive", "winners", "notices"].includes(module);
  return false;
}

function audit(store, action, module, id, user = "admin") {
  store.auditLog.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    idRef: id,
    module,
    timestamp: new Date().toISOString(),
    user
  });
  store.auditLog = store.auditLog.slice(0, 200);
}

function wordCount(value) {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isGoogleDriveUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("drive.google.com");
  } catch {
    return false;
  }
}

function requireString(item, field, errors) {
  if (typeof item[field] !== "string" || item[field].trim().length === 0) {
    errors.push(`${field} is required`);
  }
}

function validateAdminItem(module, item, store) {
  const errors = [];
  requireString(item, "id", errors);

  if (module === "events") {
    item = normalizeEventForStore(item, store.events?.find((event) => event.id === item.id));
    for (const field of ["name", "startsAt", "endsAt", "venue", "club", "description"]) {
      requireString(item, field, errors);
    }
    if (!item.image_data && !item.image) errors.push("image upload is required");
    if (Number.isNaN(Date.parse(item.startsAt)) || Number.isNaN(Date.parse(item.endsAt))) {
      errors.push("startsAt and endsAt must be valid date strings");
    } else if (new Date(item.endsAt) <= new Date(item.startsAt)) {
      errors.push("endsAt must be after startsAt");
    }
    if (item.image && !isHttpsUrl(item.image)) errors.push("image must be an HTTPS URL");
    if (item.registration_link && !isHttpsUrl(item.registration_link)) errors.push("registration_link must be an HTTPS URL");
    if (item.image_data && typeof item.image_data !== "string") errors.push("image_data must be a base64 string");
    if (!Array.isArray(item.speakers)) errors.push("speakers must be an array");
    if (!Array.isArray(item.attachments)) errors.push("attachments must be an array");
    if (typeof item.published !== "boolean") errors.push("published must be true or false");
  }

  if (module === "notices") {
    for (const field of ["title", "message", "from_office"]) requireString(item, field, errors);
    if (!["Normal", "Important", "Urgent"].includes(item.priority)) {
      errors.push("priority must be Normal, Important, or Urgent");
    }
  }

  if (module === "archive") {
    item = normalizeArchiveForStore(item, store.archive?.find((entry) => entry.id === item.id));
    for (const field of ["eventId", "name", "date", "club", "year", "summary", "driveUrl"]) {
      requireString(item, field, errors);
    }
    if (!item.image_data && !item.image) errors.push("image upload is required");
    if (item.date && Number.isNaN(Date.parse(item.date))) errors.push("date must be valid");
    if (item.image && !isHttpsUrl(item.image)) errors.push("image must be an HTTPS URL");
    if (item.driveUrl && !isGoogleDriveUrl(item.driveUrl)) errors.push("driveUrl must be an HTTPS Google Drive URL");
    if (wordCount(item.summary) < 100) errors.push("summary must contain at least 100 words");
  }

  if (module === "winners") {
    item = normalizeWinnerForStore(item, store.winners?.find((entry) => entry.id === item.id), store);
    for (const field of ["name", "batch", "award", "club", "eventName", "archiveId"]) {
      requireString(item, field, errors);
    }
    if (!item.image_data && !item.portrait) errors.push("portrait photo is required");
    if (item.portrait && !isHttpsUrl(item.portrait)) errors.push("portrait must be an HTTPS URL");
    if (typeof item.champion !== "boolean") errors.push("champion must be true or false");
    const archive = store.archive.find((entry) => entry.id === item.archiveId);
    if (!archive) {
      errors.push("archiveId must reference an existing archive entry");
    } else if (archive.name !== item.eventName) {
      errors.push("eventName must match the linked archive entry name");
    }
  }

  if (module === "admins") {
    for (const field of ["name", "email", "role", "token"]) requireString(item, field, errors);
    if (item.email && !String(item.email).includes("@")) errors.push("email must be valid");
    if (!["Super Admin", "Content Manager", "Read-Only Viewer"].includes(item.role)) {
      errors.push("role must be Super Admin, Content Manager, or Read-Only Viewer");
    }
    if (typeof item.active !== "boolean") errors.push("active must be true or false");
  }

  return errors;
}

function sanitizeStoreForAdmin(store, admin) {
  if (admin.role === "Super Admin") return store;
  return {
    ...store,
    admins: (store.admins ?? []).map(({ token, ...entry }) => entry)
  };
}

async function sendEventPushNotification(store, payload) {
  store.pushTokens ??= [];
  const tokenEntries = hasDatabase() ? await getDatabasePushTokens() : store.pushTokens;
  const tokens = tokenEntries
    .map((entry) => entry.token)
    .filter((token) => typeof token === "string" && token.trim().length > 0);
  const notificationRecord = {
    id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    payload,
    sentAt: new Date().toISOString(),
    status: "recorded",
    tokenCount: tokens.length
  };

  if (tokens.length === 0) {
    console.log("No push tokens registered");
  }

  const messages = [];
  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Invalid token: ${token}`);
      continue;
    }
    messages.push({
      body: payload.body,
      channelId: "default",
      data: payload.data ?? {},
      priority: "high",
      sound: "default",
      title: payload.title,
      to: token
    });
  }

  const receipts = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const chunkReceipts = await expo.sendPushNotificationsAsync(chunk);
      console.log("Push sent:", chunkReceipts);
      receipts.push(...chunkReceipts);
    } catch (error) {
      console.error("Push error:", error);
      notificationRecord.error = error instanceof Error ? error.message : "Expo push request failed";
      notificationRecord.status = "failed";
    }
  }

  if (messages.length > 0 && notificationRecord.status !== "failed") {
    notificationRecord.status = "sent";
    notificationRecord.receipts = receipts;
  }

  store.notifications ??= [];
  store.notifications.unshift(notificationRecord);
  store.notifications = store.notifications.slice(0, 100);
  store.lastNotification = notificationRecord;
  if (hasDatabase()) {
    await queryDatabase(
      `insert into notifications (id, payload, sent_at, status, token_count, error)
       values ($1, $2::jsonb, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [
        notificationRecord.id,
        JSON.stringify(payload),
        notificationRecord.sentAt,
        notificationRecord.status,
        notificationRecord.tokenCount,
        notificationRecord.error ?? null
      ]
    );
  }
}

async function sendPushNotifications(store, title, body, data = {}) {
  await sendEventPushNotification(store, {
    body,
    data,
    title
  });
}

function firstWords(value, length = 100) {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}

async function sendDatabaseBackedPushNotifications(title, body, data = {}) {
  const store = await readStore();
  await sendPushNotifications(store, title, body, data);
  await writeStore(store);
}

export { sendDatabaseBackedPushNotifications };

async function notifyEventPublished(store, event) {
  await sendPushNotifications(store, `🎉 New Event: ${event.name}`, "Tap to see upcoming events", { screen: "Events" });
}

async function notifyArchiveAdded(store, entry) {
  await sendPushNotifications(store, `📚 New Archive: ${entry.name}`, "Check the archive section", { screen: "Archive" });
}

async function notifyWinnerAdded(store, winner) {
  await sendPushNotifications(store, `🏆 Hall of Fame: ${winner.name}`, "A new winner has been added", { screen: "HallOfFame" });
}

async function notifyEventCancelled(store, event) {
  await sendPushNotifications(store, `📌 Event Cancelled: ${event.name}`, "An event has been removed", { screen: "Events" });
}

async function notifyEventReminder(store, event) {
  await sendEventPushNotification(store, {
    body: `${event.name} starts in 1 hour. Don't miss it!`,
    data: { eventId: event.id, screen: "EventDetail" },
    sound: "default",
    title: "Starting Soon! ⏰"
  });
}

function upsert(collection, item) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    collection[index] = item;
    return "update";
  }
  collection.push(item);
  return "create";
}

async function serveStatic(pathname, res) {
  const relative = pathname === "/admin" || pathname === "/admin/" ? "admin.html" : pathname.replace(/^\/admin\//, "");
  const filePath = resolve(publicDir, relative);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    send(res, 404, "Not found", "text/plain; charset=utf-8");
    return;
  }
  const type = contentTypes[extname(filePath)] ?? "text/plain; charset=utf-8";
  const body = type.startsWith("image/") ? await readFile(filePath) : await readFile(filePath, "utf8");
  send(res, 200, body, type);
}

async function serveFile(filePath, res) {
  const type = contentTypes[extname(filePath)] ?? "application/octet-stream";
  const isText = type.startsWith("text/") || type.includes("json") || type.includes("svg");
  send(res, 200, await readFile(filePath, isText ? "utf8" : undefined), type);
}

async function serveWebApp(pathname, res) {
  if (!existsSync(webDir)) {
    await serveStatic("/admin", res);
    return;
  }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = resolve(webDir, relative);
  if (filePath.startsWith(webDir) && existsSync(filePath)) {
    await serveFile(filePath, res);
    return;
  }
  const indexPath = join(webDir, "index.html");
  if (existsSync(indexPath)) {
    await serveFile(indexPath, res);
    return;
  }
  send(res, 404, { error: "Main app build not found" });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === "/health") {
      send(res, 200, { ok: true, service: "jim-connect-api" });
      return;
    }

    const store = await readStore();
    store.events ??= [];
    store.archive ??= [];
    store.winners ??= [];
    store.admins ??= [];
    store.pushTokens ??= [];
    store.notifications ??= [];
    store.auditLog ??= [];
    store.notices ??= [];
    await hydrateStoreFromDatabase(store);
    req.store = store;

    if (hasDatabase() && req.method === "GET" && path === "/notices") {
      const result = await queryDatabase(
        "select id, title, message, from_office, priority, created_at, is_active from notices where is_active = true order by created_at desc"
      );
      send(res, 200, result.rows.map(rowToNotice));
      return;
    }

    if (hasDatabase() && path === "/admin/notices" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      if (!canWrite(admin, "notices")) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      const body = await readBody(req);
      const priority = body.priority || "Normal";
      const item = {
        from_office: body.from_office,
        message: body.message,
        priority,
        title: body.title
      };
      const errors = validateAdminItem("notices", { ...item, id: "notice-preview" }, store);
      if (errors.length > 0) {
        send(res, 400, { errors });
        return;
      }
      const result = await queryDatabase(
        `insert into notices (title, message, from_office, priority, is_active)
         values ($1, $2, $3, $4, true)
         returning id, title, message, from_office, priority, created_at, is_active`,
        [item.title, item.message, item.from_office, item.priority]
      );
      const notice = rowToNotice(result.rows[0]);
      store.notices.unshift(notice);
      audit(store, "notice_created", "notices", notice.id, admin.email ?? admin.name);
      await auditDatabase("notice_created", "notices", notice.id, admin.email ?? admin.name);
      await sendPushNotifications(store, `📢 ${notice.from_office}: ${notice.title}`, firstWords(notice.message), { screen: "Notices" });
      await writeStore(store);
      send(res, 201, notice);
      return;
    }

    const databaseNoticeIdMatch = path.match(/^\/admin\/notices\/([^/]+)$/);
    if (hasDatabase() && databaseNoticeIdMatch && (req.method === "DELETE" || req.method === "PATCH")) {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      if (!canWrite(admin, "notices")) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      const id = databaseNoticeIdMatch[1];
      const result =
        req.method === "DELETE"
          ? await queryDatabase(
              `update notices set is_active = false where id = $1
               returning id, title, message, from_office, priority, created_at, is_active`,
              [id]
            )
          : await queryDatabase(
              `update notices set is_active = not is_active where id = $1
               returning id, title, message, from_office, priority, created_at, is_active`,
              [id]
            );
      if (result.rowCount === 0) {
        send(res, 404, { error: "Notice not found" });
        return;
      }
      const notice = rowToNotice(result.rows[0]);
      const action = req.method === "DELETE" ? "notice_deleted" : "notice_updated";
      audit(store, action, "notices", id, admin.email ?? admin.name);
      await auditDatabase(action, "notices", id, admin.email ?? admin.name);
      await writeStore(store);
      send(res, 200, req.method === "DELETE" ? { ok: true } : notice);
      return;
    }

    if (
      await handleNoticeRoute({
        audit,
        canWrite,
        path,
        readBody,
        req,
        requireAdmin,
        res,
        send,
        sendPushNotification: sendEventPushNotification,
        store,
        writeStore
      })
    ) {
      return;
    }

    if (req.method === "GET" && path === "/events/upcoming") {
      const now = new Date();
      send(
        res,
        200,
        store.events
          .filter((event) => event.published && new Date(event.endsAt) > now)
          .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
          .map(publicEvent)
      );
      return;
    }

    if (req.method === "GET" && path === "/archive") {
      send(res, 200, store.archive.sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => ({ ...entry, image_data: entry.image_data ?? "" })));
      return;
    }

    if (req.method === "GET" && path === "/hall-of-fame") {
      send(res, 200, store.winners.map((winner) => ({ ...winner, image_data: winner.image_data ?? "" })));
      return;
    }

    if (req.method === "POST" && path === "/push/register") {
      const body = await readBody(req);
      if (!body.token) {
        send(res, 400, { error: "token is required" });
        return;
      }
      const next = { platform: body.platform ?? "unknown", token: body.token, updatedAt: new Date().toISOString() };
      const index = store.pushTokens.findIndex((entry) => entry.token === next.token);
      if (index >= 0) store.pushTokens[index] = next;
      else store.pushTokens.push(next);
      if (hasDatabase()) {
        await queryDatabase(
          `insert into push_tokens (platform, token, updated_at)
           values ($1, $2, now())
           on conflict (token) do update set
             platform = excluded.platform,
             updated_at = now()`,
          [next.platform, next.token]
        );
      }
      await writeStore(store);
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && path === "/admin/debug/tokens") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      send(res, 200, hasDatabase() ? await getDatabasePushTokens() : store.pushTokens);
      return;
    }

    const adminEventMatch = path.match(/^\/admin\/events(?:\/([^/]+))?$/);
    if (adminEventMatch && req.method === "DELETE" && adminEventMatch[1]) {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      if (!canWrite(admin, "events")) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      const id = adminEventMatch[1];
      const deletedItem = store.events.find((event) => event.id === id);
      store.events = store.events.filter((event) => event.id !== id);
      if (hasDatabase()) {
        await queryDatabase("delete from events where id = $1", [id]);
      }
      audit(store, "delete", "events", id, admin.email ?? admin.name);
      await auditDatabase("delete", "events", id, admin.email ?? admin.name);
      if (deletedItem) {
        await notifyEventCancelled(store, deletedItem);
        audit(store, "notify", "events", id, admin.email ?? admin.name);
        await auditDatabase("notify", "events", id, admin.email ?? admin.name);
      }
      await writeStore(store);
      send(res, 200, { ok: true });
      return;
    }

    if (adminEventMatch && (req.method === "POST" || req.method === "PUT")) {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      if (!canWrite(admin, "events")) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      const body = await readBody(req);
      const [, routeId] = adminEventMatch;
      if (routeId) body.id = routeId;
      if (!body.id) body.id = `events-${Date.now()}`;
      const existing = store.events.find((event) => event.id === body.id);
      const item = normalizeEventForStore(body, existing);
      const errors = validateAdminItem("events", item, store);
      if (errors.length > 0) {
        send(res, 400, { errors });
        return;
      }
      const wasPublished = Boolean(existing?.published);
      const action = upsert(store.events, item);
      audit(store, action, "events", item.id, admin.email ?? admin.name);
      const savedItem = hasDatabase() ? await upsertDatabaseEvent(item) : item;
      await auditDatabase(action, "events", item.id, admin.email ?? admin.name);
      if (item.published && !wasPublished) {
        await notifyEventPublished(store, item);
        audit(store, "notify", "events", item.id, admin.email ?? admin.name);
        await auditDatabase("notify", "events", item.id, admin.email ?? admin.name);
      }
      await writeStore(store);
      send(res, 200, savedItem);
      return;
    }

    const directAdminContentMatch = path.match(/^\/admin\/(archive|hall-of-fame)$/);
    if (directAdminContentMatch && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const module = directAdminContentMatch[1] === "hall-of-fame" ? "winners" : "archive";
      if (!canWrite(admin, module)) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      const body = await readBody(req);
      const item =
        module === "archive"
          ? normalizeArchiveForStore(body, store.archive.find((entry) => entry.id === body.id))
          : normalizeWinnerForStore(body, store.winners.find((entry) => entry.id === body.id), store);
      if (!item.id) item.id = `${module}-${Date.now()}`;
      const errors = validateAdminItem(module, item, store);
      if (errors.length > 0) {
        send(res, 400, { errors });
        return;
      }
      const action = upsert(store[module], item);
      audit(store, action, module, item.id, admin.email ?? admin.name);
      const savedItem =
        hasDatabase() && module === "archive"
          ? await upsertDatabaseArchive(item)
          : hasDatabase() && module === "winners"
            ? await upsertDatabaseWinner(item)
            : item;
      await auditDatabase(action, module, item.id, admin.email ?? admin.name);
      if (module === "archive" && action === "create") {
        await notifyArchiveAdded(store, item);
        audit(store, "notify", module, item.id, admin.email ?? admin.name);
        await auditDatabase("notify", module, item.id, admin.email ?? admin.name);
      }
      if (module === "winners" && action === "create") {
        await notifyWinnerAdded(store, item);
        audit(store, "notify", module, item.id, admin.email ?? admin.name);
        await auditDatabase("notify", module, item.id, admin.email ?? admin.name);
      }
      await writeStore(store);
      send(res, 200, savedItem);
      return;
    }

    if (path === "/admin/api/store" && req.method === "GET") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      send(res, 200, {
        ...sanitizeStoreForAdmin(store, admin),
        currentAdmin: { email: admin.email, name: admin.name, role: admin.role }
      });
      return;
    }

    const adminMatch = path.match(/^\/admin\/api\/(events|archive|winners|admins|notifications|push-tokens|audit|notices)$/);
    if (adminMatch) {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const module = adminMatch[1];
      const storeKey = module === "push-tokens" ? "pushTokens" : module === "audit" ? "auditLog" : module;
      if (req.method === "GET") {
        const data =
          storeKey === "admins" && admin.role !== "Super Admin"
            ? (store.admins ?? []).map(({ token, ...entry }) => entry)
            : store[storeKey] ?? [];
        send(res, 200, data);
        return;
      }
      if (!canWrite(admin, module)) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      if (req.method === "POST" || req.method === "PUT") {
        const body = await readBody(req);
        const item =
          module === "events"
            ? normalizeEventForStore(body, store.events.find((event) => event.id === body.id))
            : module === "archive"
              ? normalizeArchiveForStore(body, store.archive.find((entry) => entry.id === body.id))
              : module === "winners"
                ? normalizeWinnerForStore(body, store.winners.find((entry) => entry.id === body.id), store)
                : body;
        if (!item.id) item.id = `${module}-${Date.now()}`;
        const errors = validateAdminItem(module, item, store);
        if (errors.length > 0) {
          send(res, 400, { errors });
          return;
        }
        const wasPublished = module === "events" && store.events.find((event) => event.id === item.id)?.published;
        if (module === "events" && item.reminderSent === undefined) {
          item.reminderSent = store.events.find((event) => event.id === item.id)?.reminderSent ?? false;
          item.reminder_sent = item.reminderSent;
        }
        const action = upsert(store[storeKey], item);
        audit(store, action, module, item.id, admin.email ?? admin.name);
        const savedItem =
          hasDatabase() && module === "events"
            ? await upsertDatabaseEvent(item)
            : hasDatabase() && module === "archive"
              ? await upsertDatabaseArchive(item)
              : hasDatabase() && module === "winners"
                ? await upsertDatabaseWinner(item)
                : item;
        await auditDatabase(action, module, item.id, admin.email ?? admin.name);
        if (module === "events" && item.published && !wasPublished) {
          await notifyEventPublished(store, item);
          audit(store, "notify", module, item.id, admin.email ?? admin.name);
          await auditDatabase("notify", module, item.id, admin.email ?? admin.name);
        } else if (module === "archive" && action === "create") {
          await notifyArchiveAdded(store, item);
          audit(store, "notify", module, item.id, admin.email ?? admin.name);
          await auditDatabase("notify", module, item.id, admin.email ?? admin.name);
        } else if (module === "winners" && action === "create") {
          await notifyWinnerAdded(store, item);
          audit(store, "notify", module, item.id, admin.email ?? admin.name);
          await auditDatabase("notify", module, item.id, admin.email ?? admin.name);
        }
        await writeStore(store);
        send(res, 200, savedItem);
        return;
      }
    }

    const deleteMatch = path.match(/^\/admin\/api\/(events|archive|winners|admins)\/([^/]+)$/);
    if (deleteMatch && req.method === "DELETE") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const [, module, id] = deleteMatch;
      if (!canWrite(admin, module)) {
        send(res, 403, { error: "This role cannot modify this module" });
        return;
      }
      const deletedItem = store[module].find((entry) => entry.id === id);
      store[module] = store[module].filter((entry) => entry.id !== id);
      if (hasDatabase() && module === "events") {
        await queryDatabase("delete from events where id = $1", [id]);
      } else if (hasDatabase() && module === "archive") {
        await queryDatabase("delete from archive where id = $1", [id]);
      } else if (hasDatabase() && module === "winners") {
        await queryDatabase("delete from hall_of_fame where id = $1", [id]);
      }
      audit(store, "delete", module, id, admin.email ?? admin.name);
      await auditDatabase("delete", module, id, admin.email ?? admin.name);
      if (module === "events" && deletedItem) {
        await notifyEventCancelled(store, deletedItem);
        audit(store, "notify", module, id, admin.email ?? admin.name);
        await auditDatabase("notify", module, id, admin.email ?? admin.name);
      }
      await writeStore(store);
      send(res, 200, { ok: true });
      return;
    }

    if (path.startsWith("/admin")) {
      await serveStatic(path, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveWebApp(path, res);
      return;
    }

    send(res, 404, { error: "Not found" });
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

server.listen(port, () => {
  console.log(`JIM-Connect API listening on http://localhost:${port}`);
  console.log(`Main App: http://localhost:${port}/`);
  console.log(`Admin Portal: http://localhost:${port}/admin`);
});

startEventReminderJob({
  readStore,
  sendReminderNotification: notifyEventReminder,
  writeStore
});
