<script lang="ts">
  import Compass from "$lib/components/compass/compass.svelte";
  import FirstRun from "$lib/components/library/first-run.svelte";
  import NextUpList from "$lib/components/next-up/next-up-list.svelte";
  import TopBar from "$lib/components/top-bar/top-bar.svelte";
  import RouteSummary from "$lib/components/wheel/route-summary.svelte";
  import WheelMap from "$lib/components/wheel/wheel-map.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { HistorySnapshot } from "$lib/state/now-playing.svelte";
  import { Session } from "$lib/state/session.svelte";
  import { isTauri } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import { onMount, untrack } from "svelte";

  const session = new Session();

  // The loaded library carries the latest history; the poller sends changes.
  // Runs only when a library loads: pool and history state are read untracked,
  // so changing crates can't re-apply the history captured at load time.
  $effect(() => {
    const lib = session.library.library;
    if (!lib) return;
    untrack(() => {
      session.pool.prune(lib);
      const latest = lib.histories[0];
      if (latest) session.nowPlaying.applyHistory({ playlistId: latest.playlistId, entries: latest.entries });
    });
  });

  onMount(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      // In a plain browser during development, stand in for the Rust backend.
      if (import.meta.env.DEV && !isTauri()) (await import("$lib/dev/mock-ipc")).install();
      unlisten = await listen<HistorySnapshot>("now-playing", (e) => session.nowPlaying.applyHistory(e.payload));
      await session.library.start();
    })();
    return () => unlisten?.();
  });
</script>

{#if session.library.phase !== "ready"}
  <FirstRun library={session.library} />
{:else}
  <!-- Laid out for a dedicated monitor (design D14): top bar, compass | wheel map, next-up list. -->
  <div class="grid h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,3fr)_minmax(0,2fr)] gap-3 overflow-hidden bg-background p-3 text-foreground">
    <TopBar {session} />

    <main class="grid min-h-0 grid-cols-2 gap-3">
      <Card.Root class="min-h-0 gap-2 py-4">
        <Card.Header>
          <Card.Title>Compass</Card.Title>
        </Card.Header>
        <Card.Content class="min-h-0 flex-1 px-2">
          <Compass
            current={session.current}
            suggestions={session.suggestions}
            tracksById={session.library.tracksById}
            selectedId={session.selectedId}
            onSelect={(id) => (session.selectedId = id)}
            onNowPlaying={(id) => session.setNowPlaying(id)}
          />
        </Card.Content>
      </Card.Root>
      <Card.Root class="min-h-0 gap-2 py-4">
        <Card.Header>
          <Card.Title>Wheel map</Card.Title>
        </Card.Header>
        <Card.Content class="flex min-h-0 flex-1 flex-row gap-3">
          <div class="relative min-h-0 min-w-0 flex-1">
            <WheelMap
              tracks={session.wheelTracks}
              currentId={session.current?.id ?? null}
              targetId={session.request?.id ?? null}
              route={session.route}
              selectedId={session.selectedId}
              playedTonight={session.nowPlaying.playedTonight}
              onSelect={(id) => (session.selectedId = id)}
            />
          </div>
          <div class="w-64 shrink-0 2xl:w-72">
            <RouteSummary
              tracks={session.library.library?.tracks ?? []}
              tracksById={session.library.tracksById}
              request={session.request}
              route={session.route}
              hasCurrent={session.current !== undefined}
              tolerance={session.routeTolerance}
              onRequest={(id) => session.setRequest(id)}
              onClear={() => session.setRequest(null)}
              onWiden={() => session.setTolerance(Math.min(0.1, session.tolerance + 0.02))}
            />
          </div>
        </Card.Content>
      </Card.Root>
    </main>

    <Card.Root class="min-h-0 gap-2 py-4">
      <Card.Header>
        <Card.Title>Next up <span class="font-normal text-muted-foreground tabular-nums">· {session.suggestions.length}</span></Card.Title>
      </Card.Header>
      <Card.Content class="min-h-0 flex-1">
        <NextUpList
          suggestions={session.suggestions}
          tracksById={session.library.tracksById}
          hasCurrent={session.current !== undefined}
          tolerance={session.tolerance}
          sort={session.sort}
          selectedId={session.selectedId}
          onSort={(sort) => (session.sort = sort)}
          onSelect={(id) => (session.selectedId = id)}
          onNowPlaying={(id) => session.setNowPlaying(id)}
          onRequest={(id) => session.setRequest(id)}
          onWiden={() => session.setTolerance(Math.min(0.1, session.tolerance + 0.02))}
        />
      </Card.Content>
    </Card.Root>
  </div>
{/if}
