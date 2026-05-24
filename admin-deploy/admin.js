const modules = {
  admins: ["id", "name", "email", "role", "active", "token"],
  archive: ["id", "eventId", "name", "date", "club", "year", "image", "summary", "driveUrl"],
  events: ["id", "name", "startsAt", "endsAt", "venue", "club", "registration_link", "image_data", "description", "speakers", "attachments", "published"],
  winners: ["id", "name", "batch", "award", "category", "club", "eventName", "archiveId", "portrait", "champion"]
};

const clubGroups = {
  Clubs: [
    "Marketing Club",
    "Finance Club",
    "Human Resource Club",
    "Business Analytics Club",
    "Operations Management Club",
    "General Management Club"
  ],
  Committees: [
    "Admission Committee",
    "Alumni Relations Committee",
    "Cultural & Creativity Committee",
    "Career Management Committee",
    "Campus Administration Committee",
    "Entrepreneurship Committee",
    "Event Management Committee",
    "International Relations Committee",
    "Information Technology Committee",
    "Learning Resource Committee",
    "Media Relations Committee",
    "Programme Management Committee",
    "Sports Committee",
    "Social Responsibility Committee",
    "Student Welfare & Discipline Committee"
  ]
};

const noticeOffices = ["Dean Academics", "PGP Office", "Student Affairs", "Director's Office", "Placement Cell"];
const noticePriorities = ["Normal", "Important", "Urgent"];

const apiBaseUrl = "https://jim-connect-production.up.railway.app";
let active = "dashboard";
let store = null;
const content = document.querySelector("#content");
const login = document.querySelector("#login");
const loginForm = document.querySelector("#login-form");
const logout = document.querySelector("#logout");
const nav = document.querySelector("nav");
const status = document.querySelector("#status");
const token = document.querySelector("#token");
const toast = document.createElement("div");
toast.id = "toast";
toast.hidden = true;
document.body.appendChild(toast);
token.value = sessionStorage.getItem("jim-admin-token") ?? "";

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Token": token.value
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers: { ...headers(), ...(options.headers ?? {}) } });
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

function showPushToast() {
  toast.textContent = "✅ Push notification sent to all students";
  toast.hidden = false;
  toast.classList.add("show");
  window.clearTimeout(showPushToast.timer);
  showPushToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => {
      toast.hidden = true;
    }, 350);
  }, 3000);
}

