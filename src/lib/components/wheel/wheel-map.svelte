<script lang="ts">
  // The Camelot wheel map with the request route drawn on top (design D11).
  // Plain SVG: unovis was too slow at ~650 nodes (design D13).
  import type { RouteResult } from "$lib/engine/router";
  import { RINGS, wheelLayout, wheelPoint } from "$lib/engine/wheel-layout";
  import { formatBpm, formatKey, trackName } from "$lib/format";
  import type { Letter, Track } from "$lib/library/types";

  interface Props {
    /** Pool tracks plus the current and target tracks. */
    tracks: Track[];
    currentId: number | null;
    targetId: number | null;
    route: RouteResult | null;
    selectedId: number | null;
    playedTonight: ReadonlySet<number>;
    onSelect: (id: number) => void;
  }
  let { tracks, currentId, targetId, route, selectedId, playedTonight, onSelect }: Props = $props();

  const layout = $derived(wheelLayout(tracks));
  const routePoints = $derived(
    route?.kind === "route"
      ? route.trackIds
          .map((id) => layout.nodes.get(id))
          .filter((n) => n !== undefined)
          .map((n) => `${n.x},${n.y}`)
          .join(" ")
      : "",
  );
  const onRoute = $derived(new Set(route?.kind === "route" ? route.trackIds : []));
  const current = $derived(currentId === null ? undefined : layout.nodes.get(currentId));
  const target = $derived(targetId === null ? undefined : layout.nodes.get(targetId));

  const labels = (["A", "B"] as Letter[]).flatMap((letter) =>
    Array.from({ length: 12 }, (_, i) => {
      const num = i + 1;
      const r = letter === "A" ? RINGS.A[0] - 0.07 : RINGS.B[1] + 0.08;
      return { code: `${num}${letter}`, ...wheelPoint({ num, letter }, r) };
    }),
  );
  const dividers = Array.from({ length: 12 }, (_, i) => wheelPoint({ num: i + 1, letter: "A" }, 1, Math.PI / 12));
</script>

<svg viewBox="-1.2 -1.2 2.4 2.4" class="absolute inset-0 h-full w-full select-none" role="img" aria-label="Camelot wheel map" data-testid="wheel-map">
  <g class="text-muted-foreground">
    <circle r={(RINGS.A[0] + RINGS.A[1]) / 2} fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width={RINGS.A[1] - RINGS.A[0]} />
    <circle r={(RINGS.B[0] + RINGS.B[1]) / 2} fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width={RINGS.B[1] - RINGS.B[0]} />
    {#each dividers as d, i (i)}
      <line x1={d.x * RINGS.A[0]} y1={d.y * RINGS.A[0]} x2={d.x} y2={d.y} stroke="currentColor" stroke-opacity="0.15" stroke-width="0.004" />
    {/each}
    {#each labels as l (l.code)}
      <text x={l.x} y={l.y} text-anchor="middle" dominant-baseline="central" font-size="0.055" class="fill-current font-mono">{l.code}</text>
    {/each}
  </g>

  {#each tracks as t (t.id)}
    {@const n = layout.nodes.get(t.id)}
    {#if n}
      <circle
        cx={n.x}
        cy={n.y}
        r={selectedId === t.id ? 0.024 : 0.013}
        class="cursor-pointer fill-foreground"
        fill-opacity={onRoute.has(t.id) ? 0.95 : playedTonight.has(t.id) ? 0.15 : 0.45}
        stroke={selectedId === t.id ? "var(--foreground)" : "none"}
        stroke-width="0.006"
        role="button"
        tabindex="-1"
        aria-label={trackName(t)}
        onclick={() => onSelect(t.id)}
        onkeydown={(e) => e.key === "Enter" && onSelect(t.id)}
      >
        <title>{formatKey(t.camelot)} · {formatBpm(t.bpm)} BPM · {trackName(t)}</title>
      </circle>
    {/if}
  {/each}

  {#if routePoints}
    <polyline points={routePoints} fill="none" stroke="var(--route)" stroke-width="0.012" stroke-linejoin="round" stroke-linecap="round" data-testid="route-line" />
  {/if}
  {#if target}
    <circle cx={target.x} cy={target.y} r="0.04" fill="none" stroke="var(--route)" stroke-width="0.012" data-testid="route-target" />
  {/if}
  {#if current}
    <circle cx={current.x} cy={current.y} r="0.032" class="fill-foreground" stroke="var(--background)" stroke-width="0.008" data-testid="route-current" />
  {/if}
</svg>
