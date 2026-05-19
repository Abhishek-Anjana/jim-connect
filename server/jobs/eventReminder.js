const FIVE_MINUTES_MS = 5 * 60 * 1000;
const REMINDER_WINDOW_MS = 65 * 60 * 1000;

async function runEventReminderJob({ readStore, writeStore, sendReminderNotification, logger = console }) {
  const store = await readStore();
  const now = Date.now();
  const windowEnd = now + REMINDER_WINDOW_MS;
  let changed = false;

  for (const event of store.events ?? []) {
    const startsAt = Date.parse(event.startsAt);
    if (!event.published || event.reminderSent === true || Number.isNaN(startsAt)) continue;
    if (startsAt < now || startsAt > windowEnd) continue;

    try {
      await sendReminderNotification(store, event);
      event.reminderSent = true;
      changed = true;
    } catch (error) {
      logger.error?.("Event reminder notification failed", error);
    }
  }

  if (changed) {
    await writeStore(store);
  }
}

function startEventReminderJob(options) {
  const intervalMs = options.intervalMs ?? FIVE_MINUTES_MS;
  const timer = setInterval(() => {
    runEventReminderJob(options).catch((error) => {
      options.logger?.error?.("Event reminder job failed", error);
    });
  }, intervalMs);
  timer.unref?.();
  return timer;
}

module.exports = {
  runEventReminderJob,
  startEventReminderJob
};
