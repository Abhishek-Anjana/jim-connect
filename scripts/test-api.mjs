import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(".");
const tempDir = await mkdtemp(join(tmpdir(), "jim-connect-api-"));
const storePath = join(tempDir, "store.json");
const port = 3199;
const baseUrl = `http://localhost:${port}`;
const token = "test-admin-token";
await copyFile(resolve(root, "server/data/store.json"), storePath);

const child = spawn(process.execPath, ["server/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    ADMIN_TOKEN: token,
    PORT: String(port),
    STORE_PATH: storePath
  },
  stdio: "ignore"
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
  }
  throw new Error("API server did not start");
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

async function apiStatus(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(options.headers ?? {})
    }
  });
  return response.status;
}

try {
  await waitForServer();
  const events = await api("/events/upcoming");
  assert.ok(events.length >= 1);
  const blockedNoticeResponse = await fetch(`${baseUrl}/admin/notices`, {
    body: JSON.stringify({ title: "Blocked" }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert.equal(blockedNoticeResponse.status, 401);
  assert.ok(Array.isArray(await api("/notices")));

  assert.equal(
    await apiStatus("/admin/api/archive", {
      body: JSON.stringify({
        club: "Student Affairs",
        date: "2026-04-26",
        driveUrl: "https://example.com/not-drive",
        eventId: "bad",
        id: "bad-archive",
        image: "http://example.com/archive.jpg",
        name: "Bad Archive",
        summary: "too short",
        year: "2026"
      }),
      method: "POST"
    }),
    400
  );

  await api("/push/register", {
    body: JSON.stringify({ platform: "ios", token: "local-test-token" }),
    method: "POST"
  });
  const debugTokens = await api("/admin/debug/tokens");
  assert.equal(debugTokens.length, 1);
  assert.equal(debugTokens[0].token, "local-test-token");

  await api("/admin/api/events", {
    body: JSON.stringify({
      attachments: [],
      club: "Student Affairs",
      description: "Published by the automated API smoke test.",
      endsAt: "2026-06-01T12:00:00+05:30",
      id: "api-smoke-event",
      image_data: "dGVzdA==",
      name: "API Smoke Event",
      published: true,
      registration_link: "https://forms.gle/example",
      reminder_sent: false,
      speakers: [],
      startsAt: "2026-06-01T10:00:00+05:30",
      venue: "Test Hall"
    }),
    method: "POST"
  });

  const store = await api("/admin/api/store");
  assert.equal(store.lastNotification.tokenCount, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].payload.data.screen, "Events");
  assert.equal(store.notifications[0].payload.title, "🎉 New Event: API Smoke Event");
  assert.equal(store.notifications[0].payload.body, "Tap to see upcoming events");
  assert.ok(store.auditLog.some((entry) => entry.action === "notify" && entry.idRef === "api-smoke-event"));

  const updatedEvents = await api("/events/upcoming");
  const smokeEvent = updatedEvents.find((event) => event.id === "api-smoke-event");
  assert.equal(smokeEvent.registration_link, "https://forms.gle/example");
  assert.equal(smokeEvent.image_data, "dGVzdA==");
  assert.equal(smokeEvent.reminder_sent, false);

  const notice = await api("/admin/notices", {
    body: JSON.stringify({
      from_office: "Dean Academics",
      message: "This notice was created by the API smoke test.",
      priority: "Important",
      title: "API Smoke Notice"
    }),
    method: "POST"
  });
  assert.equal(notice.title, "API Smoke Notice");
  assert.equal(notice.from_office, "Dean Academics");
  const notices = await api("/notices");
  assert.ok(notices.some((entry) => entry.id === notice.id));
  const toggledNotice = await api(`/admin/notices/${notice.id}`, {
    body: JSON.stringify({ is_active: true }),
    method: "PATCH"
  });
  assert.equal(toggledNotice.id, notice.id);
  await api(`/admin/notices/${notice.id}`, { method: "DELETE" });
  const activeNotices = await api("/notices");
  assert.equal(activeNotices.some((entry) => entry.id === notice.id), false);
  const storeAfterNotice = await api("/admin/api/store");
  assert.ok(storeAfterNotice.auditLog.some((entry) => entry.action === "notice_created" && entry.idRef === notice.id));
  assert.ok(storeAfterNotice.auditLog.some((entry) => entry.action === "notice_deleted" && entry.idRef === notice.id));

  const viewerResponse = await fetch(`${baseUrl}/admin/api/store`, {
    headers: { "X-Admin-Token": "jim-viewer-dev" }
  });
  const viewerStore = await viewerResponse.json();
  assert.equal(viewerResponse.status, 200);
  assert.equal(Object.hasOwn(viewerStore.admins[0], "token"), false);
  assert.equal(
    await apiStatus("/admin/api/events", {
      body: JSON.stringify({
        attachments: [],
        club: "Student Affairs",
        description: "Viewer should not be able to publish.",
        endsAt: "2026-06-02T12:00:00+05:30",
        id: "viewer-blocked-event",
        image: "https://example.com/event.jpg",
        name: "Viewer Blocked Event",
        published: true,
        speakers: [],
        startsAt: "2026-06-02T10:00:00+05:30",
        venue: "Test Hall"
      }),
      headers: { "X-Admin-Token": "jim-viewer-dev" },
      method: "POST"
    }),
    403
  );

  const contentResponse = await fetch(`${baseUrl}/admin/api/store`, {
    headers: { "X-Admin-Token": "jim-content-dev" }
  });
  const contentStore = await contentResponse.json();
  assert.equal(contentResponse.status, 200);
  assert.equal(contentStore.currentAdmin.role, "Content Manager");
  assert.equal(Object.hasOwn(contentStore.admins[0], "token"), false);
  assert.equal(
    await apiStatus("/admin/api/admins", {
      body: JSON.stringify({
        active: true,
        email: "blocked@example.com",
        id: "blocked-admin",
        name: "Blocked Admin",
        role: "Read-Only Viewer",
        token: "blocked-token"
      }),
      headers: { "X-Admin-Token": "jim-content-dev" },
      method: "POST"
    }),
    403
  );

  await api("/admin/api/events", {
    body: JSON.stringify({
      attachments: [],
      club: "Student Affairs",
      description: "Content managers can publish approved events.",
      endsAt: "2026-06-03T12:00:00+05:30",
      id: "content-manager-event",
      image: "https://example.com/event.jpg",
      name: "Content Manager Event",
      published: true,
      speakers: [],
      startsAt: "2026-06-03T10:00:00+05:30",
      venue: "Test Hall"
    }),
    headers: { "X-Admin-Token": "jim-content-dev" },
    method: "POST"
  });

  console.log("API smoke tests passed.");
} finally {
  child.kill();
  await rm(tempDir, { force: true, recursive: true });
}
