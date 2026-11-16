import type { Camelot, Track } from "$lib/library/types";

export const formatKey = (c: Camelot | null) => (c ? `${c.num}${c.letter}` : "—");

export const formatBpm = (bpm: number) => (bpm > 0 ? bpm.toFixed(1) : "—");

export function formatGap(gapPct: number) {
  const rounded = Math.round(gapPct * 10) / 10;
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : "±"}${Math.abs(rounded).toFixed(1)}%`;
}

/** BPM tolerance as shown in the UI, e.g. "±6%" or "±6.5%". */
export const formatTolerance = (tolerance: number) => `±${(tolerance * 100).toFixed(1).replace(/\.0$/, "")}%`;

export const formatRisk = (risk: number) => risk.toFixed(2);

export function formatMinutes(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes < 1 ? "under a minute" : `${minutes} min`;
}

export const trackName = (t: Track) => (t.artist ? `${t.artist} – ${t.title}` : t.title);

/** Where the moderate and bold risk bands start. */
export const RISK_BAND_START = { moderate: 0.35, bold: 0.7 } as const;

/** Risk bands for colour: safe, moderate, bold. */
export function riskBand(risk: number): "safe" | "moderate" | "bold" {
  return risk < RISK_BAND_START.moderate ? "safe" : risk < RISK_BAND_START.bold ? "moderate" : "bold";
}

/** Case-insensitive match on every word of `query` against artist and title. */
export function matchesQuery(t: Track, query: string) {
  const hay = `${t.artist} ${t.title}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
