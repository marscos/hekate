import { describe, expect, it } from "vitest";
import type { Camelot, Letter } from "$lib/library/types";
import { classifyMove, MOVE_INFO, MOVE_LABEL, reachableCodes, sharedNotesText, wheelDirection, type Move } from "./camelot";
import { tonic } from "./risk";

const k = (code: string): Camelot => ({ num: Number(code.slice(0, -1)), letter: code.slice(-1) as Letter });

describe("classifyMove", () => {
  it.each([
    ["8A", "8A", "same"],
    ["8A", "9A", "up1"],
    ["8A", "7A", "down1"],
    ["12A", "1A", "up1"],
    ["8A", "8B", "relative"],
    ["8B", "8A", "relative"],
    ["8A", "9B", "diagonal"],
    ["8A", "7B", "diagonal"],
    ["8A", "10A", "up2"],
    ["8A", "6A", "down2"],
    ["8A", "3A", "semitoneUp"],
    ["8A", "1A", "semitoneDown"],
    ["8A", "11B", "parallel"],
    ["8B", "5A", "parallel"],
  ])("%s → %s is %s", (from, to, move) => {
    expect(classifyMove(k(from), k(to))).toBe(move);
  });

  it.each([["8A", "2A"], ["8A", "4A"], ["8A", "12B"], ["8B", "11A"]])("%s → %s is unrelated", (from, to) => {
    expect(classifyMove(k(from), k(to))).toBeNull();
  });
});

describe("wheelDirection", () => {
  it("is positive clockwise and takes the short way round", () => {
    expect(wheelDirection(k("8A"), k("9A"))).toBe(1);
    expect(wheelDirection(k("8A"), k("7A"))).toBe(-1);
    expect(wheelDirection(k("8A"), k("3A"))).toBe(-5);
    expect(wheelDirection(k("8A"), k("1A"))).toBe(5);
    expect(wheelDirection(k("8A"), k("11B"))).toBe(3);
    expect(wheelDirection(k("8A"), k("8B"))).toBe(0);
  });
});

describe("reachableCodes", () => {
  it("lists the 11 keys reachable by catalogue moves", () => {
    expect(reachableCodes(k("8A")).map((c) => `${c.num}${c.letter}`).sort()).toEqual(
      ["8A", "9A", "7A", "10A", "6A", "3A", "1A", "8B", "9B", "7B", "11B"].sort(),
    );
  });
});

describe("MOVE_INFO", () => {
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const scale = (c: Camelot) => new Set((c.letter === "B" ? MAJOR : MINOR).map((i) => (tonic(c) + i) % 12));
  const ALL_KEYS: Camelot[] = (["A", "B"] as const).flatMap((letter) => Array.from({ length: 12 }, (_, i) => ({ num: i + 1, letter })));
  const moves = Object.keys(MOVE_LABEL) as Move[];

  it("has a meaning for every move", () => {
    expect(Object.keys(MOVE_INFO).sort()).toEqual([...moves].sort());
    for (const m of moves) expect(MOVE_INFO[m].meaning.length).toBeGreaterThan(0);
  });

  it("counts the shared notes of the real scales, from every key", () => {
    const seen = new Set<Move>();
    for (const from of ALL_KEYS) {
      const a = scale(from);
      for (const to of reachableCodes(from)) {
        const move = classifyMove(from, to)!;
        seen.add(move);
        const shared = [...scale(to)].filter((pc) => a.has(pc)).length;
        expect(shared, `${from.num}${from.letter} → ${to.num}${to.letter} (${move})`).toBe(MOVE_INFO[move].sharedNotes);
      }
    }
    expect(seen.size).toBe(moves.length);
  });

  it("states the shared-note count per move (as from 8A)", () => {
    expect(moves.map((m) => [m, sharedNotesText(m)])).toEqual([
      ["same", "7 of 7 notes shared"],
      ["up1", "6 of 7 notes shared"],
      ["down1", "6 of 7 notes shared"],
      ["relative", "7 of 7 notes shared"],
      ["diagonal", "6 of 7 notes shared"],
      ["up2", "5 of 7 notes shared"],
      ["down2", "5 of 7 notes shared"],
      ["semitoneUp", "2 of 7 notes shared"],
      ["semitoneDown", "2 of 7 notes shared"],
      ["parallel", "4 of 7 notes shared"],
    ]);
  });

  it("explains the relative and semitone moves", () => {
    expect(MOVE_INFO.relative.meaning).toMatch(/same notes/i);
    expect(MOVE_INFO.relative.meaning).toMatch(/minor and major swap/i);
    for (const m of ["semitoneUp", "semitoneDown"] as const) {
      expect(MOVE_INFO[m].meaning).toMatch(/half step/);
      expect(MOVE_INFO[m].meaning).toMatch(/7 steps/);
      expect(MOVE_INFO[m].meaning).toMatch(/same mode/i);
    }
    expect(MOVE_INFO.semitoneUp.meaning).toMatch(/^Up a half step/);
  });

  it("makes no claims about energy or feel", () => {
    for (const m of moves) expect(MOVE_INFO[m].meaning).not.toMatch(/energy|lift|boost|smooth|tension/i);
  });
});
