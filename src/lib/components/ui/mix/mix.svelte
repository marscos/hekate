<script context="module" lang="ts">
	import type { Track } from '@spotify/web-api-ts-sdk'

	export interface MixTrack extends Track {
		key: Camelot
	}
</script>

<script lang="ts">
	import type { GraphInputLink } from '@unovis/ts'
	import type { GraphData } from '@unovis/ts/data-models/graph'
	import { VisSingleContainer, VisGraph } from '@unovis/svelte'
	import { camelotColor, isWheelNeighbour, type Camelot } from '$lib/camelot'

	export let tracks: MixTrack[]

	let graph: GraphData<MixTrack, GraphInputLink> = {
		nodes: tracks.sort((a, b) => a.key.number - b.key.number),
		links: tracks.flatMap((track, _, arr) => {
			return arr
				.filter((t) => t.id !== track.id && isWheelNeighbour(track.key, t.key))
				.map((t) => ({
					source: track.id,
					target: t.id
				}))
		})
	}

	const nodeSize = 86
	const nodeShape = (track: MixTrack) => `
		<image id="${track.id}" href="${track.album.images[2]?.url || ''}" preserveAspectRatio="xMidYMid slice" width="64" height="64"/>
		<rect width="64" height="64" fill="none" rx="6"/>
	`
	const nodeLabel = (mt: MixTrack) => mt.name
	const nodeSubLabel = (mt: MixTrack) => `${mt.key.number}${mt.key.letter}`
	const nodeStroke = (mt: MixTrack) => camelotColor(mt.key)
	const layoutNodeGroup = (mt: MixTrack) => mt.key.number
	const layoutParallelNodeSubGroup = (mt: MixTrack) => (mt.key.letter === 'A' ? 1 : 2)

	let className = ''
	export { className as class }
</script>

<div class={className}>
	<VisSingleContainer data={graph} class="h-full">
		<VisGraph
			linkNeighborSpacing={0}
			layoutType="parallel"
			layoutParallelGroupSpacing={128}
			{nodeSize}
			{nodeShape}
			{nodeLabel}
			{nodeStroke}
			{nodeSubLabel}
			{layoutNodeGroup}
			{layoutParallelNodeSubGroup}
			nodeStrokeWidth={6}
		/>
	</VisSingleContainer>
</div>
