// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MoveLabel from "./move-label.svelte";
import { description, renderWithTooltips } from "./test-utils";

// The tooltip's floating layer measures itself; jsdom has no ResizeObserver.
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));

describe("MoveLabel", () => {
  it("shows the move name and describes it with its meaning and shared notes", () => {
    renderWithTooltips(MoveLabel, { move: "diagonal" });
    const label = screen.getByTestId("move-label");
    expect(label.textContent).toBe("diagonal");
    expect(description(label)).toBe("One step around the wheel and a swap between minor and major. 6 of 7 notes shared.");
  });

  it("is not a tab stop", () => {
    renderWithTooltips(MoveLabel, { move: "up2" });
    expect(screen.getByTestId("move-label").getAttribute("tabindex")).toBe("-1");
  });

  it("opens the explanation on hover", async () => {
    renderWithTooltips(MoveLabel, { move: "up2" });
    await fireEvent.pointerEnter(screen.getByTestId("move-label"), { pointerType: "mouse" });
    const tip = await screen.findByText("Up a whole tone, two steps clockwise. Same mode.", { selector: "[data-slot=tooltip-content] *" });
    expect(tip.parentElement!.textContent).toContain("5 of 7 notes shared");
  });
});
