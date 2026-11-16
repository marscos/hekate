// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "$lib/engine/test-tracks";
import type { Library } from "$lib/library/types";
import { LibraryState } from "$lib/state/library.svelte";
import { NowPlayingState } from "$lib/state/now-playing.svelte";
import { Session } from "$lib/state/session.svelte";
import TopBar from "./top-bar.svelte";

const library: Library = {
  path: "/m/mixxxdb.sqlite",
  tracks: [track(1, "8A", 100), track(2, "8A", 105)],
  excludedCount: 0,
  crates: [],
  histories: [],
};

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  // bits-ui's slider measures itself; jsdom has no ResizeObserver.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

function session() {
  const lib = new LibraryState();
  lib.library = library;
  lib.phase = "ready";
  return new Session(lib, new NowPlayingState(false));
}

describe("TopBar tolerance", () => {
  it("applies and saves a keyboard step straight away", async () => {
    const s = session();
    render(TopBar, { session: s });
    await fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(s.tolerance).toBeCloseTo(0.065);
    expect(screen.getByTestId("tolerance").textContent).toBe("±6.5%");
    expect(store.get("hekate.bpmTolerance")).toBe("0.065");
  });

  it("moves the readout when the tolerance changes elsewhere", () => {
    const s = session();
    render(TopBar, { session: s });
    s.setTolerance(0.08);
    flushSync();
    expect(screen.getByTestId("tolerance").textContent).toBe("±8%");
    expect(screen.getByRole("slider").getAttribute("aria-valuenow")).toBe("8");
    // A synced value must not count as a drag, or later syncs would be ignored.
    s.setTolerance(0.1);
    flushSync();
    expect(screen.getByTestId("tolerance").textContent).toBe("±10%");
  });
});
