import { invoke } from "@tauri-apps/api/core";
import type { AccessInfo, Library, LibraryError } from "./types";

export const libraryAccessInfo = () => invoke<AccessInfo>("library_access_info");
export const loadLibrary = () => invoke<Library>("load_library");
export const reloadLibrary = () => invoke<Library>("reload_library");
export const setLibraryPath = (path: string) => invoke<Library>("set_library_path", { path });

export function isLibraryError(e: unknown): e is LibraryError {
  return typeof e === "object" && e !== null && "kind" in e;
}

export function describeLibraryError(e: unknown): string {
  if (!isLibraryError(e)) return String(e);
  switch (e.kind) {
    case "notFound":
      return "No Mixxx library was found in the usual locations.";
    case "permissionDenied":
      return `macOS denied access to ${e.path}.`;
    case "invalidLibrary":
      return `${e.path} is not a Mixxx library (${e.reason}).`;
    case "read":
      return `Could not read ${e.path}: ${e.reason}`;
  }
}
