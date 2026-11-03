<script lang="ts">
  import Glossary from "$lib/components/glossary/glossary.svelte";
  import LibraryStatus from "$lib/components/library/library-status.svelte";
  import { Label } from "$lib/components/ui/label";
  import { Slider } from "$lib/components/ui/slider";
  import { Switch } from "$lib/components/ui/switch";
  import { formatBpm, formatKey, formatTolerance } from "$lib/format";
  import { afterPaint } from "$lib/hooks/after-paint";
  import type { Session } from "$lib/state/session.svelte";
  import { untrack } from "svelte";
  import PoolPicker from "./pool-picker.svelte";
  import TrackSearch from "./track-search.svelte";

  let { session }: { session: Session } = $props();
  const current = $derived(session.current);

  // The slider follows a local draft so its thumb never waits on the views.
  // While dragging, the views get the latest value once per frame, unsaved;
  // a commit (release or keyboard step) applies and saves it.
  let dragging = false;
  let draft = $state(untrack(() => session.tolerance * 100));
  const previews = afterPaint((percent: number) => session.previewTolerance(percent / 100));

  $effect(() => {
    const percent = session.tolerance * 100;
    if (!dragging) draft = percent;
  });
  $effect(() => () => previews.cancel());

  function onToleranceChange(percent: number) {
    dragging = true;
    previews.push(percent);
  }

  function onToleranceCommit(percent: number) {
    dragging = false;
    previews.cancel();
    session.setTolerance(percent / 100);
  }
</script>

<header class="flex h-16 min-w-0 items-center gap-4 rounded-lg border bg-card px-4">
  <span class="text-lg font-semibold tracking-tight">hekate</span>

  <div class="min-w-0 flex-1" data-testid="now-playing">
    {#if current}
      <div class="flex items-baseline gap-2">
        <span class="text-xs tracking-wide text-muted-foreground uppercase">
          Now{#if session.nowPlaying.source === "manual"}{" "}(manual){/if}
        </span>
        <span class="font-mono text-lg font-semibold">{formatKey(current.camelot)}</span>
        <span class="font-mono text-lg tabular-nums">{formatBpm(current.bpm)}</span>
      </div>
      <div class="truncate text-sm">{current.artist ? `${current.artist} – ` : ""}{current.title}</div>
    {:else}
      <span class="text-sm text-muted-foreground">No track playing. Search for one, or play a track in Mixxx.</span>
    {/if}
  </div>

  <TrackSearch
    class="w-56 2xl:w-80"
    tracks={session.library.library?.tracks ?? []}
    onNowPlaying={(id) => session.setNowPlaying(id)}
    onRequest={(id) => session.setRequest(id)}
  />

  <div class="flex shrink-0 items-center gap-2">
    <Switch id="follow" checked={session.nowPlaying.follow} onCheckedChange={(v) => session.nowPlaying.setFollow(v)} />
    <Label for="follow" class="text-sm whitespace-nowrap">Follow Mixxx</Label>
  </div>

  <div class="flex w-36 shrink-0 items-center gap-2 2xl:w-44" title="BPM tolerance">
    <span class="text-xs text-muted-foreground">BPM</span>
    <Slider
      type="single"
      min={1}
      max={10}
      step={0.5}
      bind:value={draft}
      onValueChange={onToleranceChange}
      onValueCommit={onToleranceCommit}
      aria-label="BPM tolerance"
    />
    <span class="w-10 shrink-0 text-right font-mono text-xs tabular-nums" data-testid="tolerance">{formatTolerance(draft / 100)}</span>
  </div>

  <PoolPicker pool={session.pool} crates={session.library.library?.crates ?? []} />
  <LibraryStatus library={session.library} />
  <Glossary />
</header>
