# Hekate

Web app to help DJs identify tracks to mix together. The app represents a playlist as a graph where tracks are represented by nodes. Tracks are linked when they are neighbors in the Camelot wheel, making it easier to identify compatible tracks for mixing.

## Features

![image](https://github.com/user-attachments/assets/f2277340-ac38-4250-8e62-f17bc508b301)

- **Spotify Authentication**: The app authenticates a Spotify user to fetch their playlists through the [Spotify API](https://developer.spotify.com/documentation/web-api/).
- **Audio Features from Tunebat**: Since Spotify has deprecated its Audio Features API endpoint, audio features are currently fetched from [Tunebat](https://tunebat.com/)'s API, which was reverse-engineered and proxied by an API route in the app, trying to leverage rate limits through a bottleneck.
- **Playlist Graph Representation**: Once a playlist is selected, its tracks' audio features are requested to build a graph where:
  - **Nodes**: Represent the tracks in the playlist.
  - **Edges**: Are based on Camelot wheel neighborhood.
- **Graph Rendering**: Graphs are rendered using [unovis](https://unovis.dev/).
- **UI Components**: Built on top of [shadcn-svelte](https://github.com/huntabyte/shadcn-svelte).

## Setting up
### Environment Variables

The following environment variables are required to run the app:

- `VITE_SPOTIFY_CLIENT_ID`: Your Spotify API client ID.
- `VITE_REDIRECT_TARGET`: The redirect URI for Spotify authentication.

### Developing

Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Building

To create a production version of the app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy the app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Feature Roadmap

- **Additional Import Options**: Enable importing track collections from sources other than Spotify playlists, such as Mixxx metadata files.
- **Local Caching**: Implement some form of local storage for track metadata to improve experience and reduce redundant API calls.
- **Enhanced Graph Edges**: Include BPM difference as a factor in edge weights for more accurate graph representation.
- **Desktop App Release**: Package the app as a desktop application using [Tauri](https://tauri.app/), allowing it to run on major desktop platforms without a need for hosting.
- **Improved Browsing**: Enhance the overall track browsing experience with better graph layout, track listing components, etc.
