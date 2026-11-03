<script lang="ts" generics="N extends GraphInputNode, L extends GraphInputLink">
  // Thin Svelte 5 wrapper around @unovis/ts. The official @unovis/svelte
  // wrapper still declares a Svelte 4 peer dependency (design D13).
  import {
    Graph,
    SingleContainer,
    type GraphConfigInterface,
    type GraphInputData,
    type GraphInputLink,
    type GraphInputNode,
  } from "@unovis/ts";
  import { untrack } from "svelte";

  interface Props {
    data: GraphInputData<N, L>;
    config: GraphConfigInterface<N, L>;
    class?: string;
  }

  let { data, config, class: className = "" }: Props = $props();

  let element: HTMLDivElement;
  let container: SingleContainer<GraphInputData<N, L>> | undefined;
  // Skip the first run of the update effects: the container was just created
  // with the same data and config.
  let skipConfig = true;
  let skipData = true;

  $effect(() => {
    const graph = new Graph<N, L>(untrack(() => config));
    container = new SingleContainer(element, { component: graph }, untrack(() => data));
    return () => {
      container?.destroy();
      container = undefined;
    };
  });

  $effect(() => {
    const next = config;
    if (skipConfig) return void (skipConfig = false);
    container?.updateComponent(next);
  });

  $effect(() => {
    const next = data;
    if (skipData) return void (skipData = false);
    container?.setData(next);
  });
</script>

<div bind:this={element} class={className}></div>
