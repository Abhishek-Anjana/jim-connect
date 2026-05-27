const modules = {
  admins: ["id", "name", "email", "role", "active", "token"],
  archive: ["id", "eventId", "name", "date", "club", "year", "image_data", "summary", "driveUrl"],
  events: ["id", "name", "startsAt", "endsAt", "venue", "club", "registration_link", "image_data", "description", "speakers", "attachments", "published"],
  winners: ["id", "name", "batch", "award", "category", "club", "eventName", "archiveId", "image_data", "champion"]
};

const clubGroups = {
  Clubs: ["Marketing Club", "Finance Club", "Human Resource Club", "Business Analytics Club", "Operations Management Club", "General Management Club"],
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

const awardOptions = [
  "Best Performer",
  "Champion of the Year",
  "Leadership Excellence",
  "Academic Excellence",
  "Cultural Excellence",
  "Sports Excellence",
  "Social Impact",
  "Innovation Award",
  "Best Club President",
  "Dean's Award"
];
const batchOptions = ["2024-26", "2025-27", "2026-28"];
const noticeOffices = ["Dean Academics", "PGP Office", "Student Affairs", "Director's Office", "Placement Cell"];
const noticePriorities = ["Normal", "Important", "Urgent"];
const requiredFields = {
  archive: ["name", "date", "club", "summary"],
  events: ["name", "startsAt", "club"],
  notices: ["title", "message", "from_office"],
  winners: ["name", "batch", "award", "club"]
};

const API_BASE_URL = "https://jim-connect-production.up.railway.app";
const apiBaseUrl = API_BASE_URL;
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
  return { "Content-Type": "application/json", "X-Admin-Token": token.value };
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers: { ...headers(), ...(options.headers ?? {}) } });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.errors?.join("; ") ?? payload?.error ?? text);
  return payload;
}

function setStatus(message) {
  status.textContent = message;
}

