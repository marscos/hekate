<script lang="ts">
  // Test helper: renders a component inside a Tooltip.Provider, as +page.svelte does.
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Component } from "svelte";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { component: C, props }: { component: Component<any>; props: Record<string, unknown> } = $props();
</script>

<Tooltip.Provider delayDuration={0}>
  <C {...props} />
</Tooltip.Provider>
