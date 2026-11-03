<script lang="ts">
  // Library summary for the top bar: counts, reload, and the last load error.
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { pickLibraryFile } from "$lib/library/pick-file";
  import type { LibraryState } from "$lib/state/library.svelte";
  import FolderOpen from "@lucide/svelte/icons/folder-open";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

  let { library }: { library: LibraryState } = $props();
  let reloading = $state(false);

  async function reload() {
    reloading = true;
    await library.reload();
    reloading = false;
  }

  async function chooseFile() {
    const path = await pickLibraryFile();
    if (path) await library.choose(path);
  }
</script>

{#if library.library}
  <div class="flex shrink-0 items-center gap-1 text-sm">
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger class="text-muted-foreground tabular-nums" data-testid="library-counts">
          {library.usableCount}<span class="hidden 2xl:inline">{" tracks"}</span>{#if library.library.excludedCount > 0}<span class="hidden 2xl:inline">{" · "}{library.library.excludedCount} excluded</span>{/if}
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p class="max-w-xs break-all">{library.library.path}</p>
          {#if library.library.excludedCount > 0}
            <p>{library.library.excludedCount} tracks have no key or BPM yet and are left out of suggestions.</p>
          {/if}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
    <Button variant="ghost" size="icon-sm" aria-label="Reload library" title="Reload library" onclick={reload} disabled={reloading}>
      <RefreshCw class={reloading ? "animate-spin" : ""} />
    </Button>
    <Button variant="ghost" size="icon-sm" aria-label="Choose library file" title="Choose library file" onclick={chooseFile}>
      <FolderOpen />
    </Button>
    {#if library.errorMessage}
      <span class="flex items-center gap-1 text-destructive" role="alert" data-testid="library-error">
        <TriangleAlert class="size-4" />{library.errorMessage}
      </span>
    {/if}
  </div>
{/if}
