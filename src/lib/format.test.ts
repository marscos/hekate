import { describe, expect, it } from "vitest";
import { track } from "$lib/engine/test-tracks";
import { formatGap, formatMinutes, formatTolerance, matchesQuery, riskBand } from "./format";

describe("format", () => {
  it("signs BPM gaps", () => {
    expect(formatGap(0.8)).toBe("+0.8%");
    expect(formatGap(-3.24)).toBe("−3.2%");
    expect(formatGap(0.01)).toBe("±0.0%");
  });

  it("formats the tolerance without a trailing .0", () => {
    expect(formatTolerance(0.06)).toBe("±6%");
    expect(formatTolerance(0.065)).toBe("±6.5%");
  });

  it("rounds durations to minutes", () => {
    expect(formatMinutes(20)).toBe("under a minute");
    expect(formatMinutes(19 * 60 + 40)).toBe("20 min");
  });

  it("bands risk", () => {
    expect(riskBand(0)).toBe("safe");
    expect(riskBand(0.44)).toBe("moderate");
    expect(riskBand(0.93)).toBe("bold");
  });

  it("matches every query word against artist and title", () => {
    const t = { ...track(1, "8A", 120), artist: "Daft Punk", title: "One More Time" };
    expect(matchesQuery(t, "daft time")).toBe(true);
    expect(matchesQuery(t, "daft around")).toBe(false);
  });
});