function canWrite(module) {
  const role = store?.currentAdmin?.role;
  if (role === "Super Admin") return true;
  if (role === "Content Manager") return ["events", "archive", "winners", "notices"].includes(module);
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

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function readableDateTime(value) {
  if (!value) return "Select start and end date/time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Select start and end date/time";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    weekday: "short",
    year: "numeric"
  }).format(date).replace(",", " at");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clubOptions(selected) {
  return Object.entries(clubGroups)
    .map(([group, options]) => {
      const items = options.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
      return `<optgroup label="${escapeHtml(group)}">${items}</optgroup>`;
    })
    .join("");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read selected image"));
    reader.readAsDataURL(file);
  });
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
          if (module === "events" && ["startsAt", "endsAt"].includes(field)) {
            return `<label>${field}<input name="${field}" type="datetime-local" value="${toDatetimeLocal(value)}" /></label>`;
          }
          if (module === "events" && field === "club") {
            return `<label>Club / Committee<select name="${field}">${clubOptions(value)}</select></label>`;
          }
          if (module === "events" && field === "registration_link") {
            return `<label>Registration Link<input name="${field}" type="url" placeholder="https://forms.gle/..." value="${escapeHtml(value)}" /></label>`;
          }
          if (module === "events" && field === "image_data") {
            const preview = value ? `<img class="preview-image" src="data:image/jpeg;base64,${value}" alt="Selected event image preview" />` : "";
            return `<label>Event Image<input name="image_file" type="file" accept="image/*" /><input name="image_data" type="hidden" value="${escapeHtml(value)}" />${preview}</label>`;
          }
          if (["description", "summary", "speakers", "attachments"].includes(field)) {
            return `<label>${field}<textarea name="${field}">${value}</textarea></label>`;
          }
          if (field === "role") {
            return `<label>${field}<select name="${field}"><option ${item[field] === "Super Admin" ? "selected" : ""}>Super Admin</option><option ${item[field] === "Content Manager" ? "selected" : ""}>Content Manager</option><option ${item[field] === "Read-Only Viewer" ? "selected" : ""}>Read-Only Viewer</option></select></label>`;
          }
          if (module === "winners" && field === "batch") {
            return `<label>batch<select name="${field}"><option ${item[field] === "2025-27" ? "selected" : ""}>2025-27</option><option ${item[field] === "2026-28" ? "selected" : ""}>2026-28</option></select></label>`;
          }
          if (["published", "champion", "active"].includes(field)) {
            return `<label>${field}<select name="${field}"><option value="false" ${!item[field] ? "selected" : ""}>false</option><option value="true" ${item[field] ? "selected" : ""}>true</option></select></label>`;
          }
          return `<label>${field}<input name="${field}" ${field === "token" ? 'type="password"' : ""} value="${escapeHtml(value)}" /></label>`;
        })
        .join("")}
      ${module === "events" ? `<p class="meta date-preview" id="event-date-preview">${readableDateTime(item.startsAt)} to ${readableDateTime(item.endsAt)}</p>` : ""}
      <button class="primary" type="submit">Save</button>
    </form>
  `;
}

function bindEventFormPreview() {
  const form = content.querySelector("#edit-form");
  const preview = content.querySelector("#event-date-preview");
  if (!form || !preview) return;
  const update = () => {
    preview.textContent = `${readableDateTime(form.elements.startsAt?.value)} to ${readableDateTime(form.elements.endsAt?.value)}`;
  };
  form.elements.startsAt?.addEventListener("input", update);
  form.elements.endsAt?.addEventListener("input", update);
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
  bindEventFormPreview();
}

function renderNotices() {
  content.innerHTML = `
    <div class="grid">
      ${canWrite("notices") ? `
        <form class="panel form-grid" id="notice-form">
          <h2>Create Dean's Notice</h2>
          <label>Title<input name="title" required /></label>
          <label>Message<textarea name="message" required></textarea></label>
          <label>From<select name="from_office">${noticeOffices.map((office) => `<option>${escapeHtml(office)}</option>`).join("")}</select></label>
          <label>Priority<select name="priority">${noticePriorities.map((priority) => `<option>${priority}</option>`).join("")}</select></label>
          <button class="primary" type="submit">Publish</button>
        </form>
      ` : `<section class="panel"><h2>Read-only access</h2><p class="meta">Your role can view notices but cannot publish them.</p></section>`}
      <section class="list">
        ${(store.notices ?? []).map((notice) => `
          <article class="card notice-card notice-${String(notice.priority ?? "Normal").toLowerCase()}">
            <h3>${escapeHtml(notice.title)}</h3>
            <p class="meta">${escapeHtml(notice.from_office)} | ${escapeHtml(notice.priority)} | ${escapeHtml(notice.created_at)}</p>
            <p>${escapeHtml(notice.message)}</p>
            <div class="row">${canWrite("notices") ? `<button class="danger" data-delete-notice="${notice.id}">Delete</button>` : ""}</div>
          </article>
        `).join("") || `<article class="card"><h3>No notices yet</h3><p class="meta">Dean's notices will appear here after publishing.</p></article>`}
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
  const today = new Date().toDateString();
  const notificationsToday = (store.notifications ?? []).filter((entry) => new Date(entry.sentAt).toDateString() === today).length;
  content.innerHTML = `
    <section class="stats">
      <article class="card"><h3>${store.currentAdmin?.role ?? "Admin"}</h3><p class="meta">${store.currentAdmin?.email ?? ""}</p></article>
      <article class="card"><h3>${publishedEvents}</h3><p class="meta">Published events</p></article>
      <article class="card"><h3>${draftEvents}</h3><p class="meta">Draft events</p></article>
      <article class="card"><h3>${store.archive?.length ?? 0}</h3><p class="meta">Archive entries</p></article>
      <article class="card"><h3>${store.winners?.length ?? 0}</h3><p class="meta">Hall of Fame profiles</p></article>
      <article class="card"><h3>${store.pushTokens?.length ?? 0}</h3><p class="meta">Registered push tokens</p></article>
      <article class="card"><h3>${notificationsToday}</h3><p class="meta">Notifications Sent Today</p></article>
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
  else if (active === "notices") renderNotices();
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
  const deleteNoticeId = event.target.dataset.deleteNotice;
  if (editId) {
    const item = store[active].find((entry) => entry.id === editId);
    content.querySelector("#edit-form").outerHTML = renderForm(active, item);
    bindEventFormPreview();
  }
  if (deleteId) {
    try {
      await request(`/admin/api/${active}/${deleteId}`, { method: "DELETE" });
      if (active === "events") showPushToast();
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }
  if (deleteNoticeId) {
    try {
      await request(`/admin/notices/${deleteNoticeId}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }
});

content.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  if (event.target.id === "notice-form") {
    const notice = {
      from_office: form.get("from_office")?.trim(),
      message: form.get("message")?.trim(),
      priority: form.get("priority")?.trim(),
      title: form.get("title")?.trim()
    };
    try {
      await request("/admin/notices", { body: JSON.stringify(notice), method: "POST" });
      showPushToast();
      await load();
    } catch (error) {
      setStatus(error.message);
    }
    return;
  }
  const item = {};
  for (const field of modules[active]) {
    if (field === "image_data") {
      const file = form.get("image_file");
      item[field] = file && file.size > 0 ? await fileToBase64(file) : parseField(field, form.get(field) ?? "");
    } else {
      item[field] = parseField(field, form.get(field) ?? "");
    }
  }
  try {
    await request(`/admin/api/${active}`, { body: JSON.stringify(item), method: "POST" });
    if (["events", "archive", "winners"].includes(active)) showPushToast();
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
