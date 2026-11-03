import { describeLibraryError, isLibraryError, libraryAccessInfo, loadLibrary, reloadLibrary, setLibraryPath } from "$lib/library/api";
import type { Library, LibraryError, Track } from "$lib/library/types";
import { readPreference, writePreference } from "./preferences";

const NOTICE_SEEN = "accessNoticeSeen";

export type LibraryPhase =
  /** Before the first load attempt. */
  | "starting"
  /** macOS will prompt for "access data from other apps"; explain first. */
  | "notice"
  | "loading"
  | "ready"
  /** No library could be loaded; see `error`. */
  | "failed";

export interface LibraryApi {
  libraryAccessInfo: typeof libraryAccessInfo;
  loadLibrary: typeof loadLibrary;
  reloadLibrary: typeof reloadLibrary;
  setLibraryPath: typeof setLibraryPath;
}

const defaultApi: LibraryApi = { libraryAccessInfo, loadLibrary, reloadLibrary, setLibraryPath };

export class LibraryState {
  phase = $state<LibraryPhase>("starting");
  library = $state<Library | null>(null);
  /** The last load error. Kept alongside a still-usable previous library. */
  error = $state<LibraryError | string | null>(null);

  tracksById = $derived(new Map<number, Track>((this.library?.tracks ?? []).map((t) => [t.id, t])));
  usableCount = $derived(this.library ? this.library.tracks.length - this.library.excludedCount : 0);
  errorMessage = $derived(this.error === null ? null : describeLibraryError(this.error));

  constructor(private api: LibraryApi = defaultApi) {}

  /** First load at startup, explaining the macOS prompt first when needed. */
  async start() {
    try {
      const info = await this.api.libraryAccessInfo();
      if (info.needsAppDataPermission && !readPreference(NOTICE_SEEN, false)) {
        this.phase = "notice";
        return;
      }
    } catch {
      // Fall through and try to load; the load reports any problem.
    }
    await this.run(() => this.api.loadLibrary());
  }

  async acknowledgeNotice() {
    writePreference(NOTICE_SEEN, true);
    await this.run(() => this.api.loadLibrary());
  }

  reload() {
    return this.run(() => this.api.reloadLibrary());
  }

  /** Loads a user-picked file. On failure the previous library stays in use. */
  choose(path: string) {
    return this.run(() => this.api.setLibraryPath(path));
  }

  private async run(load: () => Promise<Library>) {
    const hadLibrary = this.library !== null;
    if (!hadLibrary) this.phase = "loading";
    try {
      this.library = await load();
      this.error = null;
      this.phase = "ready";
    } catch (e) {
      this.error = isLibraryError(e) ? e : String(e);
      this.phase = hadLibrary ? "ready" : "failed";
    }
  }
}
