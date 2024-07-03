<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { redirectToAuthCodeFlow, logout, getCurrentUserProfile } from '$lib/services/spotify';
	import Button from '$lib/components/ui/button/button.svelte';
	import { LogIn, LoaderCircle } from 'lucide-svelte';
	import { accessToken } from '$lib/services/spotify';
</script>

{#await accessToken}
	<Button disabled variant="outline" class="disabled">
		<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
		Login with Spotify
	</Button>
{:then token}
	{#if token === null}
		<Button
			on:click={() => redirectToAuthCodeFlow()}
			class="bg-[#1ED760] text-white hover:bg-[#1ED760]/80"
		>
			<LogIn color="#fff" class="mr-2 h-4 w-4" />
			Login with Spotify
		</Button>
	{/if}
	{#if token}
		{#await getCurrentUserProfile()}
			<Button variant="outline" class="hover:bg-destructive" on:click={() => logout()}>
				<Avatar.Root class="mr-2 h-4 w-4">
					<Avatar.Fallback>S</Avatar.Fallback>
				</Avatar.Root>
				Fetching user...
			</Button>
		{:then user}
			<Button variant="outline" class="hover:bg-destructive" on:click={() => logout()}>
				<Avatar.Root class="mr-2 h-4 w-4">
					<Avatar.Image src={user.images[0]?.url} alt="Your avatar" />
					<Avatar.Fallback>{user.display_name.split(' ').slice(0, 2)}</Avatar.Fallback>
				</Avatar.Root>
				{user.display_name}
			</Button>
		{/await}
	{/if}
{/await}
