<script lang="ts">
  // Ranked compatible next tracks (spec: next-track-suggestions).
  // Keyboard: ↑/↓ select, Enter sets now-playing, R sets the request target.
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import MoveLabel from "$lib/components/glossary/move-label.svelte";
  import type { Suggestion, SuggestionSort } from "$lib/engine/ranking";
  import { formatBpm, formatGap, formatKey, formatRisk, formatTolerance, riskBand } from "$lib/format";
  import type { Track } from "$lib/library/types";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import { tick } from "svelte";

  interface Props {
    suggestions: Suggestion[];
    tracksById: ReadonlyMap<number, Track>;
    hasCurrent: boolean;
    tolerance: number;
    sort: SuggestionSort;
    selectedId: number | null;
    onSort: (sort: SuggestionSort) => void;
    onSelect: (id: number | null) => void;
    onNowPlaying: (id: number) => void;
    onRequest: (id: number) => void;
    onWiden: () => void;
  }
  let { suggestions, tracksById, hasCurrent, tolerance, sort, selectedId, onSort, onSelect, onNowPlaying, onRequest, onWiden }: Props =
    $props();

  let body = $state<HTMLElement | null>(null);

  const riskClass = { safe: "text-risk-safe", moderate: "text-risk-moderate", bold: "text-risk-bold" };

  async function move(delta: number) {
    if (suggestions.length === 0) return;
    const i = suggestions.findIndex((s) => s.to === selectedId);
    const next = suggestions[Math.max(0, Math.min(suggestions.length - 1, i < 0 ? 0 : i + delta))];
    onSelect(next.to);
    await tick();
    body?.querySelector(`[data-track-id="${next.to}"]`)?.scrollIntoView?.({ block: "nearest" });
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" && selectedId !== null) {
      onNowPlaying(selectedId);
    } else if ((e.key === "r" || e.key === "R") && selectedId !== null) {
      onRequest(selectedId);
    }
  }

  const sortButtons: { sort: SuggestionSort; label: string }[] = [
    { sort: "best", label: "Best match" },
    { sort: "bpm", label: "BPM gap" },
    { sort: "risk", label: "Risk" },
  ];
</script>

<div class="flex h-full min-h-0 flex-col gap-2">
  <div class="flex items-center gap-1 text-xs" role="group" aria-label="Sort suggestions">
    <span class="mr-1 text-muted-foreground">Sort</span>
    {#each sortButtons as b (b.sort)}
      <Button size="xs" variant={sort === b.sort ? "secondary" : "ghost"} aria-pressed={sort === b.sort} onclick={() => onSort(b.sort)}>
        {b.label}
      </Button>
    {/each}
    <span class="ml-auto text-muted-foreground">↑↓ select · Enter: now-playing · R: request</span>
  </div>

  {#if !hasCurrent}
    <p class="py-6 text-center text-sm text-muted-foreground" data-testid="next-up-empty">
      Set a now-playing track to see what can follow it.
    </p>
  {:else if suggestions.length === 0}
    <div class="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground" data-testid="next-up-empty">
      <p>No compatible tracks in the pool at {formatTolerance(tolerance)} BPM.</p>
      <Button size="sm" variant="outline" onclick={onWiden}>Widen tolerance</Button>
    </div>
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      bind:this={body}
      class="min-h-0 flex-1 overflow-y-auto rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabindex="0"
      role="listbox"
      aria-label="Next up"
      {onkeydown}
    >
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-card text-xs text-muted-foreground">
          <tr class="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-normal">
            <th>Key</th>
            <th class="text-right!">BPM</th>
            <th class="text-right!">Gap</th>
            <th>Move</th>
            <th>Mood</th>
            <th class="text-right!">Risk</th>
            <th class="w-full">Track</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each suggestions as s (s.to)}
            {@const t = tracksById.get(s.to)}
            {#if t}
              <tr
                data-track-id={s.to}
                data-testid="suggestion"
                role="option"
                aria-selected={selectedId === s.to}
                class="cursor-pointer border-t [&>td]:px-2 [&>td]:py-1.5 {selectedId === s.to ? 'bg-accent' : 'hover:bg-accent/50'} {s.playedTonight
                  ? 'opacity-45'
                  : ''}"
                onclick={() => onSelect(s.to)}
                ondblclick={() => onNowPlaying(s.to)}
              >
                <td class="font-mono font-semibold">{formatKey(t.camelot)}</td>
                <td class="text-right font-mono tabular-nums">{formatBpm(t.bpm)}</td>
                <td class="text-right font-mono tabular-nums">
                  {formatGap(s.gapPct)}{#if s.halfDouble}<span class="ml-1 text-xs text-muted-foreground" title="Half/double time">½×</span>{/if}
                </td>
                <td class="whitespace-nowrap"><MoveLabel move={s.move} /></td>
                <td class="whitespace-nowrap">
                  {#if s.mood === "brighter"}
                    <span class="flex items-center gap-1 text-mood-brighter"><Sun class="size-3.5" />brighter</span>
                  {:else}
                    <span class="flex items-center gap-1 text-mood-darker"><Moon class="size-3.5" />darker</span>
                  {/if}
                </td>
                <td class="text-right font-mono tabular-nums {riskClass[riskBand(s.risk)]}">{formatRisk(s.risk)}</td>
                <td class="max-w-0 truncate">
                  {t.artist ? `${t.artist} – ` : ""}{t.title}
                  {#if s.label}<Badge variant="outline" class="ml-2">{s.label}</Badge>{/if}
                  {#if s.playedTonight}<span class="ml-2 text-xs text-muted-foreground">played</span>{/if}
                </td>
                <td class="whitespace-nowrap">
                  <Button size="xs" variant="ghost" onclick={(e: MouseEvent) => (e.stopPropagation(), onNowPlaying(s.to))}>Now</Button>
                  <Button size="xs" variant="ghost" onclick={(e: MouseEvent) => (e.stopPropagation(), onRequest(s.to))}>Request</Button>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
