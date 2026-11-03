// Small per-machine UI preferences in localStorage. Storage can be unavailable
// or cleared, so every access falls back to the default.

const PREFIX = "hekate.";

export function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Preferences are a convenience; losing one is harmless.
  }
}
