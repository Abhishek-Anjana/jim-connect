import { Share } from "react-native";
import { ArchiveEntry, Event } from "../data/content";
import { formatDate, formatDateTime } from "./date";

export async function shareEvent(event: Event) {
  await Share.share({
    message: `${event.name}\n${formatDateTime(event.startsAt)}\n${event.venue}\nOrganized by ${event.club}\n\n${event.description}`,
    title: event.name
  });
}

export async function shareArchiveEntry(entry: ArchiveEntry) {
  await Share.share({
    message: `${entry.name}\n${formatDate(entry.date)} | ${entry.club}\n\n${entry.summary}\n\nPhotos: ${entry.driveUrl}`,
    title: entry.name
  });
}
