import { ArchiveEntry, Event, Notice, Winner } from "../data/content";
import { config } from "../config/env";
import { sortArchiveEntries, sortUpcomingEvents, sortWinners } from "../utils/content";
import { isValidArchiveEntry, isValidEvent, isValidNotice, isValidWinner, validateArray } from "./contentGuards";

async function fetchJson<T>(path: string): Promise<T> {
  if (!config.apiBaseUrl) {
    throw new Error("API base URL is missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.apiTimeoutMs);
  const separator = path.includes("?") ? "&" : "?";
  const apiUrl = `${config.apiBaseUrl}${path}`;
  const url = `${config.apiBaseUrl}${path}${separator}_=${Date.now()}`;

  try {
    console.log("Fetching from:", apiUrl);
    const response = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = (await response.json()) as T;
    console.log("Response received:", JSON.stringify(data));
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getUpcomingEvents() {
  const response = await fetchJson<unknown>("/events/upcoming");
  return sortUpcomingEvents(validateArray(response, isValidEvent, "upcoming events"));
}

export async function getArchiveEntries() {
  const response = await fetchJson<unknown>("/archive");
  return sortArchiveEntries(validateArray(response, isValidArchiveEntry, "archive entries"));
}

export async function getWinners() {
  const response = await fetchJson<unknown>("/hall-of-fame");
  return sortWinners(validateArray(response, isValidWinner, "hall of fame"));
}

export async function getNotices() {
  const response = await fetchJson<unknown>("/notices");
  return validateArray(response, isValidNotice, "notices").sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
