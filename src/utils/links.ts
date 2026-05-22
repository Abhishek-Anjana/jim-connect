import { Linking } from "react-native";

export function isGoogleDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("drive.google.com");
  } catch {
    return false;
  }
}

export async function openExternalUrl(value: string) {
  if (!isGoogleDriveUrl(value)) {
    throw new Error("Invalid Google Drive URL");
  }

  await Linking.openURL(value);
}

export async function openHttpsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Invalid HTTPS URL");
  }

  await Linking.openURL(value);
}
