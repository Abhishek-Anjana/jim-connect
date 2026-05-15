const rawApiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
const rawApiTimeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 8000);

export const config = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/$/, ""),
  apiTimeoutMs: Number.isFinite(rawApiTimeoutMs) && rawApiTimeoutMs > 0 ? rawApiTimeoutMs : 8000
};
