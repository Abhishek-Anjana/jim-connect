import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArchiveEntry, Event, Notice, Winner } from "../data/content";
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
const CACHE_MAX_AGE_MS = 60 * 1000;

export function parseCachedContentForTest(value: string): CachedContent {
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid cache payload");
  }

  const record = parsed as Record<string, unknown>;
  const cachedEvents = validateArray(record.events, isValidEvent, "cached events");
  const cachedArchive = validateArray(record.archive, isValidArchiveEntry, "cached archive entries");
  const cachedFame = validateArray(record.fame, isValidWinner, "cached hall of fame");
  const cachedNotices = record.notices === undefined ? [] : validateArray(record.notices, isValidNotice, "cached notices");

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
  const [events, setEvents] = useState<Event[]>([]);
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [fame, setFame] = useState<Winner[]>([]);
  const [noticeItems, setNoticeItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [eventsResult, archiveResult, fameResult, noticesResult] = await Promise.allSettled([
        getUpcomingEvents(),
        getArchiveEntries(),
        getWinners(),
        getNotices()
      ]);

      const nextEvents = eventsResult.status === "fulfilled" ? eventsResult.value : events;
      const nextArchive = archiveResult.status === "fulfilled" ? archiveResult.value : archive;
      const nextFame = fameResult.status === "fulfilled" ? fameResult.value : fame;
      const nextNotices = noticesResult.status === "fulfilled" ? noticesResult.value : noticeItems;

      if (eventsResult.status === "rejected") console.log("Events fetch failed:", eventsResult.reason);
      if (archiveResult.status === "rejected") console.log("Archive fetch failed:", archiveResult.reason);
      if (fameResult.status === "rejected") console.log("Hall of Fame fetch failed:", fameResult.reason);
      if (noticesResult.status === "rejected") console.log("Notices fetch failed:", noticesResult.reason);

      if (eventsResult.status === "rejected" && archiveResult.status === "rejected" && fameResult.status === "rejected" && noticesResult.status === "rejected") {
        throw new Error("All content requests failed");
      }

      try {
        assertContentRelations(nextEvents, nextArchive, nextFame);
      } catch (relationError) {
        console.log("Content relation warning:", relationError);
      }

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
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cached) throw new Error("No cached content");
        const parsed = parseCachedContentForTest(cached);
        const age = Date.now() - new Date(parsed.savedAt).getTime();
        if (age > CACHE_MAX_AGE_MS) throw new Error("Cached content expired");
        setEvents(parsed.events);
        setArchive(parsed.archive);
        setFame(parsed.fame);
        setNoticeItems(parsed.notices);
        setLastUpdated(parsed.savedAt);
        setError("Showing latest saved campus content");
      } catch {
        await AsyncStorage.removeItem(CACHE_KEY);
        setError("Could not load campus content");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshFame = useCallback(async () => {
    try {
      const nextFame = await getWinners();
      setFame(nextFame);
      const savedAt = new Date().toISOString();
      setLastUpdated(savedAt);
      await AsyncStorage.setItem("hallOfFame", JSON.stringify(nextFame));

      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = parseCachedContentForTest(cached);
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              ...parsed,
              fame: nextFame,
              savedAt
            } satisfies CachedContent)
          );
        }
      } catch (cacheError) {
        console.log("Hall of Fame shared cache update skipped:", cacheError);
      }
    } catch (err) {
      console.log("Hall of Fame live refresh failed:", err);
      const cached = await AsyncStorage.getItem("hallOfFame");
      if (cached) setFame(validateArray(JSON.parse(cached), isValidWinner, "cached hall of fame"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void load(true);
      }
    });

    return () => subscription.remove();
  }, [load]);

  return {
    archive,
    error,
    events,
    fame,
    lastUpdated,
    loading,
    notices: noticeItems,
    refresh: () => load(true),
    refreshFame,
    refreshing
  };
}
