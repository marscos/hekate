import type { Library } from "$lib/library/types";
import { readPreference, writePreference } from "./preferences";

const SELECTED = "poolCrates";

/**
 * The usable tracks candidates come from (spec: track-pool): the whole library
 * when no crates are selected, otherwise the union of the selected crates.
 */
export function computePool(library: Library | null, selectedCrateIds: readonly number[]): Set<number> {
  if (!library) return new Set();
  const usable = new Set(library.tracks.filter((t) => t.usable).map((t) => t.id));
  if (selectedCrateIds.length === 0) return usable;
  const pool = new Set<number>();
  for (const c of library.crates) {
    if (!selectedCrateIds.includes(c.id)) continue;
    for (const id of c.trackIds) if (usable.has(id)) pool.add(id);
  }
  return pool;
}

export class PoolState {
  /** Crate ids; empty means the whole library. */
  selected = $state<number[]>([]);

  ids: Set<number>;

  constructor(getLibrary: () => Library | null, initial = readPreference<number[]>(SELECTED, [])) {
    this.selected = initial;
    this.ids = $derived(computePool(getLibrary(), this.selected));
  }

  setSelected(crateIds: number[]) {
    this.selected = [...new Set(crateIds)];
    writePreference(SELECTED, this.selected);
  }

  toggle(crateId: number) {
    this.setSelected(this.selected.includes(crateId) ? this.selected.filter((id) => id !== crateId) : [...this.selected, crateId]);
  }

  /** Drops remembered crates that no longer exist (e.g. deleted in Mixxx). */
  prune(library: Library) {
    const existing = new Set(library.crates.map((c) => c.id));
    const kept = this.selected.filter((id) => existing.has(id));
    if (kept.length !== this.selected.length) this.setSelected(kept);
  }
}
