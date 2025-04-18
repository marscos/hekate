import { json } from '@sveltejs/kit'
import { camelotStringToObject, type Camelot, type CamelotString } from '$lib/camelot'

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

export const GET = async ({ url }) => {
	const trackId = url.searchParams.get('trackId')
	if (!trackId) {
		return json({ error: 'trackId is required' }, { status: 400 })
	}

	try {
		const response = (await (
			await fetch(`https://api.tunebat.com/api/tracks?trackId=${trackId}`, {
				headers: {
					Origin: 'https://tunebat.com'
				}
			})
		).json()) as TunebatAPIResponse

		return json({
			key: camelotStringToObject(response.data.c),
			bpm: response.data.b
		})
	} catch {
		return json({ error: 'Failed to fetch track data' }, { status: 500 })
	}
}
