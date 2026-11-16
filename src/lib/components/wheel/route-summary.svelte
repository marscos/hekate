<script lang="ts">
  // Request target, route steps and estimate (spec: request-routing).
  import TrackSearch from "$lib/components/top-bar/track-search.svelte";
  import { Button } from "$lib/components/ui/button";
  import MoveLabel from "$lib/components/glossary/move-label.svelte";
  import type { RouteResult } from "$lib/engine/router";
  import { formatBpm, formatGap, formatKey, formatMinutes, formatTolerance, trackName } from "$lib/format";
  import type { Track } from "$lib/library/types";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import X from "@lucide/svelte/icons/x";

  interface Props {
    tracks: Track[];
    tracksById: ReadonlyMap<number, Track>;
    request: Track | undefined;
    route: RouteResult | null;
    hasCurrent: boolean;
    tolerance: number;
    onRequest: (id: number) => void;
    onClear: () => void;
    onWiden: () => void;
  }
  let { tracks, tracksById, request, route, hasCurrent, tolerance, onRequest, onClear, onWiden }: Props = $props();
</script>

<div class="flex h-full min-h-0 flex-col gap-3 text-sm" data-testid="route-summary">
  <TrackSearch {tracks} {onRequest} mode="request" placeholder="Request a track…" shortcut="" class="w-full" />

  {#if !request}
    <p class="text-muted-foreground">
      Someone asked for a song? Search for it here, or press <kbd class="rounded border px-1 text-xs">R</kbd> on a suggestion. hekate plans the
      shortest smooth route to it.
    </p>
  {:else}
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="text-xs tracking-wide text-muted-foreground uppercase">Request</div>
        <div class="truncate font-medium">{trackName(request)}</div>
        <div class="font-mono text-xs text-muted-foreground">{formatKey(request.camelot)} · {formatBpm(request.bpm)} BPM</div>
      </div>
      <Button size="icon-xs" variant="ghost" aria-label="Clear request" title="Clear request" onclick={onClear}><X /></Button>
    </div>

    {#if !hasCurrent}
      <p class="text-muted-foreground">Set a now-playing track to plan the route.</p>
    {:else if route?.kind === "reached"}
      <p class="flex items-center gap-2 text-risk-safe" data-testid="route-reached"><CircleCheck class="size-4" />Request reached.</p>
    {:else if route?.kind === "none"}
      <div class="space-y-2" data-testid="route-none">
        <p class="text-muted-foreground">No route found at {formatTolerance(tolerance)} BPM.</p>
        <Button size="sm" variant="outline" onclick={onWiden}>Widen tolerance</Button>
      </div>
    {:else if route?.kind === "route"}
      <div class="text-xs text-muted-foreground" data-testid="route-estimate">
        {route.steps.length - 1 === 0 ? "Play it next" : `${route.steps.length - 1} track${route.steps.length - 1 === 1 ? "" : "s"} before it`}
        {#if route.estimatedSeconds > 0}· about {formatMinutes(route.estimatedSeconds)}{/if}
      </div>
      <ol class="min-h-0 flex-1 space-y-0.5 overflow-y-auto" data-testid="route-steps">
        {#each route.steps as step, i (step.to)}
          {@const t = tracksById.get(step.to)}
          {#if t}
            <li class="rounded px-1.5 py-1 {step.to === request.id ? 'bg-accent' : ''}">
              <div class="flex items-baseline gap-2">
                <span class="w-4 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span class="w-8 font-mono font-semibold">{formatKey(t.camelot)}</span>
                <span class="font-mono text-xs tabular-nums">{formatBpm(t.bpm)}</span>
                <span class="font-mono text-xs text-muted-foreground tabular-nums">{formatGap(step.gapPct)}</span>
                <MoveLabel move={step.move} side="left" class="truncate text-xs text-muted-foreground" />
              </div>
              <div class="truncate pl-6 text-xs">{trackName(t)}</div>
            </li>
          {/if}
        {/each}
      </ol>
    {/if}
  {/if}
</div>
