<script lang="ts">
  // The transition compass (spec: transition-compass). unovis draws the nodes;
  // an SVG overlay in the same pixel space draws rings, sides and slot labels.
  import UnovisGraph from "$lib/components/graph/unovis-graph.svelte";
  import { compassLayout, radiusFor, RISK_RINGS } from "$lib/engine/compass-layout";
  import { MOVE_LABEL } from "$lib/engine/camelot";
  import type { Suggestion } from "$lib/engine/ranking";
  import { formatBpm, formatGap, formatKey, formatRisk, riskBand, trackName } from "$lib/format";
  import type { Track } from "$lib/library/types";
  import { Graph, GraphLayoutType, GraphNodeSelectionHighlightMode, type GraphConfigInterface } from "@unovis/ts";

  interface Props {
    current: Track | undefined;
    suggestions: Suggestion[];
    tracksById: ReadonlyMap<number, Track>;
    selectedId: number | null;
    onSelect: (id: number) => void;
    onNowPlaying: (id: number) => void;
  }
  let { current, suggestions, tracksById, selectedId, onSelect, onNowPlaying }: Props = $props();

  type Node = { id: string; x: number; y: number; suggestion?: Suggestion; anchor?: boolean };
  type Link = { source: string; target: string };

  let width = $state(0);
  let height = $state(0);
  let hoveredId = $state<number | null>(null);

  const layout = $derived(compassLayout(suggestions));
  const cx = $derived(width / 2);
  const cy = $derived(height / 2);
  // Slot labels sit just outside the outer ring, like a compass rose.
  const LABEL_RADIUS = 1.1;
  const RING_LABEL_ANGLE = (64 * Math.PI) / 180;
  // Ring labels go on the side of the other mode: right for a minor track, left for a major one.
  const ringSide = $derived(current?.camelot?.letter === "B" ? -1 : 1);
  const scale = $derived(Math.max(0, Math.min(width / 2 - 100, (height / 2 - 18) / LABEL_RADIUS)));

  const data = $derived.by(() => {
    // unovis always fits the view to the nodes on first render. Invisible
    // anchors at the corners, with the zoom scale pinned to 1, make that fit
    // the identity, so these pixel positions match the overlay exactly.
    const nodes: Node[] = [
      { id: "anchor-tl", x: 0, y: 0, anchor: true },
      { id: "anchor-br", x: width, y: height, anchor: true },
      { id: "now", x: cx, y: cy },
    ];
    const links: Link[] = [];
    for (const n of layout.nodes) {
      const id = String(n.suggestion.to);
      nodes.push({ id, x: cx + n.x * scale, y: cy + n.y * scale, suggestion: n.suggestion });
      links.push({ source: "now", target: id });
    }
    return { nodes, links };
  });

  const riskColor = { safe: "var(--risk-safe)", moderate: "var(--risk-moderate)", bold: "var(--risk-bold)" };
  const badge = (s: Suggestion) =>
    s.move === "up2" ? "⚡" : s.move === "semitoneUp" ? "↑" : undefined;

  // Read reactive values here, not inside accessors: unovis calls those later,
  // outside Svelte's tracking.
  const config: GraphConfigInterface<Node, Link> = $derived.by(() => configFor(selectedId, current));
  function configFor(selected: number | null, now: Track | undefined): GraphConfigInterface<Node, Link> {
    return {
      layoutType: GraphLayoutType.Precalculated,
      layoutAutofit: false,
      disableZoom: true,
      disableDrag: true,
      disableBrush: true,
      zoomScaleExtent: [1, 1],
      duration: 0,
      nodeSize: (n) => (n.anchor ? 0 : n.suggestion ? 13 : 34),
      nodeFill: (n) => (n.anchor ? "transparent" : n.suggestion ? riskColor[riskBand(n.suggestion.risk)] : "var(--foreground)"),
      // Outline the selected node instead of greying out the rest, so every
      // node keeps its risk colour.
      nodeSelectionHighlightMode: GraphNodeSelectionHighlightMode.None,
      nodeStroke: "var(--foreground)",
      nodeStrokeWidth: (n) => (n.suggestion && n.suggestion.to === selected ? 3 : 0),
      nodeLabel: (n) => (n.anchor || n.suggestion ? "" : formatKey(now?.camelot ?? null)),
      nodeDisabled: (n) => n.suggestion?.playedTonight ?? false,
      nodeSideLabels: (n) => {
        const text = n.suggestion && badge(n.suggestion);
        return text ? [{ text, radius: 6, fontSize: "9px", color: "var(--muted)", textColor: "var(--foreground)" }] : [];
      },
      linkStroke: "var(--border)",
      linkWidth: 1,
      events: {
        [Graph.selectors.node]: {
          click: (n: Node) => n.suggestion && onSelect(n.suggestion.to),
          dblclick: (n: Node) => n.suggestion && onNowPlaying(n.suggestion.to),
          mouseover: (n: Node) => (hoveredId = n.suggestion?.to ?? null),
          mouseout: () => (hoveredId = null),
        },
      },
    };
  }

  const detailsId = $derived(hoveredId ?? selectedId);
  const details = $derived(detailsId === null ? undefined : suggestions.find((s) => s.to === detailsId));
  const detailsTrack = $derived(details ? tracksById.get(details.to) : undefined);
