import { type Camelot, type CamelotString, camelotStringToObject } from '$lib/camelot'
import Bottleneck from 'bottleneck'

export type TunebatAPIResponse = {
	data: {
		c: CamelotString
		b: number
	}
}

export type TunebatTrack = {
	key: Camelot
	bpm: number
}

const fetchTrack = async (spotifyTrackId: string) => {
	const response = await fetch(`https://api.tunebat.com/api/tracks?trackId=${spotifyTrackId}`, {
		headers: {
			Origin: 'https://tunebat.com'
		}
	})
	return response.json() as Promise<TunebatAPIResponse>
}

const limiter = new Bottleneck({
	reservoir: 5,
	reservoirRefreshAmount: 5,
	reservoirRefreshInterval: 5 * 1000
})

export const getTrackInformation = async (spotifyTrackId: string[]): Promise<TunebatTrack[]> => {
	const fetchTrackWhenPossible = limiter.wrap(fetchTrack)
	const responses = await Promise.all(spotifyTrackId.map(async (id) => fetchTrackWhenPossible(id)))

	return responses.map((response) => ({
		key: camelotStringToObject(response.data.c),
		bpm: response.data.b
	}))
}
