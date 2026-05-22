import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArchiveEntry, Event, Notice, Winner, archiveEntries, notices, upcomingEvents, winners } from "../data/content";
import { getArchiveEntries, getNotices, getUpcomingEvents, getWinners } from "../services/jimConnectApi";
import {
  assertContentRelations,
  isValidArchiveEntry,
  isValidEvent,
  isValidNotice,
  isValidWinner,
  validateArray
} from "../services/contentGuards";

type CachedContent = {
  archive: ArchiveEntry[];
  events: Event[];
  fame: Winner[];
  notices: Notice[];
  savedAt: string;
};

const CACHE_KEY = "jim-connect-content-v1";

export function parseCachedContentForTest(value: string): CachedContent {
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid cache payload");
  }

  const record = parsed as Record<string, unknown>;
  const cachedEvents = validateArray(record.events, isValidEvent, "cached events");
  const cachedArchive = validateArray(record.archive, isValidArchiveEntry, "cached archive entries");
  const cachedFame = validateArray(record.fame, isValidWinner, "cached hall of fame");
  const cachedNotices = record.notices === undefined ? notices : validateArray(record.notices, isValidNotice, "cached notices");

  if (typeof record.savedAt !== "string" || Number.isNaN(Date.parse(record.savedAt))) {
    throw new Error("Invalid cache timestamp");
  }

  assertContentRelations(cachedEvents, cachedArchive, cachedFame);

  return {
    archive: cachedArchive,
    events: cachedEvents,
    fame: cachedFame,
    notices: cachedNotices,
    savedAt: record.savedAt
  };
}

export function useJimConnectContent() {
  const [events, setEvents] = useState<Event[]>(upcomingEvents);
  const [archive, setArchive] = useState<ArchiveEntry[]>(archiveEntries);
  const [fame, setFame] = useState<Winner[]>(winners);
  const [noticeItems, setNoticeItems] = useState<Notice[]>(notices);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const hydrateCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return;

      const parsed = parseCachedContentForTest(cached);
      setEvents(parsed.events);
      setArchive(parsed.archive);
      setFame(parsed.fame);
      setNoticeItems(parsed.notices);
      setLastUpdated(parsed.savedAt);
    } catch {
      await AsyncStorage.removeItem(CACHE_KEY);
    }
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [nextEvents, nextArchive, nextFame, nextNotices] = await Promise.all([
        getUpcomingEvents(),
        getArchiveEntries(),
        getWinners(),
        getNotices()
      ]);
      assertContentRelations(nextEvents, nextArchive, nextFame);
      setEvents(nextEvents);
      setArchive(nextArchive);
      setFame(nextFame);
      setNoticeItems(nextNotices);
      const savedAt = new Date().toISOString();
      setLastUpdated(savedAt);
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          archive: nextArchive,
          events: nextEvents,
          fame: nextFame,
          notices: nextNotices,
          savedAt
        } satisfies CachedContent)
      );
    } catch {
      setError("Showing cached campus content");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        await hydrateCache();
      } finally {
        await load();
      }
    }

    void boot();
  }, [hydrateCache, load]);

  return {
    archive,
    error,
    events,
    fame,
    lastUpdated,
    loading,
    notices: noticeItems,
    refresh: () => load(true),
    refreshing
  };
}
