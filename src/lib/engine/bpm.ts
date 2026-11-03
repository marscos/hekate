// BPM compatibility (design D7). Keylock is assumed on, so tempo never
// changes a track's key.

export const DEFAULT_TOLERANCE = 0.06;

export interface BpmMatch {
  /** Signed tempo gap of the candidate versus the current track, in percent. */
  gapPct: number;
  /** Matched at half or double the candidate's tempo. */
  halfDouble: boolean;
}

/** Matches `candidate` against `current` within `tolerance`, or returns `null`. */
export function matchBpm(current: number, candidate: number, tolerance = DEFAULT_TOLERANCE): BpmMatch | null {
  if (current <= 0 || candidate <= 0) return null;
  let best: BpmMatch | null = null;
  let bestDiff = Infinity;
  for (const factor of [1, 2, 0.5]) {
    const target = current * factor;
    const diff = Math.abs(target - candidate) / Math.min(target, candidate);
    if (diff <= tolerance + 1e-9 && diff < bestDiff) {
      bestDiff = diff;
      best = { gapPct: ((candidate - target) / target) * 100, halfDouble: factor !== 1 };
    }
  }
  return best;
}
