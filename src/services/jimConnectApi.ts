import { archiveEntries, notices, upcomingEvents, winners } from "../data/content";
import { config } from "../config/env";
import { sortArchiveEntries, sortUpcomingEvents, sortWinners } from "../utils/content";
import { isValidArchiveEntry, isValidEvent, isValidNotice, isValidWinner, validateArray } from "./contentGuards";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  if (!config.apiBaseUrl) {
    await delay(250);
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.apiTimeoutMs);

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getUpcomingEvents() {
  const response = await fetchJson<unknown>("/events/upcoming", upcomingEvents);
  return sortUpcomingEvents(validateArray(response, isValidEvent, "upcoming events"));
}

export async function getArchiveEntries() {
  const response = await fetchJson<unknown>("/archive", archiveEntries);
  return sortArchiveEntries(validateArray(response, isValidArchiveEntry, "archive entries"));
}

export async function getWinners() {
  const response = await fetchJson<unknown>("/hall-of-fame", winners);
  return sortWinners(validateArray(response, isValidWinner, "hall of fame"));
}

export async function getNotices() {
  const response = await fetchJson<unknown>("/notices", notices);
  return validateArray(response, isValidNotice, "notices").sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
