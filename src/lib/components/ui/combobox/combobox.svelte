<script lang="ts">
	import Check from 'lucide-svelte/icons/check'
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down'
	import * as Command from '$lib/components/ui/command/index.js'
	import * as Popover from '$lib/components/ui/popover/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { cn } from '$lib/utils.js'
	import { tick } from 'svelte'
	import ScrollArea from '../scroll-area/scroll-area.svelte'
	import type { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk'

	export let items: SimplifiedPlaylist[] = []
	export let selectedValue: SimplifiedPlaylist | undefined
	let open = false
	let value = ''

	$: selectedLabel = items.find((f) => f.name === value)?.name ?? 'Select a playlist...'
	$: selectedValue = items.find((f) => f.name === value)

	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger(triggerId: string) {
		open = false
		tick().then(() => {
			document.getElementById(triggerId)?.focus()
		})
	}
</script>

<Popover.Root bind:open let:ids>
	<Popover.Trigger asChild let:builder>
		<Button
			builders={[builder]}
			variant="outline"
			role="combobox"
			aria-expanded={open}
			class="max-w-full justify-between"
		>
			{selectedLabel}
			<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-[400px] p-0">
		<Command.Root>
			<Command.Input placeholder="Search playlists..." />
			<Command.List>
				<Command.Empty>No playlists found.</Command.Empty>
				<Command.Group>
					{#each items as item}
						<Command.Item
							value={item.name}
							onSelect={(selected) => {
								value = selected
								closeAndFocusTrigger(ids.trigger)
							}}
						>
							<Check class={cn('mr-2 h-4 w-4', value !== item.name && 'text-transparent')} />
							{item.name}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
