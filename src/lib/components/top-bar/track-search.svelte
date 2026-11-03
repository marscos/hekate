<script lang="ts">
  // Library search: Enter sets now-playing, Shift+Enter sets the request target.
  // In "request" mode, Enter sets the request target and only usable tracks
  // are listed. A `shortcut` key focuses the field from anywhere.
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { formatBpm, formatKey, matchesQuery } from "$lib/format";
  import type { Track } from "$lib/library/types";
  import Search from "@lucide/svelte/icons/search";

  interface Props {
    tracks: Track[];
    onNowPlaying?: (id: number) => void;
    onRequest: (id: number) => void;
    mode?: "both" | "request";
    placeholder?: string;
    shortcut?: string;
    class?: string;
  }
  let { tracks, onNowPlaying, onRequest, mode = "both", placeholder = "Search tracks  ( / )", shortcut = "/", class: className = "w-80" }: Props =
    $props();

  let query = $state("");
  let active = $state(0);
  let open = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  const results = $derived(
    query.trim() ? tracks.filter((t) => (mode === "both" || t.usable) && matchesQuery(t, query)).slice(0, 8) : [],
  );

  function choose(t: Track, asRequest: boolean) {
    if (asRequest) {
      if (!t.usable) return;
      onRequest(t.id);
    } else {
      onNowPlaying?.(t.id);
    }
    query = "";
    open = false;
    input?.blur();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      active = Math.min(active + 1, results.length - 1);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      active = Math.max(active - 1, 0);
      e.preventDefault();
    } else if (e.key === "Enter" && results[active]) {
      choose(results[active], mode === "request" || e.shiftKey);
      e.preventDefault();
    } else if (e.key === "Escape") {
      query = "";
      input?.blur();
    }
  }

  function onWindowKeydown(e: KeyboardEvent) {
    const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName));
    if (e.key === shortcut && !typing) {
      e.preventDefault();
      input?.focus();
    }
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="relative {className}">
  <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
  <Input
    bind:ref={input}
    bind:value={query}
    class="pl-8"
    {placeholder}
    aria-label={mode === "request" ? "Search request" : "Search tracks"}
    oninput={() => ((active = 0), (open = true))}
    onfocus={() => (open = true)}
    onblur={() => setTimeout(() => (open = false), 150)}
    {onkeydown}
  />
  {#if open && results.length > 0}
    <ul class="absolute top-full right-0 z-50 mt-1 w-[34rem] overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-lg" role="listbox">
      {#each results as t, i (t.id)}
        <li
          class="flex items-center gap-2 rounded px-2 py-1.5 {i === active ? 'bg-accent' : ''}"
          role="option"
          aria-selected={i === active}
          onmouseenter={() => (active = i)}
        >
          <span class="w-9 font-mono text-xs text-muted-foreground">{formatKey(t.camelot)}</span>
          <span class="w-12 text-right font-mono text-xs text-muted-foreground tabular-nums">{formatBpm(t.bpm)}</span>
          <span class="min-w-0 flex-1 truncate">{t.artist ? `${t.artist} – ` : ""}{t.title}</span>
          {#if mode === "both"}
            <Button size="xs" variant="secondary" onmousedown={(e: MouseEvent) => (e.preventDefault(), choose(t, false))}>Now</Button>
          {/if}
          <Button size="xs" variant="outline" disabled={!t.usable} onmousedown={(e: MouseEvent) => (e.preventDefault(), choose(t, true))}>Request</Button>
        </li>
      {/each}
      <li class="px-2 pt-1 text-xs text-muted-foreground">
        {mode === "request" ? "Enter: request this track" : "Enter: set now-playing · Shift+Enter: request"}
      </li>
    </ul>
  {/if}
</div>