function showSuccessToast(item = "Item") {
  toast.textContent = `✅ ${item} saved successfully and students notified!`;
  toast.hidden = false;
  toast.classList.add("show");
  window.clearTimeout(showSuccessToast.timer);
  showSuccessToast.timer = window.setTimeout(() => {
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function readableDateTime(value) {
  if (!value) return "Select date/time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Select date/time";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", hour: "numeric", minute: "2-digit", month: "short", weekday: "short", year: "numeric" }).format(date);
}

function readableDate(value) {
  if (!value) return "Select date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Select date";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", weekday: "short", year: "numeric" }).format(date);
}

function selectOptions(options, selected) {
  return options.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function clubOptions(selected) {
  return Object.entries(clubGroups)
    .map(([group, options]) => `<optgroup label="${escapeHtml(group)}">${selectOptions(options, selected)}</optgroup>`)
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

function imageUploadField({ field, label, value, circular = false }) {
  const preview = value
    ? `<img class="preview-image ${circular ? "portrait-preview" : ""}" data-preview-for="${field}" src="data:image/jpeg;base64,${value}" alt="${escapeHtml(label)} preview" />`
    : `<img class="preview-image ${circular ? "portrait-preview" : ""}" data-preview-for="${field}" alt="${escapeHtml(label)} preview" hidden />`;
  return `<label>${label}<input name="${field}_file" data-image-target="${field}" type="file" accept="image/*" /><input name="${field}" type="hidden" value="${escapeHtml(value)}" />${preview}</label>`;
}

function emptyFor(module) {
  const item = {};
  for (const field of modules[module]) item[field] = "";
  if (module === "events") Object.assign(item, { id: `event-${Date.now()}`, published: false, speakers: [], attachments: [] });
  if (module === "archive") item.id = `archive-${Date.now()}`;
  if (module === "winners") Object.assign(item, { id: `winner-${Date.now()}`, batch: "2025-27", award: "Champion of the Year", champion: false });
  if (module === "admins") Object.assign(item, { id: `admin-${Date.now()}`, active: true, role: "Content Manager" });
  return item;
}

function fieldHtml(module, field, item) {
  const value = valueFor(field, item[field]);
  if ((module === "events" && ["startsAt", "endsAt"].includes(field)) || (module === "archive" && field === "date")) {
    return `<label>${field}<input name="${field}" type="datetime-local" value="${toDatetimeLocal(value)}" /></label>`;
  }
  if (["events", "archive", "winners"].includes(module) && field === "club") {
    return `<label>Club / Committee<select name="${field}">${clubOptions(value)}</select></label>`;
  }
  if (module === "events" && field === "registration_link") {
    return `<label>Registration Link<input name="${field}" type="url" placeholder="https://forms.gle/..." value="${escapeHtml(value)}" /></label>`;
  }
  if (["events", "archive"].includes(module) && field === "image_data") {
    return imageUploadField({ field, label: module === "events" ? "Event Image" : "Archive Image", value });
  }
  if (module === "winners" && field === "image_data") {
    return imageUploadField({ field, label: "Portrait Photo", value, circular: true });
  }
  if (module === "winners" && field === "batch") {
    return `<label>Batch<select name="${field}">${selectOptions(batchOptions, value)}</select></label>`;
  }
  if (module === "winners" && field === "award") {
    return `<label>Award Category<select name="${field}">${selectOptions(awardOptions, value)}</select></label>`;
  }
  if (module === "winners" && field === "eventName") {
    return `<label>Linked Archive Event<input name="${field}" value="${escapeHtml(value)}" /></label>`;
  }
  if (["description", "summary", "speakers", "attachments"].includes(field)) {
    return `<label>${field}<textarea name="${field}">${escapeHtml(value)}</textarea></label>`;
  }
  if (field === "role") {
    return `<label>${field}<select name="${field}">${selectOptions(["Super Admin", "Content Manager", "Read-Only Viewer"], value)}</select></label>`;
  }
  if (["published", "champion", "active"].includes(field)) {
    return `<label>${field}<select name="${field}"><option value="false" ${!item[field] ? "selected" : ""}>false</option><option value="true" ${item[field] ? "selected" : ""}>true</option></select></label>`;
  }
  return `<label>${field}<input name="${field}" ${field === "token" ? 'type="password"' : ""} value="${escapeHtml(value)}" /></label>`;
}

function renderForm(module, item = emptyFor(module)) {
  return `
    <form class="panel form-grid" id="edit-form">
      <h2>${item.id ? "Edit" : "Create"} ${module}</h2>
      ${modules[module].map((field) => fieldHtml(module, field, item)).join("")}
      ${module === "events" ? `<p class="meta date-preview" id="event-date-preview">${readableDateTime(item.startsAt)} to ${readableDateTime(item.endsAt)}</p>` : ""}
      ${module === "archive" ? `<p class="meta date-preview" id="archive-date-preview">${readableDate(item.date)}</p>` : ""}
      <button class="primary" type="submit">Save</button>
    </form>
  `;
}

function bindFilePreviews(scope = content) {
  scope.querySelectorAll("input[type='file'][data-image-target]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      const preview = scope.querySelector(`[data-preview-for="${input.dataset.imageTarget}"]`);
      if (!file || !preview) return;
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    });
  });
}

function bindFormEnhancements() {
  const form = content.querySelector("#edit-form");
  if (!form) return;
  const eventPreview = content.querySelector("#event-date-preview");
  if (eventPreview) {
    const update = () => {
      eventPreview.textContent = `${readableDateTime(form.elements.startsAt?.value)} to ${readableDateTime(form.elements.endsAt?.value)}`;
    };
    form.elements.startsAt?.addEventListener("input", update);
    form.elements.endsAt?.addEventListener("input", update);
  }
  const archivePreview = content.querySelector("#archive-date-preview");
  if (archivePreview) {
    form.elements.date?.addEventListener("input", () => {
      archivePreview.textContent = readableDate(form.elements.date?.value);
    });
  }
  bindFilePreviews(form);
}

function clearValidation(form) {
  form.querySelectorAll(".field-error").forEach((node) => node.remove());
  form.querySelectorAll(".invalid").forEach((node) => node.classList.remove("invalid"));
}

function validateForm(module, form) {
  clearValidation(form);
  const missing = [];
  for (const field of requiredFields[module] ?? []) {
    const control = form.elements[field];
    if (!control || !String(control.value ?? "").trim()) missing.push(field);
  }
  for (const field of missing) {
    const control = form.elements[field];
    control?.classList.add("invalid");
    control?.closest("label")?.insertAdjacentHTML("beforeend", `<span class="field-error">${field} is required</span>`);
  }
  return missing.length === 0;
}

function card(module, item) {
  const title = item.name ?? item.title ?? item.id;
  const subtitle = module === "events" ? `${item.startsAt} | ${item.venue}` : module === "archive" ? `${item.date} | ${item.club}` : module === "admins" ? `${item.email} | ${item.role} | ${item.active ? "active" : "inactive"}` : `${item.batch} | ${item.award}`;
  return `
    <article class="card">
      <h3>${escapeHtml(title)}</h3>
      <p class="meta">${escapeHtml(subtitle)}</p>
      <div class="row">${canWrite(module) ? `<button data-edit="${item.id}">Edit</button><button class="danger" data-delete="${item.id}">Delete</button>` : ""}</div>
    </article>
  `;
}

function renderModule(module) {
  content.innerHTML = `
    <div class="grid">
      ${canWrite(module) ? renderForm(module) : `<section class="panel"><h2>Read-only access</h2><p class="meta">Your role can view this module but cannot make changes.</p></section>`}
      <section class="list">${(store[module] ?? []).map((item) => card(module, item)).join("")}</section>
    </div>
  `;
  bindFormEnhancements();
}

function noticePreviewHtml(values = {}) {
  const priority = values.priority ?? "Normal";
  return `
    <article class="card notice-card notice-${String(priority).toLowerCase()}" id="notice-preview-card">
      <p class="meta">${escapeHtml(values.from_office ?? "From office")}</p>
      <h3>${escapeHtml(values.title ?? "Notice title")}</h3>
      <p>${escapeHtml(values.message ?? "Notice message preview")}</p>
    </article>
  `;
}

function bindNoticePreview() {
  const form = content.querySelector("#notice-form");
  const preview = content.querySelector("#notice-preview");
  if (!form || !preview) return;
  const update = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    form.classList.remove("priority-normal", "priority-important", "priority-urgent");
    form.classList.add(`priority-${String(values.priority ?? "Normal").toLowerCase()}`);
    preview.innerHTML = noticePreviewHtml(values);
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
}

function renderNotices() {
  content.innerHTML = `
    <div class="grid">
      ${canWrite("notices") ? `
        <form class="panel form-grid" id="notice-form">
          <h2>Create Dean's Notice</h2>
          <label>Title<input name="title" required /></label>
          <label>Message<textarea name="message" required></textarea></label>
          <label>From<select name="from_office">${selectOptions(noticeOffices, "Dean Academics")}</select></label>
          <label>Priority<select name="priority">${selectOptions(noticePriorities, "Normal")}</select></label>
          <div id="notice-preview"></div>
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
  bindNoticePreview();
}

function renderAudit() {
  content.innerHTML = `<section class="list">${(store.auditLog ?? []).map((entry) => `<article class="card"><h3>${escapeHtml(entry.action)} ${escapeHtml(entry.module)}</h3><p class="meta">${escapeHtml(entry.timestamp)} | ${escapeHtml(entry.user)} | ${escapeHtml(entry.idRef)}</p></article>`).join("")}</section>`;
}

function renderDashboard() {
  const publishedEvents = (store.events ?? []).filter((event) => event.published).length;
  const draftEvents = (store.events ?? []).filter((event) => !event.published).length;
  const activeAdmins = (store.admins ?? []).filter((admin) => admin.active).length;
  const today = new Date().toDateString();
  const notificationsToday = (store.notifications ?? []).filter((entry) => new Date(entry.sentAt).toDateString() === today).length;
  content.innerHTML = `
    <section class="stats">
      <article class="card"><h3>${escapeHtml(store.currentAdmin?.role ?? "Admin")}</h3><p class="meta">${escapeHtml(store.currentAdmin?.email ?? "")}</p></article>
      <article class="card"><h3>${publishedEvents}</h3><p class="meta">Published events</p></article>
      <article class="card"><h3>${draftEvents}</h3><p class="meta">Draft events</p></article>
      <article class="card"><h3>${store.archive?.length ?? 0}</h3><p class="meta">Archive entries</p></article>
      <article class="card"><h3>${store.winners?.length ?? 0}</h3><p class="meta">Hall of Fame profiles</p></article>
      <article class="card"><h3>${store.pushTokens?.length ?? 0}</h3><p class="meta">Registered push tokens</p></article>
      <article class="card"><h3>${notificationsToday}</h3><p class="meta">Notifications Sent Today</p></article>
      <article class="card"><h3>${activeAdmins}</h3><p class="meta">Active admin users</p></article>
    </section>
    <section class="panel"><h2>Recent Activity</h2><div class="list">${(store.auditLog ?? []).slice(0, 5).map((entry) => `<article class="card"><h3>${escapeHtml(entry.action)} ${escapeHtml(entry.module)}</h3><p class="meta">${escapeHtml(entry.timestamp)} | ${escapeHtml(entry.idRef)}</p></article>`).join("") || `<p class="meta">No admin activity yet.</p>`}</div></section>
  `;
}

function renderNotifications() {
  content.innerHTML = `<section class="list">${(store.notifications ?? []).map((entry) => `<article class="card"><h3>${escapeHtml(entry.payload?.title ?? "Notification")}</h3><p>${escapeHtml(entry.payload?.body ?? "")}</p><p class="meta">${escapeHtml(entry.sentAt)} | ${escapeHtml(entry.status)} | ${entry.tokenCount} tokens</p>${entry.error ? `<p class="error">${escapeHtml(entry.error)}</p>` : ""}</article>`).join("") || `<article class="card"><h3>No notifications yet</h3><p class="meta">Publishing content will record dispatches here.</p></article>`}</section>`;
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
    bindFormEnhancements();
  }
  if (deleteId) {
    try {
      await request(`/admin/api/${active}/${deleteId}`, { method: "DELETE" });
      if (active === "events") showSuccessToast("Event");
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
    if (!validateForm("notices", event.target)) return;
    const notice = {
      from_office: form.get("from_office")?.trim(),
      message: form.get("message")?.trim(),
      priority: form.get("priority")?.trim(),
      title: form.get("title")?.trim()
    };
    try {
      await request("/admin/notices", { body: JSON.stringify(notice), method: "POST" });
      showSuccessToast("Notice");
      await load();
    } catch (error) {
      setStatus(error.message);
    }
    return;
  }
  if (!validateForm(active, event.target)) return;
  const item = {};
  for (const field of modules[active]) {
    if (field === "image_data") {
      const file = form.get("image_data_file");
      item[field] = file && file.size > 0 ? await fileToBase64(file) : parseField(field, form.get(field) ?? "");
    } else {
      item[field] = parseField(field, form.get(field) ?? "");
    }
  }
  try {
    await request(`/admin/api/${active}`, { body: JSON.stringify(item), method: "POST" });
    if (["events", "archive", "winners"].includes(active)) {
      showSuccessToast(active === "winners" ? "Hall of Fame profile" : active.slice(0, 1).toUpperCase() + active.slice(1));
    }
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
