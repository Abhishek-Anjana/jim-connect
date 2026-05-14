const modules = {
  admins: ["id", "name", "email", "role", "active", "token"],
  archive: ["id", "eventId", "name", "date", "club", "year", "image", "summary", "driveUrl"],
  events: ["id", "name", "startsAt", "endsAt", "venue", "club", "image", "description", "speakers", "attachments", "published"],
  winners: ["id", "name", "batch", "award", "category", "club", "eventName", "archiveId", "portrait", "champion"]
};

let active = "dashboard";
let store = null;
const content = document.querySelector("#content");
const login = document.querySelector("#login");
const loginForm = document.querySelector("#login-form");
const logout = document.querySelector("#logout");
const nav = document.querySelector("nav");
const status = document.querySelector("#status");
const token = document.querySelector("#token");
token.value = sessionStorage.getItem("jim-admin-token") ?? "";

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Token": token.value
  };
}

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers ?? {}) } });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.errors?.join("; ") ?? payload?.error ?? text;
    throw new Error(message);
  }
  return payload;
}

function setStatus(message) {
  status.textContent = message;
}

function canWrite(module) {
  const role = store?.currentAdmin?.role;
  if (role === "Super Admin") return true;
  if (role === "Content Manager") return ["events", "archive", "winners"].includes(module);
  return false;
}

async function load() {
  setStatus("");
  store = await request("/admin/api/store");
  sessionStorage.setItem("jim-admin-token", token.value);
  login.hidden = true;
  nav.hidden = false;
  content.hidden = false;
  logout.hidden = false;
  render();
}

function valueFor(field, value) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "true" : "false";
  return value ?? "";
}

function parseField(field, value) {
  if (["speakers", "attachments"].includes(field)) return value.split("\n").map((item) => item.trim()).filter(Boolean);
  if (["published", "champion", "active"].includes(field)) return value === "true";
  return value.trim();
}

function emptyFor(module) {
  const item = {};
  for (const field of modules[module]) item[field] = "";
  if (module === "events") {
    item.id = `event-${Date.now()}`;
    item.published = false;
    item.speakers = [];
    item.attachments = [];
  }
  if (module === "archive") item.id = `archive-${Date.now()}`;
  if (module === "winners") {
    item.id = `winner-${Date.now()}`;
    item.champion = false;
  }
  if (module === "admins") {
    item.id = `admin-${Date.now()}`;
    item.active = true;
    item.role = "Content Manager";
  }
  return item;
}

