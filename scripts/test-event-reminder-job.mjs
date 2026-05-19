import assert from "node:assert/strict";
import eventReminderJob from "../server/jobs/eventReminder.js";

const { runEventReminderJob } = eventReminderJob;

const now = Date.parse("2026-05-19T10:00:00+05:30");
const store = {
  events: [
    {
      id: "soon-event",
      name: "Soon Event",
      startsAt: "2026-05-19T10:59:00+05:30",
      published: true,
      reminderSent: false
    },
    {
      id: "later-event",
      name: "Later Event",
      startsAt: "2026-05-19T12:30:00+05:30",
      published: true,
      reminderSent: false
    },
    {
      id: "already-reminded",
      name: "Already Reminded",
      startsAt: "2026-05-19T10:45:00+05:30",
      published: true,
      reminderSent: true
    }
  ]
};

const sent = [];
let writes = 0;
const realNow = Date.now;
Date.now = () => now;

try {
  await runEventReminderJob({
    readStore: async () => store,
    sendReminderNotification: async (_store, event) => sent.push(event.id),
    writeStore: async () => {
      writes += 1;
    }
  });
} finally {
  Date.now = realNow;
}

assert.deepEqual(sent, ["soon-event"]);
assert.equal(store.events[0].reminderSent, true);
assert.equal(store.events[1].reminderSent, false);
assert.equal(store.events[2].reminderSent, true);
assert.equal(writes, 1);

console.log("Event reminder job tests passed.");
