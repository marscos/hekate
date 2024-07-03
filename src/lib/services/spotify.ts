import {
	SpotifyApi,
	type AccessToken,
	type AudioFeatures,
	type Page,
	type PlaylistedTrack,
	type SimplifiedPlaylist,
	type Track,
	type UserProfile
} from '@spotify/web-api-ts-sdk'

export const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID

const STORAGE_KEY = 'spotify_token'

interface AnalyzedTrack extends Track, AudioFeatures {}

const generateRandomString = (length: number) => {
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const values = crypto.getRandomValues(new Uint8Array(length))
	return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

const sha256 = async (plain: string) => {
	const encoder = new TextEncoder()
	const data = encoder.encode(plain)
	return window.crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input: ArrayBuffer) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
}

export const redirectToAuthCodeFlow = async () => {
	const codeVerifier = generateRandomString(64)
	const hashed = await sha256(codeVerifier)
	const codeChallenge = base64encode(hashed)
	const clientId = CLIENT_ID
	const redirectUri = import.meta.env.VITE_REDIRECT_TARGET

	const scope =
		'user-read-private user-read-email playlist-read-private playlist-read-collaborative'
	const authUrl = new URL('https://accounts.spotify.com/authorize')

	window.localStorage.setItem('code_verifier', codeVerifier)

	const params = {
		response_type: 'code',
		client_id: clientId,
		scope,
		code_challenge_method: 'S256',
		code_challenge: codeChallenge,
		redirect_uri: redirectUri
	}

	authUrl.search = new URLSearchParams(params).toString()
	window.location.href = authUrl.toString()
}

export const logout = async () => {
	window.localStorage.removeItem(STORAGE_KEY)
	window.location.assign('/')
}

const getToken = async (codeVerifier: string, code: string): Promise<AccessToken> => {
	const payload = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: CLIENT_ID,
			grant_type: 'authorization_code',
			code,
			redirect_uri: import.meta.env.VITE_REDIRECT_TARGET,
			code_verifier: codeVerifier
		})
	}

	const body = await fetch('https://accounts.spotify.com/api/token', payload)
	const response = await body.json()
	return response
}

const isExpired = (token: AccessToken) => {
	return token.expires && token.expires <= Date.now()
}

export const accessToken = new Promise<AccessToken | null>((resolve) => {
	const accessToken = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as AccessToken
	const code = new URLSearchParams(window.location.search).get('code') ?? ''
	const codeVerifier = localStorage.getItem('code_verifier') ?? ''
	if (accessToken) {
		if (isExpired(accessToken)) {
			localStorage.removeItem(STORAGE_KEY)
			resolve(null)
		} else {
			resolve(accessToken)
		}
	} else if (code && codeVerifier) {
		getToken(codeVerifier, code).then(async (accessToken) => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ ...accessToken, expires: Date.now() + accessToken.expires_in })
			)
			window.history.replaceState(null, '', window.location.pathname)
			resolve(accessToken)
		})
	} else {
		resolve(null)
	}
})

export const getPlaylistTracks = async (playlist: SimplifiedPlaylist): Promise<Track[]> => {
	const pages = await getPlaylistPages(playlist)
	return pages.map(getTracksFromPlaylistPage).flat()
}

export const getPlaylistPages = async (
	playlist: SimplifiedPlaylist
): Promise<Page<PlaylistedTrack<Track>>[]> => {
	const token = await accessToken
	if (!token) throw 'User is not authenticated'
	if (!playlist.tracks) return []
	const PAGE_SIZE = 50
	const totalPages = Math.ceil(playlist.tracks.total / PAGE_SIZE)
	const pageOffsets = Array.from({ length: totalPages }, (_, index) => index * PAGE_SIZE)
	return Promise.all(
		pageOffsets.map((offset) => {
			return SpotifyApi.withAccessToken(CLIENT_ID, token).playlists.getPlaylistItems(
				playlist.id,
				undefined,
				undefined,
				PAGE_SIZE,
				offset
			)
		})
	)
}

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
	const token = await accessToken
	if (!token) throw 'User is not authenticated'
	return SpotifyApi.withAccessToken(CLIENT_ID, token).currentUser.profile()
}

const getTracksFromPlaylistPage = (page: Page<PlaylistedTrack<Track>>): Track[] => {
	return page.items
		.filter((item) => !item.is_local)
		.map((item) => item.track)
		.flat()
}

const getAnalyzedTracks = async (tracks: Track[]): Promise<AnalyzedTrack[]> => {
	const token = await accessToken
	if (!token) throw 'User is not authenticated'
	const trackBatches = splitIntoChunks<Track>(tracks, 50)
	const audioFeatures = (
		await Promise.all(
			trackBatches.map(async (batch) => {
				return SpotifyApi.withAccessToken(CLIENT_ID, token).tracks.audioFeatures(
					batch.map((track) => track.id)
				)
			})
		)
	).flat()
	return tracks.map((track, i) => ({ ...track, ...audioFeatures[i] }))
}

function splitIntoChunks<T>(arr: T[], chunkSize: number): T[][] {
	const length = Math.ceil(arr.length / chunkSize)
	return Array.from({ length }, (_, i) => arr.slice(i * chunkSize, i * chunkSize + chunkSize))
}

export const fetchAnalyzedTracks = async (
	playlist: SimplifiedPlaylist
): Promise<AnalyzedTrack[]> => {
	const token = await accessToken
	if (!token) throw 'User is not authenticated'
	const tracks: Track[] = await getPlaylistTracks(playlist)
	return getAnalyzedTracks(tracks)
}
