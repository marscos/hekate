import { json, type RequestHandler } from '@sveltejs/kit'
import { getTrackInformation } from '$lib/services/tunebat'

export const GET: RequestHandler = async ({ url }) => {
	const trackId = url.searchParams.getAll('trackId')
	if (!trackId) {
		return json({ error: 'trackId is required' }, { status: 400 })
	}

	try {
		return json(await getTrackInformation(trackId), { status: 200 })
	} catch (error) {
		console.error('Error fetching track data:', error)
		return json({ error: 'Failed to fetch track data' }, { status: 500 })
	}
}
