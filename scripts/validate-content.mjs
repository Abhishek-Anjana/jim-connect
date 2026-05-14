import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = resolve(root, "src/data/content.ts");
const source = await readFile(contentPath, "utf8");

function extractArray(name) {
  const startToken = `export const ${name}`;
  const start = source.indexOf(startToken);
  if (start === -1) throw new Error(`Missing ${name}`);

  const assignment = source.indexOf("=", start);
  const bracketStart = source.indexOf("[", assignment);
  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let i = bracketStart; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) return source.slice(bracketStart, i + 1);
  }

  throw new Error(`Could not parse ${name}`);
}

function toJson(text) {
  return text
    .replace(/([,{]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, "$1");
}

const upcomingEvents = JSON.parse(toJson(extractArray("upcomingEvents")));
const archiveEntries = JSON.parse(toJson(extractArray("archiveEntries")));
const winners = JSON.parse(toJson(extractArray("winners")));

const errors = [];
const archiveIds = new Set(archiveEntries.map((entry) => entry.id));
const eventIds = new Set(upcomingEvents.map((event) => event.id));
const winnerIds = new Set(winners.map((winner) => winner.id));

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isGoogleDriveUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("drive.google.com");
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

if (eventIds.size !== upcomingEvents.length) {
  errors.push("Upcoming events must have unique ids.");
}

if (archiveIds.size !== archiveEntries.length) {
  errors.push("Archive entries must have unique ids.");
}

if (winnerIds.size !== winners.length) {
  errors.push("Winners must have unique ids.");
}

for (const event of upcomingEvents) {
  if (Number.isNaN(Date.parse(event.startsAt)) || Number.isNaN(Date.parse(event.endsAt))) {
    errors.push(`${event.name} has an invalid start or end date.`);
  }
  if (new Date(event.endsAt) <= new Date(event.startsAt)) {
    errors.push(`${event.name} must end after it starts.`);
  }
  if (!isHttpsUrl(event.image)) {
    errors.push(`${event.name} needs an HTTPS banner image URL.`);
  }
}

for (const entry of archiveEntries) {
  if (wordCount(entry.summary) < 100) {
    errors.push(`${entry.name} archive summary is below 100 words.`);
  }
  if (!isGoogleDriveUrl(entry.driveUrl)) {
    errors.push(`${entry.name} needs a valid https://drive.google.com photo repository URL.`);
  }
  if (!isHttpsUrl(entry.image)) {
    errors.push(`${entry.name} needs an HTTPS archive image URL.`);
  }
}

for (const winner of winners) {
  if (!archiveIds.has(winner.archiveId)) {
    errors.push(`${winner.name} links to missing archive id ${winner.archiveId}.`);
    continue;
  }
  const archive = archiveEntries.find((entry) => entry.id === winner.archiveId);
  if (archive && archive.name !== winner.eventName) {
    errors.push(`${winner.name} winner event "${winner.eventName}" does not match archive "${archive.name}".`);
  }
  if (!isHttpsUrl(winner.portrait)) {
    errors.push(`${winner.name} needs an HTTPS portrait image URL.`);
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Content validation passed: ${upcomingEvents.length} events, ${archiveEntries.length} archive entries, ${winners.length} winners.`
);
