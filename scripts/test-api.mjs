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

  await api("/admin/api/events", {
    body: JSON.stringify({
      attachments: [],
      club: "Student Affairs",
      description: "Published by the automated API smoke test.",
      endsAt: "2026-06-01T12:00:00+05:30",
      id: "api-smoke-event",
      image: "https://example.com/event.jpg",
      name: "API Smoke Event",
      published: true,
      speakers: [],
      startsAt: "2026-06-01T10:00:00+05:30",
      venue: "Test Hall"
    }),
    method: "POST"
  });

  const store = await api("/admin/api/store");
  assert.equal(store.lastNotification.tokenCount, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].payload.data.eventId, "api-smoke-event");
  assert.equal(store.notifications[0].payload.data.screen, "EventDetail");
  assert.equal(store.notifications[0].payload.title, "New Event at JIM! 🎉");
  assert.equal(store.notifications[0].payload.body, "API Smoke Event has been added. Tap to view details.");
  assert.ok(store.auditLog.some((entry) => entry.action === "notify" && entry.idRef === "api-smoke-event"));

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
