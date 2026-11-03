<script lang="ts">
  // The glossary of transition terms (spec: transition-glossary, design D5).
  // Opens from its button or the `?` key outside text fields; Escape or a
  // click outside closes it.
  import { Button } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import { MOVE_INFO, MOVE_LABEL, sharedNotesText, type Move } from "$lib/engine/camelot";
  import { CONVENTION_BADGE, CONVENTION_LABEL } from "$lib/engine/transition";
  import { formatRisk, RISK_BAND_START } from "$lib/format";
  import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";

  let open = $state(false);

  // Paired moves share a row: ±1, ±2, semitone up/down.
  const groups: Move[][] = [["same"], ["up1", "down1"], ["relative"], ["diagonal"], ["up2", "down2"], ["semitoneUp", "semitoneDown"], ["parallel"]];
  const conventions = (Object.keys(CONVENTION_LABEL) as Move[]).map((m) => ({ badge: CONVENTION_BADGE[m], label: CONVENTION_LABEL[m] }));

  function onWindowKeydown(e: KeyboardEvent) {
    const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName));
    if (e.key === "?" && !typing) {
      e.preventDefault();
      open = true;
    }
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} size="icon-sm" variant="ghost" aria-label="Glossary" title="Glossary  ( ? )"><CircleQuestionMark /></Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="end" class="max-h-[80vh] w-[30rem] gap-4 overflow-y-auto text-xs" data-testid="glossary">
    <div>
      <h2 class="text-sm font-semibold">Glossary</h2>
      <p class="text-muted-foreground">What hekate's transition terms mean.</p>
    </div>

    <section>
      <h3 class="mb-1.5 font-medium">Moves</h3>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3">
        {#each groups as group (group[0])}
          <div class="col-span-2 grid grid-cols-subgrid gap-y-1 border-t py-1.5 first:border-t-0 first:pt-0">
            {#each group as move (move)}
              <dt class="font-medium whitespace-nowrap">{MOVE_LABEL[move]}</dt>
              <dd data-move={move}>
                {MOVE_INFO[move].meaning}
                <span class="text-muted-foreground">{sharedNotesText(move)}.</span>
              </dd>
            {/each}
          </div>
        {/each}
      </dl>
    </section>

    <section>
      <h3 class="mb-1 font-medium">Risk</h3>
      <p>
        How far apart the two keys are, from 0 (same key) to 1 (the most distant move hekate suggests).
        <span class="text-risk-safe">Safe</span> is below {formatRisk(RISK_BAND_START.moderate)},
        <span class="text-risk-moderate">moderate</span> from {formatRisk(RISK_BAND_START.moderate)} to {formatRisk(RISK_BAND_START.bold)},
        and <span class="text-risk-bold">bold</span> from {formatRisk(RISK_BAND_START.bold)}.
      </p>
    </section>

    <section>
      <h3 class="mb-1 font-medium">Mood</h3>
      <p>
        <span class="text-mood-brighter">Brighter</span> means the target key is major, <span class="text-mood-darker">darker</span> that it is minor.
      </p>
    </section>

    <section>
      <h3 class="mb-1 font-medium">Badges</h3>
      <p data-testid="glossary-badges">
        {#each conventions as c, i (c.label)}{i > 0 ? " and " : ""}{c.badge} “{c.label}”{/each}
        are DJ convention names for those moves. They don't change risk or mood.
      </p>
    </section>

    <section>
      <h3 class="mb-1 font-medium">½×</h3>
      <p>The BPMs match at half or double time.</p>
    </section>
  </Popover.Content>
</Popover.Root>
