import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "$lib/library/types";
import { LibraryState, type LibraryApi } from "./library.svelte";

const lib = (path: string, tracks = 2): Library => ({
  path,
  tracks: Array.from({ length: tracks }, (_, i) => ({
    id: i + 1,
    artist: "A",
    title: `T${i}`,
    duration: 200,
    bpm: 120,
    keyId: 1,
    camelot: { num: 8, letter: "B" },
    usable: true,
  })),
  excludedCount: 0,
  crates: [],
  histories: [],
});

function api(overrides: Partial<LibraryApi> = {}): LibraryApi {
  return {
    libraryAccessInfo: vi.fn(async () => ({ needsAppDataPermission: false })),
    loadLibrary: vi.fn(async () => lib("/mixxx/mixxxdb.sqlite")),
    reloadLibrary: vi.fn(async () => lib("/mixxx/mixxxdb.sqlite", 3)),
    setLibraryPath: vi.fn(async (path: string) => lib(path)),
    ...overrides,
  };
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});

describe("LibraryState", () => {
  it("loads straight away when no macOS prompt is expected", async () => {
    const a = api();
    const s = new LibraryState(a);
    await s.start();
    expect(s.phase).toBe("ready");
    expect(s.library?.path).toBe("/mixxx/mixxxdb.sqlite");
    expect(s.usableCount).toBe(2);
  });

  it("explains the macOS prompt before the first read, once", async () => {
    const a = api({ libraryAccessInfo: vi.fn(async () => ({ needsAppDataPermission: true })) });
    const s = new LibraryState(a);
    await s.start();
    expect(s.phase).toBe("notice");
    expect(a.loadLibrary).not.toHaveBeenCalled();

    await s.acknowledgeNotice();
    expect(s.phase).toBe("ready");

    const next = new LibraryState(a);
    await next.start();
    expect(next.phase).toBe("ready");
  });

  it("reports a failure when nothing could be loaded", async () => {
    const a = api({ loadLibrary: vi.fn(async () => Promise.reject({ kind: "permissionDenied", path: "/c/mixxxdb.sqlite" })) });
    const s = new LibraryState(a);
    await s.start();
    expect(s.phase).toBe("failed");
    expect(s.errorMessage).toBe("macOS denied access to /c/mixxxdb.sqlite.");
  });

  it("keeps the previous library when a chosen file is invalid", async () => {
    const a = api({ setLibraryPath: vi.fn(async () => Promise.reject({ kind: "invalidLibrary", path: "/x.txt", reason: "file is not a database" })) });
    const s = new LibraryState(a);
    await s.start();
    await s.choose("/x.txt");
    expect(s.phase).toBe("ready");
    expect(s.library?.path).toBe("/mixxx/mixxxdb.sqlite");
    expect(s.errorMessage).toContain("/x.txt is not a Mixxx library");
  });

  it("reload replaces the library and clears the error", async () => {
    const a = api();
    const s = new LibraryState(a);
    await s.start();
    s.error = "stale";
    await s.reload();
    expect(s.library?.tracks).toHaveLength(3);
    expect(s.error).toBeNull();
  });
});
