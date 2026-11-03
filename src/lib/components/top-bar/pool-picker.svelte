<script lang="ts">
  // Choose which Mixxx crates supply candidates (spec: track-pool).
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Popover from "$lib/components/ui/popover";
  import type { Crate } from "$lib/library/types";
  import type { PoolState } from "$lib/state/pool.svelte";
  import Library from "@lucide/svelte/icons/library-big";

  let { pool, crates }: { pool: PoolState; crates: Crate[] } = $props();

  const label = $derived(
    pool.selected.length === 0
      ? "Whole library"
      : pool.selected.length === 1
        ? (crates.find((c) => c.id === pool.selected[0])?.name ?? "1 crate")
        : `${pool.selected.length} crates`,
  );
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <!-- Fixed width, so a longer crate name doesn't shift the rest of the top bar. -->
      <Button {...props} variant="outline" size="sm" class="w-48 justify-start" title={label} data-testid="pool-picker">
        <Library /><span class="min-w-0 truncate">{label}</span><span class="shrink-0 text-muted-foreground tabular-nums">· {pool.ids.size}</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-64 p-2" align="start">
    <p class="px-2 pb-2 text-xs text-muted-foreground">Suggestions and routes use tracks from these crates.</p>
    <button
      class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent {pool.selected.length === 0 ? 'font-medium' : ''}"
      onclick={() => pool.setSelected([])}
    >
      Whole library
    </button>
    <div class="max-h-72 overflow-y-auto">
      {#each crates as c (c.id)}
        <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
          <Checkbox checked={pool.selected.includes(c.id)} onCheckedChange={() => pool.toggle(c.id)} />
          <span class="flex-1 truncate">{c.name}</span>
          <span class="text-xs text-muted-foreground tabular-nums">{c.trackIds.length}</span>
        </label>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
