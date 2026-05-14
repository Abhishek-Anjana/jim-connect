export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getEventTimingLabel(startsAt: string, endsAt: string, now = new Date()) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (now >= start && now <= end) {
    return "Happening now";
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntil = Math.round((startOfDay(start).getTime() - startOfDay(now).getTime()) / dayMs);

  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil > 1) return `In ${daysUntil} days`;
  return "Event ended";
}
