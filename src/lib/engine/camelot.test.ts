import { describe, expect, it } from "vitest";
import type { Camelot, Letter } from "$lib/library/types";
import { classifyMove, reachableCodes, wheelDirection } from "./camelot";

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
