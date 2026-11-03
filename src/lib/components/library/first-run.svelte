<script lang="ts">
  // Shown until a library is loaded: the macOS access explanation, loading,
  // and failures with a manual file picker (spec: mixxx-library-import).
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { pickLibraryFile } from "$lib/library/pick-file";
  import type { LibraryState } from "$lib/state/library.svelte";
  import FolderOpen from "@lucide/svelte/icons/folder-open";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";

  let { library }: { library: LibraryState } = $props();

  async function chooseFile() {
    const path = await pickLibraryFile();
    if (path) await library.choose(path);
  }
</script>

<div class="flex h-screen items-center justify-center bg-background p-6 text-foreground">
  <Card.Root class="w-full max-w-xl">
    {#if library.phase === "notice"}
      <Card.Header>
        <Card.Title>Reading your Mixxx library</Card.Title>
        <Card.Description>hekate reads Mixxx's library to suggest your next track. It never changes anything in it.</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3 text-sm text-muted-foreground">
        <p>
          Mixxx keeps its library inside its own app folder, so macOS will ask whether
          <span class="font-medium text-foreground">hekate</span> may access data from other apps. Choose
          <span class="font-medium text-foreground">Allow</span> to let hekate find the library automatically.
        </p>
        <p>If you prefer, you can point hekate at the library file yourself instead.</p>
      </Card.Content>
      <Card.Footer class="gap-2">
        <Button onclick={() => library.acknowledgeNotice()}>Continue</Button>
        <Button variant="outline" onclick={chooseFile}><FolderOpen />Choose file…</Button>
      </Card.Footer>
    {:else if library.phase === "failed"}
      {@const error = library.error}
      <Card.Header>
        <Card.Title>
          {#if typeof error === "object" && error?.kind === "permissionDenied"}
            hekate can't read the Mixxx library
          {:else if typeof error === "object" && error?.kind === "notFound"}
            No Mixxx library found
          {:else}
            The Mixxx library couldn't be loaded
          {/if}
        </Card.Title>
        <Card.Description>{library.errorMessage}</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3 text-sm text-muted-foreground">
        {#if typeof error === "object" && error?.kind === "permissionDenied"}
          <p>
            macOS didn't allow hekate to access Mixxx's app data. You can allow it later in
            <span class="font-medium text-foreground">System Settings › Privacy &amp; Security</span>, then reopen
            hekate. Or choose the library file below.
          </p>
        {:else if typeof error === "object" && error?.kind === "notFound"}
          <p>hekate looked in these places:</p>
          <ul class="list-disc space-y-1 pl-5 font-mono text-xs break-all">
            {#each error.searched as path (path)}<li>{path}</li>{/each}
          </ul>
          <p>If Mixxx keeps its library somewhere else, choose the <code>mixxxdb.sqlite</code> file.</p>
        {:else}
          <p>Choose a <code>mixxxdb.sqlite</code> file from Mixxx's settings folder.</p>
        {/if}
      </Card.Content>
      <Card.Footer class="gap-2">
        <Button onclick={chooseFile}><FolderOpen />Choose file…</Button>
        <Button variant="outline" onclick={() => library.reload()}>Try again</Button>
      </Card.Footer>
    {:else}
      <Card.Content class="flex items-center gap-3 py-6 text-sm text-muted-foreground">
        <LoaderCircle class="size-4 animate-spin" />Loading your Mixxx library…
      </Card.Content>
    {/if}
  </Card.Root>
</div>
