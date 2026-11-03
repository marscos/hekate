// @vitest-environment jsdom
import { screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { description, renderWithTooltips } from "$lib/components/glossary/test-utils";
import { MOVE_INFO, MOVE_LABEL, sharedNotesText } from "$lib/engine/camelot";
import { track } from "$lib/engine/test-tracks";
import { describeTransition } from "$lib/engine/transition";
import RouteSummary from "./route-summary.svelte";

beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));

const path = [track(1, "8A", 125), track(2, "9A", 125), track(3, "9B", 126), track(4, "4B", 126)];
const steps = path.slice(1).map((t, i) => describeTransition(path[i], t, 0.06)!);
const tracksById = new Map(path.map((t) => [t.id, t]));

describe("RouteSummary", () => {
  it("explains the move of each route step", () => {
    renderWithTooltips(RouteSummary, {
      tracks: path,
      tracksById,
      request: path[3],
      route: { kind: "route", steps, trackIds: path.map((t) => t.id), estimatedSeconds: 600 },
      hasCurrent: true,
      tolerance: 0.06,
      onRequest: vi.fn(),
      onClear: vi.fn(),
      onWiden: vi.fn(),
    });
    expect(steps.map((s) => s.move)).toEqual(["up1", "relative", "semitoneUp"]);
    const labels = screen.getAllByTestId("move-label");
    expect(labels.map((l) => l.textContent)).toEqual(steps.map((s) => MOVE_LABEL[s.move]));
    labels.forEach((l, i) => expect(description(l)).toBe(`${MOVE_INFO[steps[i].move].meaning} ${sharedNotesText(steps[i].move)}.`));
  });
});