</script>

<div class="relative h-full min-h-0 w-full" bind:clientWidth={width} bind:clientHeight={height} data-testid="compass">
  {#if !current}
    <p class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Set a now-playing track to see where you can take the room.
    </p>
  {:else}
    <svg class="pointer-events-none absolute inset-0 h-full w-full text-muted-foreground" aria-hidden="true">
      <line x1={cx} y1={8} x2={cx} y2={height - 8} stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 5" />
      {#each RISK_RINGS as edge (edge)}
        <circle {cx} {cy} r={radiusFor(edge) * scale} fill="none" stroke="currentColor" stroke-opacity="0.18" />
        <!-- At 64°, between the 48° and 80° slots, on the side with the other mode, which has fewer slots. -->
        <text
          x={cx + ringSide * (Math.cos(RING_LABEL_ANGLE) * radiusFor(edge) * scale + 3)}
          y={cy - Math.sin(RING_LABEL_ANGLE) * radiusFor(edge) * scale - 3}
          text-anchor={ringSide > 0 ? "start" : "end"}
          class="fill-current text-[10px]"
          opacity="0.6">risk {edge.toFixed(2)}</text
        >
      {/each}
      <text x={12} y={20} class="fill-mood-darker text-xs font-medium">◀ darker (minor)</text>
      <text x={width - 12} y={20} text-anchor="end" class="fill-mood-brighter text-xs font-medium">brighter (major) ▶</text>
      {#each layout.slots as slot (slot.key)}
        {@const r = Math.hypot(slot.x, slot.y) || 1}
        {@const lx = cx + (slot.x / r) * LABEL_RADIUS * scale}
        {@const ly = cy + (slot.y / r) * LABEL_RADIUS * scale}
        <text
          x={lx}
          y={ly}
          text-anchor={slot.side === "darker" ? "end" : "start"}
          dominant-baseline="middle"
          class="fill-current text-[11px]"
        >
          {MOVE_LABEL[slot.move]}{#if slot.overflow > 0}{` +${slot.overflow} more`}{/if}
        </text>
      {/each}
    </svg>

    {#if width > 0 && height > 0}
      <UnovisGraph {data} {config} class="absolute inset-0" />
    {/if}

    {#if details && detailsTrack}
      <div class="pointer-events-none absolute bottom-2 left-2 max-w-[60%] rounded-md border bg-popover/95 px-3 py-2 text-xs shadow" data-testid="compass-details">
        <div class="truncate text-sm font-medium">{trackName(detailsTrack)}</div>
        <div class="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
          <span class="font-mono text-foreground">{formatKey(detailsTrack.camelot)}</span>
          <span class="font-mono">{formatBpm(detailsTrack.bpm)} BPM ({formatGap(details.gapPct)})</span>
          <span>{MOVE_LABEL[details.move]}</span>
          <span class={details.mood === "brighter" ? "text-mood-brighter" : "text-mood-darker"}>{details.mood}</span>
          <span>risk {formatRisk(details.risk)}</span>
          {#if details.label}<span class="text-foreground">{details.label}</span>{/if}
          {#if details.playedTonight}<span>played tonight</span>{/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
