import { ArchiveEntry, Event, Notice, Winner } from "../data/content";
import { isGoogleDriveUrl } from "../utils/links";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].trim().length > 0;
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hasOptionalHttpsUrl(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || (typeof value[key] === "string" && isHttpsUrl(value[key]));
}

function hasOptionalString(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === "string";
}

function hasUniqueIds(items: Array<{ id: string }>, label: string) {
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) {
    throw new Error(`Duplicate ${label} ids`);
  }
}

export function isValidEvent(value: unknown): value is Event {
  if (!isRecord(value)) return false;
  if (
    !hasString(value, "id") ||
    !hasString(value, "name") ||
    !hasString(value, "startsAt") ||
    !hasString(value, "endsAt") ||
    !hasString(value, "venue") ||
    !hasString(value, "club") ||
    !hasString(value, "description")
  ) {
    return false;
  }

  const startsAt = value.startsAt;
  const endsAt = value.endsAt;

  return (
    Array.isArray(value.speakers) &&
    value.speakers.every((speaker) => typeof speaker === "string") &&
    Array.isArray(value.attachments) &&
    value.attachments.every((attachment) => typeof attachment === "string") &&
    typeof startsAt === "string" &&
    typeof endsAt === "string" &&
    !Number.isNaN(Date.parse(startsAt)) &&
    !Number.isNaN(Date.parse(endsAt)) &&
    new Date(endsAt) > new Date(startsAt) &&
    ((typeof value.image === "string" && isHttpsUrl(value.image)) ||
      (typeof value.image_data === "string" && value.image_data.trim().length > 0)) &&
    hasOptionalHttpsUrl(value, "registration_link")
  );
}

export function isValidNotice(value: unknown): value is Notice {
  if (!isRecord(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "title") &&
    hasString(value, "message") &&
    hasString(value, "from_office") &&
    typeof value.priority === "string" &&
    ["Normal", "Important", "Urgent"].includes(value.priority) &&
    typeof value.created_at === "string" &&
    !Number.isNaN(Date.parse(value.created_at)) &&
    typeof value.is_active === "boolean"
  );
}

export function isValidArchiveEntry(value: unknown): value is ArchiveEntry {
  if (!isRecord(value)) return false;
  const summary = value.summary;
  const date = value.date;
  const driveUrl = value.driveUrl;

  return (
    hasString(value, "id") &&
    hasString(value, "eventId") &&
    hasString(value, "name") &&
    hasString(value, "date") &&
    hasString(value, "club") &&
    hasString(value, "year") &&
    hasString(value, "summary") &&
    hasString(value, "driveUrl") &&
    typeof summary === "string" &&
    typeof date === "string" &&
    typeof driveUrl === "string" &&
    ((typeof value.image === "string" && isHttpsUrl(value.image)) ||
      (typeof value.image_data === "string" && value.image_data.trim().length > 0)) &&
    summary.trim().split(/\s+/).length >= 100 &&
    !Number.isNaN(Date.parse(date)) &&
    isGoogleDriveUrl(driveUrl)
  );
}

export function isValidWinner(value: unknown): value is Winner {
  if (!isRecord(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "batch") &&
    hasString(value, "award") &&
    hasString(value, "club") &&
    hasOptionalString(value, "category") &&
    hasOptionalString(value, "eventName") &&
    hasOptionalString(value, "archiveId") &&
    (value.portrait === undefined || value.portrait === "" || (typeof value.portrait === "string" && isHttpsUrl(value.portrait))) &&
    (value.image_data === undefined || typeof value.image_data === "string") &&
    typeof value.champion === "boolean"
  );
}

export function validateArray<T>(value: unknown, guard: (item: unknown) => item is T, label: string) {
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new Error(`Invalid ${label} response`);
  }

  return value;
}

export function assertContentRelations(events: Event[], archive: ArchiveEntry[], winners: Winner[]) {
  hasUniqueIds(events, "event");
  hasUniqueIds(archive, "archive");
  hasUniqueIds(winners, "winner");

  const archiveById = new Map(archive.map((entry) => [entry.id, entry]));
  for (const winner of winners) {
    if (!winner.archiveId || !winner.eventName) continue;
    const linkedArchive = archiveById.get(winner.archiveId);
    if (!linkedArchive) {
      throw new Error(`${winner.name} links to missing archive ${winner.archiveId}`);
    }
    if (linkedArchive.name !== winner.eventName) {
      throw new Error(`${winner.name} event does not match linked archive`);
    }
  }
}