function renderForm(module, item = emptyFor(module)) {
  const fields = modules[module];
  return `
    <form class="panel form-grid" id="edit-form">
      <h2>${item.id ? "Edit" : "Create"} ${module}</h2>
      ${fields
        .map((field) => {
          const value = valueFor(field, item[field]);
          if (["description", "summary", "speakers", "attachments"].includes(field)) {
            return `<label>${field}<textarea name="${field}">${value}</textarea></label>`;
          }
          if (field === "role") {
            return `<label>${field}<select name="${field}"><option ${item[field] === "Super Admin" ? "selected" : ""}>Super Admin</option><option ${item[field] === "Content Manager" ? "selected" : ""}>Content Manager</option><option ${item[field] === "Read-Only Viewer" ? "selected" : ""}>Read-Only Viewer</option></select></label>`;
          }
          if (["published", "champion", "active"].includes(field)) {
            return `<label>${field}<select name="${field}"><option value="false" ${!item[field] ? "selected" : ""}>false</option><option value="true" ${item[field] ? "selected" : ""}>true</option></select></label>`;
          }
          return `<label>${field}<input name="${field}" ${field === "token" ? 'type="password"' : ""} value="${String(value).replaceAll('"', "&quot;")}" /></label>`;
        })
        .join("")}
      <button class="primary" type="submit">Save</button>
    </form>
  `;
}

function card(module, item) {
  const title = item.name ?? item.id;
  const subtitle =
    module === "events"
      ? `${item.startsAt} | ${item.venue}`
      : module === "archive"
        ? `${item.date} | ${item.club}`
        : module === "admins"
          ? `${item.email} | ${item.role} | ${item.active ? "active" : "inactive"}`
          : `${item.batch} | ${item.award}`;
  return `
    <article class="card">
      <h3>${title}</h3>
      <p class="meta">${subtitle}</p>
      <div class="row">
        ${canWrite(module) ? `<button data-edit="${item.id}">Edit</button><button class="danger" data-delete="${item.id}">Delete</button>` : ""}
      </div>
    </article>
  `;
}

function renderModule(module) {
  content.innerHTML = `
    <div class="grid">
      ${canWrite(module) ? renderForm(module) : `<section class="panel"><h2>Read-only access</h2><p class="meta">Your role can view this module but cannot make changes.</p></section>`}
      <section class="list">
        ${(store[module] ?? []).map((item) => card(module, item)).join("")}
      </section>
    </div>
  `;
}

function renderAudit() {
  content.innerHTML = `
    <section class="list">
      ${(store.auditLog ?? [])
        .map(
          (entry) => `
            <article class="card">
              <h3>${entry.action} ${entry.module}</h3>
              <p class="meta">${entry.timestamp} | ${entry.user} | ${entry.idRef}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderDashboard() {
  const publishedEvents = (store.events ?? []).filter((event) => event.published).length;
  const draftEvents = (store.events ?? []).filter((event) => !event.published).length;
  const activeAdmins = (store.admins ?? []).filter((admin) => admin.active).length;
  content.innerHTML = `
    <section class="stats">
      <article class="card"><h3>${store.currentAdmin?.role ?? "Admin"}</h3><p class="meta">${store.currentAdmin?.email ?? ""}</p></article>
      <article class="card"><h3>${publishedEvents}</h3><p class="meta">Published events</p></article>
      <article class="card"><h3>${draftEvents}</h3><p class="meta">Draft events</p></article>
      <article class="card"><h3>${store.archive?.length ?? 0}</h3><p class="meta">Archive entries</p></article>
      <article class="card"><h3>${store.winners?.length ?? 0}</h3><p class="meta">Hall of Fame profiles</p></article>
      <article class="card"><h3>${store.pushTokens?.length ?? 0}</h3><p class="meta">Registered push tokens</p></article>
      <article class="card"><h3>${activeAdmins}</h3><p class="meta">Active admin users</p></article>
    </section>
    <section class="panel">
      <h2>Recent Activity</h2>
      <div class="list">
        ${(store.auditLog ?? [])
          .slice(0, 5)
          .map((entry) => `<article class="card"><h3>${entry.action} ${entry.module}</h3><p class="meta">${entry.timestamp} | ${entry.idRef}</p></article>`)
          .join("") || `<p class="meta">No admin activity yet.</p>`}
      </div>
    </section>
  `;
}

function renderNotifications() {
  content.innerHTML = `
    <section class="list">
      ${(store.notifications ?? [])
        .map(
          (entry) => `
            <article class="card">
              <h3>${entry.payload?.title ?? "Notification"}</h3>
              <p>${entry.payload?.body ?? ""}</p>
              <p class="meta">${entry.sentAt} | ${entry.status} | ${entry.tokenCount} tokens</p>
              ${entry.error ? `<p class="error">${entry.error}</p>` : ""}
            </article>
          `
        )
        .join("") || `<article class="card"><h3>No notifications yet</h3><p class="meta">Publishing an event will record the dispatch here.</p></article>`}
    </section>
  `;
}

function render() {
  document.querySelectorAll("nav button").forEach((button) => button.classList.toggle("active", button.dataset.tab === active));
  if (active === "dashboard") renderDashboard();
  else if (active === "audit") renderAudit();
  else if (active === "notifications") renderNotifications();
  else renderModule(active);
}

nav.addEventListener("click", (event) => {
  if (!event.target.dataset.tab) return;
  active = event.target.dataset.tab;
  render();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  load().catch((error) => setStatus(error.message));
});

logout.addEventListener("click", () => {
  sessionStorage.removeItem("jim-admin-token");
  token.value = "";
  login.hidden = false;
  nav.hidden = true;
  content.hidden = true;
  logout.hidden = true;
  setStatus("");
});

content.addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    const item = store[active].find((entry) => entry.id === editId);
    content.querySelector("#edit-form").outerHTML = renderForm(active, item);
  }
  if (deleteId) {
    try {
      await request(`/admin/api/${active}/${deleteId}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }
});

content.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const item = {};
  for (const field of modules[active]) item[field] = parseField(field, form.get(field) ?? "");
  try {
    await request(`/admin/api/${active}`, { body: JSON.stringify(item), method: "POST" });
    await load();
  } catch (error) {
    setStatus(error.message);
  }
});

if (token.value) {
  load().catch(() => {
    sessionStorage.removeItem("jim-admin-token");
    token.value = "";
  });
}
