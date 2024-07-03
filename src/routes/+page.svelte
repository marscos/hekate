<script lang="ts">
	import { CLIENT_ID, accessToken, fetchAnalyzedTracks } from '$lib/services/spotify';
	import { LoaderCircle } from 'lucide-svelte';
	import User from '$lib/components/ui/user/user.svelte';
	import { SpotifyApi, type SimplifiedPlaylist } from '@spotify/web-api-ts-sdk';
	import Combobox from '$lib/components/ui/combobox/combobox.svelte';

	let selectedPlaylist: SimplifiedPlaylist;
</script>

<div class="flex flex-col items-center justify-around gap-4 p-3">
	{#await accessToken}
		<LoaderCircle class="h-10 w-10"></LoaderCircle>
	{:then token}
		{#if !token}<p class="text-xl">Authenticate with Spotify to start mixing!</p>{/if}
		{#if token}
			{#await SpotifyApi.withAccessToken(CLIENT_ID, token).currentUser.playlists.playlists(50) then pages}
				<Combobox items={pages.items} bind:selectedValue={selectedPlaylist}></Combobox>
				{#if selectedPlaylist}
					{#await fetchAnalyzedTracks(selectedPlaylist)}
						<LoaderCircle class="h-20 w-20"></LoaderCircle>
					{:then tracks}
						<ul>
							{#each tracks as track}
								<li>
									{track.name}, {track.key}
								</li>
							{/each}
						</ul>
					{/await}
				{/if}
			{/await}
		{/if}
	{/await}
	<User></User>
</div>
