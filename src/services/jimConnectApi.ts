import { sortArchiveEntries, sortUpcomingEvents, sortWinners } from "../utils/content";
import { isValidArchiveEntry, isValidEvent, isValidNotice, isValidWinner, validateArray } from "./contentGuards";

const noCacheHeaders = {
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
};

async function parseResponse(response: Response, label: string) {
  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log("Response received:", JSON.stringify(data));
  return data;
}

export async function getUpcomingEvents() {
  console.log("Fetching from:", "https://jim-connect-production.up.railway.app/events/upcoming");
  const response = await fetch("https://jim-connect-production.up.railway.app/events/upcoming", {
    headers: noCacheHeaders
  });
  const data = await parseResponse(response, "Events");
  return sortUpcomingEvents(validateArray(data, isValidEvent, "upcoming events"));
}

export async function getArchiveEntries() {
  console.log("Fetching from:", "https://jim-connect-production.up.railway.app/archive");
  const response = await fetch("https://jim-connect-production.up.railway.app/archive", {
    headers: noCacheHeaders
  });
  const data = await parseResponse(response, "Archive");
  return sortArchiveEntries(validateArray(data, isValidArchiveEntry, "archive entries"));
}

export async function getWinners() {
  console.log("Fetching from:", "https://jim-connect-production.up.railway.app/hall-of-fame");
  const response = await fetch("https://jim-connect-production.up.railway.app/hall-of-fame", {
    headers: noCacheHeaders
  });
  const data = await parseResponse(response, "Hall of Fame");
  return sortWinners(validateArray(data, isValidWinner, "hall of fame"));
}

export async function getNotices() {
  console.log("Fetching from:", "https://jim-connect-production.up.railway.app/notices");
  const response = await fetch("https://jim-connect-production.up.railway.app/notices", {
    headers: noCacheHeaders
  });
  const data = await parseResponse(response, "Notices");
  return validateArray(data, isValidNotice, "notices").sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
