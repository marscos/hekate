import { open } from "@tauri-apps/plugin-dialog";

/** Asks the user for a Mixxx database file. Returns `null` when cancelled. */
export async function pickLibraryFile(): Promise<string | null> {
  const picked = await open({
    title: "Choose your Mixxx library (mixxxdb.sqlite)",
    multiple: false,
    directory: false,
    filters: [{ name: "Mixxx library", extensions: ["sqlite"] }],
  });
  return typeof picked === "string" ? picked : null;
}
