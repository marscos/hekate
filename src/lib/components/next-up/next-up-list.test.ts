// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { rankSuggestions } from "$lib/engine/ranking";
import { track } from "$lib/engine/test-tracks";
import { transitionsFrom } from "$lib/engine/transition";
import NextUpList from "./next-up-list.svelte";

const current = track(1, "8A", 125);
const candidates = [track(2, "9A", 126), track(3, "8A", 125), track(4, "3A", 125), track(5, "8B", 131)];
const tracksById = new Map([current, ...candidates].map((t) => [t.id, t]));

function props(overrides: Record<string, unknown> = {}) {
  const played = (overrides.played as Set<number>) ?? new Set<number>();
  return {
    suggestions: rankSuggestions(transitionsFrom(current, candidates, 0.06), played, 0.06),
    tracksById,
    hasCurrent: true,
    tolerance: 0.06,
    sort: "best" as const,
    selectedId: null,
    onSort: vi.fn(),
    onSelect: vi.fn(),
    onNowPlaying: vi.fn(),
    onRequest: vi.fn(),
    onWiden: vi.fn(),
    ...overrides,
  };
}

const rowIds = () => screen.getAllByTestId("suggestion").map((r) => Number(r.dataset.trackId));

describe("NextUpList", () => {
  it("shows suggestions best first with their details", () => {
    render(NextUpList, props());
    // Same key and no BPM gap is best; the semitone move is riskiest.
    expect(rowIds()[0]).toBe(3);
    const row = screen.getAllByTestId("suggestion").find((r) => r.dataset.trackId === "2")!;
    expect(row.textContent).toContain("9A");
    expect(row.textContent).toContain("126.0");
    expect(row.textContent).toContain("+0.8%");
    expect(row.textContent).toContain("+1");
    expect(row.textContent).toContain("darker");
    expect(screen.getAllByTestId("suggestion").find((r) => r.dataset.trackId === "4")!.textContent).toContain("semitone lift");
  });

  it("puts played tracks last and dims them", () => {
    render(NextUpList, props({ played: new Set([3]) }));
    expect(rowIds().at(-1)).toBe(3);
    expect(screen.getAllByTestId("suggestion").at(-1)!.className).toContain("opacity-45");
  });

  it("asks for a now-playing track when there is none", () => {
    render(NextUpList, props({ hasCurrent: false, suggestions: [] }));
    expect(screen.getByTestId("next-up-empty").textContent).toContain("Set a now-playing track");
  });

  it("offers to widen the tolerance when nothing is compatible", async () => {
    const p = props({ suggestions: [] });
    render(NextUpList, p);
    expect(screen.getByTestId("next-up-empty").textContent).toContain("No compatible tracks in the pool at ±6% BPM");
    await fireEvent.click(screen.getByRole("button", { name: "Widen tolerance" }));
    expect(p.onWiden).toHaveBeenCalled();
  });

  it("acts on the selected suggestion from the keyboard", async () => {
    const p = props({ selectedId: 2 });
    render(NextUpList, p);
    const list = screen.getByRole("listbox", { name: "Next up" });
    await fireEvent.keyDown(list, { key: "Enter" });
    expect(p.onNowPlaying).toHaveBeenCalledWith(2);
    await fireEvent.keyDown(list, { key: "r" });
    expect(p.onRequest).toHaveBeenCalledWith(2);
    await fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(p.onSelect).toHaveBeenCalled();
  });

  it("requests a different sort", async () => {
    const p = props();
    render(NextUpList, p);
    await fireEvent.click(screen.getByRole("button", { name: "BPM gap" }));
    expect(p.onSort).toHaveBeenCalledWith("bpm");
  });
});
