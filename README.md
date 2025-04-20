# Hekate

Web app for DJ mixes. Built with SvelteKit. The app visualizes playlists as a graph where tracks are represented by nodes. Tracks are linked when they are neighbors in the Camelot wheel, making it easier to identify compatible tracks for mixing.

## Environment Variables

The following environment variables are required to run the app:

- `VITE_SPOTIFY_CLIENT_ID`: Your Spotify API client ID.
- `VITE_REDIRECT_TARGET`: The redirect URI for Spotify authentication.

Ensure these variables are set in a `.env` file in the root of the project.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
