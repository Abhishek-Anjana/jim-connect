function publicNotice(notice) {
  return {
    created_at: notice.created_at,
    from_office: notice.from_office,
    id: notice.id,
    message: notice.message,
    priority: notice.priority,
    title: notice.title
  };
}

function validateNotice(body) {
  const errors = [];
  for (const field of ["title", "message", "from_office"]) {
    if (typeof body[field] !== "string" || body[field].trim().length === 0) {
      errors.push(`${field} is required`);
    }
  }
  if (!["Normal", "Important", "Urgent"].includes(body.priority ?? "Normal")) {
    errors.push("priority must be Normal, Important, or Urgent");
  }
  return errors;
}

async function handleNoticeRoute({
  audit,
  canWrite,
  path,
  readBody,
  req,
  requireAdmin,
  res,
  send,
  sendPushNotification,
  store,
  writeStore
}) {
  if (req.method === "GET" && path === "/notices") {
    send(
      res,
      200,
      (store.notices ?? [])
        .filter((notice) => notice.is_active !== false)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(publicNotice)
    );
    return true;
  }

  if (path === "/admin/notices" && req.method === "POST") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    if (!canWrite(admin, "notices")) {
      send(res, 403, { error: "This role cannot modify this module" });
      return true;
    }

    const body = await readBody(req);
    const errors = validateNotice(body);
    if (errors.length > 0) {
      send(res, 400, { errors });
      return true;
    }

    const notice = {
      created_at: new Date().toISOString(),
      from_office: body.from_office.trim(),
      id: body.id ?? `notice-${Date.now()}`,
      is_active: true,
      message: body.message.trim(),
      priority: body.priority ?? "Normal",
      title: body.title.trim()
    };

    store.notices ??= [];
    store.notices.unshift(notice);
    audit(store, "notice_created", "notices", notice.id, admin.email ?? admin.name);
    await sendPushNotification(store, {
      body: notice.title,
      data: { noticeId: notice.id, screen: "Notices" },
      sound: "default",
      title: `📢 Notice from ${notice.from_office}`
    });
    await writeStore(store);
    send(res, 200, publicNotice(notice));
    return true;
  }

  const noticeIdMatch = path.match(/^\/admin\/notices\/([^/]+)$/);
  if (noticeIdMatch && ["DELETE", "PATCH"].includes(req.method)) {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    if (!canWrite(admin, "notices")) {
      send(res, 403, { error: "This role cannot modify this module" });
      return true;
    }

    const [, id] = noticeIdMatch;
    const notice = (store.notices ?? []).find((entry) => entry.id === id);
    if (!notice) {
      send(res, 404, { error: "Notice not found" });
      return true;
    }

    if (req.method === "DELETE") {
      notice.is_active = false;
      audit(store, "notice_deleted", "notices", id, admin.email ?? admin.name);
      await writeStore(store);
      send(res, 200, { message: "Notice deleted", ok: true });
      return true;
    }

    const body = await readBody(req);
    notice.is_active = typeof body.is_active === "boolean" ? body.is_active : !notice.is_active;
    await writeStore(store);
    send(res, 200, publicNotice(notice));
    return true;
  }

  return false;
}

module.exports = {
  handleNoticeRoute
};
