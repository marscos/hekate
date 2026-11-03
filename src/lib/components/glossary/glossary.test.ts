// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOVE_INFO, MOVE_LABEL, sharedNotesText, type Move } from "$lib/engine/camelot";
import Glossary from "./glossary.svelte";

beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));

async function openGlossary() {
  render(Glossary);
  await fireEvent.click(screen.getByRole("button", { name: "Glossary" }));
  return screen.findByTestId("glossary");
}

describe("Glossary", () => {
  it("lists every move with its meaning and shared notes", async () => {
    const g = await openGlossary();
    for (const move of Object.keys(MOVE_LABEL) as Move[]) {
      const dd = g.querySelector(`dd[data-move="${move}"]`)!;
      expect(dd.previousElementSibling!.textContent).toBe(MOVE_LABEL[move]);
      expect(dd.textContent).toContain(MOVE_INFO[move].meaning);
      expect(dd.textContent).toContain(sharedNotesText(move));
    }
  });

  it("explains risk, mood, badges and half/double time", async () => {
    const text = (await openGlossary()).textContent!.replace(/\s+/g, " ");
    expect(text).toContain("How far apart the two keys are");
    expect(text).toMatch(/Safe is below 0\.35, moderate from 0\.35 to 0\.70, and bold from 0\.70/);
    expect(text).toContain("Brighter means the target key is major, darker that it is minor");
    const badges = screen.getByTestId("glossary-badges").textContent!.replace(/\s+/g, " ");
    expect(badges).toContain("⚡ “+2 energy boost”");
    expect(badges).toContain("↑ “semitone lift”");
    expect(badges).toContain("They don't change risk or mood.");
    expect(text).toContain("half or double time");
  });
});
