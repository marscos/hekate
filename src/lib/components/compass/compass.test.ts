// @vitest-environment jsdom
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { rankSuggestions } from "$lib/engine/ranking";
import { track } from "$lib/engine/test-tracks";
import { transitionsFrom } from "$lib/engine/transition";
import type { Track } from "$lib/library/types";
import { CoverStore } from "$lib/state/covers.svelte";
import Compass, { centreNode } from "./compass.svelte";

// jsdom has no layout; bind:clientWidth needs ResizeObserver to exist. With
// zero size unovis isn't drawn, which these tests don't need.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const withCover = (t: Track, color = "#336699"): Track => ({ ...t, coverColor: color, coverDigest: `d${t.id}` });

const plainCurrent = track(1, "8A", 125);
const covered = withCover(track(2, "9A", 126));
const uncovered = track(3, "8A", 125);
const failing = withCover(track(4, "8B", 125), "#cc0000");

function setup(current: Track, selectedId: number | null, answers: Record<number, string | null> = {}) {
  let release!: () => void;
  const ready = new Promise<void>((r) => (release = r));
  const fetch = vi.fn(async (id: number) => {
    await ready;
    return answers[id] ?? null;
  });
  const store = new CoverStore(fetch);
  const candidates = [covered, uncovered, failing].filter((t) => t.id !== current.id);
  const tracksById = new Map([current, ...candidates].map((t) => [t.id, t]));
  render(Compass, {
    current,
    suggestions: rankSuggestions(transitionsFrom(current, candidates, 0.06), new Set(), 0.06),
    tracksById,
    selectedId,
    onSelect: vi.fn(),
    onNowPlaying: vi.fn(),
    cover: (t: Track | undefined) => store.cover(t),
  });
  return { fetch, release: async () => (release(), await new Promise((r) => setTimeout(r, 0))) };
}

const cardCover = () => screen.getByTestId("compass-details").querySelector<HTMLElement>("[data-testid=cover]")!;

describe("Compass details card", () => {
  it("shows the cover's colour, then the image", async () => {
    const { release } = setup(plainCurrent, covered.id, { [covered.id]: "data:image/jpeg;base64,AA" });
    expect(cardCover().style.backgroundColor).toBe("rgb(51, 102, 153)");
    expect(cardCover().querySelector("img")).toBeNull();
    await release();
    expect(cardCover().querySelector("img")?.getAttribute("src")).toBe("data:image/jpeg;base64,AA");
    expect(cardCover().style.backgroundColor).toBe("rgb(51, 102, 153)");
  });

  it("shows a placeholder square of the same size for a track without a cover", () => {
    const { fetch } = setup(plainCurrent, uncovered.id);
    expect(cardCover().className).toContain("size-16");
    expect(cardCover().style.backgroundColor).toBe("var(--muted)");
    expect(cardCover().querySelector("img")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the colour when the cover can't be read", async () => {
    const { release, fetch } = setup(plainCurrent, failing.id, { [failing.id]: null });
    await release();
    expect(fetch).toHaveBeenCalledWith(failing.id);
    expect(cardCover().style.backgroundColor).toBe("rgb(204, 0, 0)");
    expect(cardCover().querySelector("img")).toBeNull();
    expect(screen.getByTestId("compass-details").textContent).toContain("8B");
  });
});

describe("Compass centre", () => {
  it("draws the now-playing cover with its key below", async () => {
    const { release } = setup(covered, null, { [covered.id]: "data:image/jpeg;base64,BB" });
    const centre = screen.getByTestId("centre-cover");
    expect(screen.getByTestId("centre-key").textContent).toBe("9A");
    expect(centre.querySelector<HTMLElement>("[data-testid=cover]")!.style.backgroundColor).toBe("rgb(51, 102, 153)");
    await release();
    expect(centre.querySelector("img")?.getAttribute("src")).toBe("data:image/jpeg;base64,BB");
    // unovis grows the node under the cover and leaves the key to the pill.
    expect(centreNode(covered)).toEqual({ size: 48, label: "" });
  });

  it("draws today's centre node when the now-playing track has no cover", () => {
    setup(plainCurrent, null);
    expect(screen.queryByTestId("centre-cover")).toBeNull();
    expect(centreNode(plainCurrent)).toEqual({ size: 34, label: "8A" });
  });
});
