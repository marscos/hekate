<script lang="ts">
	import { CLIENT_ID, accessToken, getPlaylistTracks } from '$lib/services/spotify'
	import { LoaderCircle } from 'lucide-svelte'
	import User from '$lib/components/ui/user/user.svelte'
	import { SpotifyApi, type SimplifiedPlaylist } from '@spotify/web-api-ts-sdk'
	import Combobox from '$lib/components/ui/combobox/combobox.svelte'
	import Mix from '$lib/components/ui/mix/mix.svelte'

	let selectedPlaylist: SimplifiedPlaylist
</script>

<div class="flex h-[calc(100dvh-2rem)] flex-col items-center gap-4 p-3">
	{#await accessToken}
		<LoaderCircle class="h-10 w-10"></LoaderCircle>
	{:then token}
		{#if !token}<p class="text-xl">Authenticate with Spotify to start mixing!</p>{/if}
		{#if token}
			{#await SpotifyApi.withAccessToken(CLIENT_ID, token).currentUser.playlists.playlists(50) then pages}
				<Combobox items={pages.items} bind:selectedValue={selectedPlaylist}></Combobox>
				{#if selectedPlaylist}
					{#await (async () => {
						const playlistTracks = await getPlaylistTracks(selectedPlaylist)
						return Promise.all(playlistTracks.map(async (track) => {
								const response = await fetch(`/api/tunebat?trackId=${track.id}`)
								if (!response.ok) {
									throw new Error('Failed to fetch Tunebat track data')
								}
								const tunebatData = await response.json()
								return { ...track, ...tunebatData }
							}))
					})()}
						<LoaderCircle class="h-20 w-20"></LoaderCircle>
					{:then tracks}
						<Mix class="flex-grow self-stretch" {tracks}></Mix>
					{/await}
				{/if}
			{/await}
		{/if}
	{/await}
	<User></User>
</div>
