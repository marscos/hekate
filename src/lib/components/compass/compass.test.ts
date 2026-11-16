// @vitest-environment jsdom
import { screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { description, renderWithTooltips } from "$lib/components/glossary/test-utils";
import { MOVE_INFO, sharedNotesText } from "$lib/engine/camelot";
import { rankSuggestions } from "$lib/engine/ranking";
import { track } from "$lib/engine/test-tracks";
import { transitionsFrom } from "$lib/engine/transition";
import Compass from "./compass.svelte";

beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));

const current = track(1, "8A", 125);
const candidates = [track(2, "9A", 126), track(3, "8B", 125), track(4, "10A", 125)];
const tracksById = new Map([current, ...candidates].map((t) => [t.id, t]));
const suggestions = rankSuggestions(transitionsFrom(current, candidates, 0.06), new Set(), 0.06);

const props = (selectedId: number | null) => ({ current, suggestions, tracksById, selectedId, onSelect: vi.fn(), onNowPlaying: vi.fn() });

describe("Compass", () => {
  it("shows the selected suggestion's move meaning in the details", () => {
    renderWithTooltips(Compass, props(3));
    const details = screen.getByTestId("compass-details");
    expect(details.textContent).toContain("relative");
    expect(screen.getByTestId("compass-move-meaning").textContent).toBe(MOVE_INFO.relative.meaning);
  });

  it("explains each slot label", () => {
    renderWithTooltips(Compass, props(null));
    const labels = screen.getAllByTestId("move-label");
    const plus2 = labels.find((l) => l.textContent === "+2")!;
    expect(description(plus2)).toBe(`${MOVE_INFO.up2.meaning} ${sharedNotesText("up2")}.`);
    expect(labels.map((l) => l.textContent).sort()).toEqual(["+1", "+2", "relative"]);
  });
});
