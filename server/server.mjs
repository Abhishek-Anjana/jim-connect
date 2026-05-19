import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import eventReminderJob from "./jobs/eventReminder.js";

const { startEventReminderJob } = eventReminderJob;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const storePath = process.env.STORE_PATH ? resolve(process.env.STORE_PATH) : join(root, "server", "data", "store.json");
const publicDir = join(root, "server", "public");
const webDir = join(root, "dist-web");
const port = Number(process.env.PORT ?? 3001);
const adminToken = process.env.ADMIN_TOKEN ?? "jim-admin-dev";
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
    "Content-Type": type
  });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readStore() {
  return JSON.parse(await readFile(storePath, "utf8"));
}

async function writeStore(store) {
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function publicEvent(event) {
  const { published, reminderSent, ...rest } = event;
  return rest;
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
  if (admin.role === "Content Manager") return ["events", "archive", "winners"].includes(module);
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
    for (const field of ["name", "startsAt", "endsAt", "venue", "club", "image", "description"]) {
      requireString(item, field, errors);
    }
    if (Number.isNaN(Date.parse(item.startsAt)) || Number.isNaN(Date.parse(item.endsAt))) {
      errors.push("startsAt and endsAt must be valid date strings");
    } else if (new Date(item.endsAt) <= new Date(item.startsAt)) {
      errors.push("endsAt must be after startsAt");
    }
    if (item.image && !isHttpsUrl(item.image)) errors.push("image must be an HTTPS URL");
    if (!Array.isArray(item.speakers)) errors.push("speakers must be an array");
    if (!Array.isArray(item.attachments)) errors.push("attachments must be an array");
    if (typeof item.published !== "boolean") errors.push("published must be true or false");
  }

  if (module === "archive") {
    for (const field of ["eventId", "name", "date", "club", "year", "image", "summary", "driveUrl"]) {
      requireString(item, field, errors);
    }
    if (item.date && Number.isNaN(Date.parse(item.date))) errors.push("date must be valid");
    if (item.image && !isHttpsUrl(item.image)) errors.push("image must be an HTTPS URL");
    if (item.driveUrl && !isGoogleDriveUrl(item.driveUrl)) errors.push("driveUrl must be an HTTPS Google Drive URL");
    if (wordCount(item.summary) < 100) errors.push("summary must contain at least 100 words");
  }

  if (module === "winners") {
    for (const field of ["name", "batch", "award", "category", "club", "eventName", "archiveId", "portrait"]) {
      requireString(item, field, errors);
    }
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
  const notificationRecord = {
    id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    payload,
    sentAt: new Date().toISOString(),
    status: "recorded",
    tokenCount: store.pushTokens.length
  };

  const expoTokens = store.pushTokens
    .filter((entry) => typeof entry.token === "string" && entry.token.startsWith("ExponentPushToken"))
    .map((entry) => ({ ...payload, to: entry.token }));

  if (expoTokens.length > 0) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        body: JSON.stringify(expoTokens),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      notificationRecord.status = "sent";
    } catch {
      notificationRecord.error = "Expo push request failed";
      notificationRecord.status = "failed";
    }
  }

  store.notifications ??= [];
  store.notifications.unshift(notificationRecord);
  store.notifications = store.notifications.slice(0, 100);
  store.lastNotification = notificationRecord;
}

async function notifyEventPublished(store, event) {
  await sendEventPushNotification(store, {
    body: `${event.name} has been added. Tap to view details.`,
    data: { eventId: event.id, screen: "EventDetail" },
    sound: "default",
    title: "New Event at JIM! 🎉"
  });
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
    req.store = store;

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
      send(res, 200, store.archive.sort((a, b) => new Date(b.date) - new Date(a.date)));
      return;
    }

    if (req.method === "GET" && path === "/hall-of-fame") {
      send(res, 200, store.winners);
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
      await writeStore(store);
      send(res, 200, { ok: true });
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

    const adminMatch = path.match(/^\/admin\/api\/(events|archive|winners|admins|notifications|push-tokens|audit)$/);
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
        const item = await readBody(req);
        if (!item.id) item.id = `${module}-${Date.now()}`;
        const errors = validateAdminItem(module, item, store);
        if (errors.length > 0) {
          send(res, 400, { errors });
          return;
        }
        const wasPublished = module === "events" && store.events.find((event) => event.id === item.id)?.published;
        if (module === "events" && item.reminderSent === undefined) {
          item.reminderSent = store.events.find((event) => event.id === item.id)?.reminderSent ?? false;
        }
        const action = upsert(store[storeKey], item);
        audit(store, action, module, item.id, admin.email ?? admin.name);
        if (module === "events" && item.published && !wasPublished) {
          await notifyEventPublished(store, item);
          audit(store, "notify", module, item.id, admin.email ?? admin.name);
        }
        await writeStore(store);
        send(res, 200, item);
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
      store[module] = store[module].filter((entry) => entry.id !== id);
      audit(store, "delete", module, id, admin.email ?? admin.name);
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
