<script lang="ts">
  // A move name that explains itself on hover (spec: transition-glossary).
  // Not a tab stop: it sits inside listbox options, and keyboard users get the
  // meaning from the compass details and the glossary. The meaning is also the
  // trigger's accessible description, so screen readers announce it.
  // Needs a Tooltip.Provider above it (mounted in +page.svelte).
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { MOVE_INFO, MOVE_LABEL, sharedNotesText, type Move } from "$lib/engine/camelot";
  import { cn } from "$lib/utils";

  interface Props {
    move: Move;
    /** Extra text after the name, inside the trigger (e.g. "+3 more"). */
    suffix?: string;
    class?: string;
    side?: "top" | "right" | "bottom" | "left";
  }
  let { move, suffix = "", class: className, side = "top" }: Props = $props();

  const uid = $props.id();
  const descId = `move-desc-${uid}`;
</script>

<Tooltip.Root>
  <Tooltip.Trigger tabindex={-1}>
    {#snippet child({ props })}
      {@const { type: _type, ...rest } = props}
      <span
        {...rest}
        aria-describedby={[props["aria-describedby"], descId].filter(Boolean).join(" ")}
        class={cn("cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-2", className)}
        data-testid="move-label">{MOVE_LABEL[move]}{suffix}</span
      >
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content {side} class="flex-col items-start gap-0.5 text-left">
    <span class="font-medium">{MOVE_LABEL[move]}</span>
    <span>{MOVE_INFO[move].meaning}</span>
    <span class="opacity-75">{sharedNotesText(move)}</span>
  </Tooltip.Content>
</Tooltip.Root>
<!-- Hidden, but still read as the trigger's description. -->
<span id={descId} hidden>{MOVE_INFO[move].meaning} {sharedNotesText(move)}.</span>
