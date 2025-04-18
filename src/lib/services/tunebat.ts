import { type Camelot, type CamelotString } from '$lib/camelot'

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
