import { ArchiveEntry, Event, Winner } from "../data/content";

export function sortUpcomingEvents(events: Event[], now = new Date()) {
  return events
    .filter((event) => new Date(event.endsAt) > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function sortArchiveEntries(entries: ArchiveEntry[]) {
  return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function sortWinners(winners: Winner[]) {
  return [...winners].sort((a, b) => {
    if (a.champion !== b.champion) return a.champion ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
