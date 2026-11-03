import { describe, expect, it } from "vitest";
import { describeLibraryError } from "./api";

describe("describeLibraryError", () => {
  it("names the file for an invalid library", () => {
    expect(describeLibraryError({ kind: "invalidLibrary", path: "/x/notes.txt", reason: "file is not a database" })).toBe(
      "/x/notes.txt is not a Mixxx library (file is not a database).",
    );
  });

  it("falls back to the raw value for unknown errors", () => {
    expect(describeLibraryError("boom")).toBe("boom");
  });
});
