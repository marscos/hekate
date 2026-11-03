// Request routing: fewest tracks first, lower total risk breaks ties
// (design D10, spec: request-routing).

import type { Track } from "$lib/library/types";
import { buildGraph, type Transition } from "./transition";

/** Small enough that risk (≤ 1 per step) only decides between equally short routes. */
const EPSILON = 1e-3;

export interface RouteRequest {
  tracks: ReadonlyMap<number, Track>;
  /** Tracks allowed as intermediates (the pool). */
  poolIds: ReadonlySet<number>;
  currentId: number;
  targetId: number;
  playedTonight: ReadonlySet<number>;
  tolerance: number;
}

export type RouteResult =
  | { kind: "route"; steps: Transition[]; trackIds: number[]; estimatedSeconds: number }
  | { kind: "reached" }
  | { kind: "none" };

/** Finds the fewest-tracks route from the current track to the target. */
export function findRoute(req: RouteRequest): RouteResult {
  const { tracks, currentId, targetId } = req;
  if (currentId === targetId) return { kind: "reached" };
  const current = tracks.get(currentId);
  const target = tracks.get(targetId);
  if (!current?.usable || !target?.usable) return { kind: "none" };

  // Intermediates: pool tracks not played tonight. The ends may be anywhere.
  const nodes = [current, target];
  for (const id of req.poolIds) {
    if (id === currentId || id === targetId || req.playedTonight.has(id)) continue;
    const t = tracks.get(id);
    if (t?.usable) nodes.push(t);
  }
  const graph = buildGraph(nodes, req.tolerance);

  // Dijkstra with a simple scan; graphs are a few hundred nodes.
  const dist = new Map<number, number>([[currentId, 0]]);
  const via = new Map<number, Transition>();
  const done = new Set<number>();
  for (;;) {
    let u: number | undefined;
    let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < best) [u, best] = [id, d];
    if (u === undefined || u === targetId) break;
    done.add(u);
    for (const edge of graph.get(u) ?? []) {
      if (edge.to === currentId) continue;
      const d = best + 1 + EPSILON * edge.risk;
      if (d < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, d);
        via.set(edge.to, edge);
      }
    }
  }
  if (!via.has(targetId)) return { kind: "none" };

  const steps: Transition[] = [];
  for (let id = targetId; id !== currentId; id = via.get(id)!.from) steps.unshift(via.get(id)!);
  const trackIds = [currentId, ...steps.map((s) => s.to)];
  return { kind: "route", steps, trackIds, estimatedSeconds: estimate(trackIds, tracks) };
}

/** Time until the target starts: the intermediate tracks played in full. */
function estimate(trackIds: number[], tracks: ReadonlyMap<number, Track>): number {
  return trackIds.slice(1, -1).reduce((s, id) => s + (tracks.get(id)?.duration ?? 0), 0);
}

/**
 * Updates a route after now-playing changed: continue from the new track when
 * it is on the route, mark the request reached, or route again from it.
 */
export function rerouteFrom(previous: RouteResult | null, req: RouteRequest): RouteResult {
  if (req.currentId === req.targetId) return { kind: "reached" };
  if (previous?.kind === "route" && previous.trackIds.at(-1) === req.targetId) {
    const i = previous.trackIds.indexOf(req.currentId);
    if (i > 0) {
      const trackIds = previous.trackIds.slice(i);
      return { kind: "route", steps: previous.steps.slice(i), trackIds, estimatedSeconds: estimate(trackIds, req.tracks) };
    }
  }
  return findRoute(req);
}
