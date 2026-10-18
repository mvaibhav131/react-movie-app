# VM Flix

Mobile-first movie, TV, web-series, live-cricket and music-video app built with React 18, Vite, Redux Toolkit, React Router and Sass. Titles, posters and metadata come from [TMDB](https://www.themoviedb.org).

## Run it

```bash
npm install
cp .env.example .env.local   # add your TMDB token
npm run dev                  # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run preview` | Production build / serve it locally |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm test` | Vitest unit tests |

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_TMDB_TOKEN` | yes | TMDB "API Read Access Token" (free: themoviedb.org/settings/api) |
| `VITE_YOUTUBE_API_KEY` | no | Full Music catalogue and search (YouTube Data API v3). Without it Music lists official label channels |
| `VITE_CRICAPI_KEY` | no | Live scores from CricAPI. Without it fixtures come from TheSportsDB (limited coverage) |
| `VITE_SPORTSDB_KEY` | no | TheSportsDB key (public test key by default) |
| `VITE_CATALOG_URL` | no | Location of the licensed catalogue (default `/catalog.json`) |

`VITE_*` values are bundled into the client, so use keys that are safe to expose and restrict them by referrer. On Netlify set them under Site settings > Environment variables.

## What plays on VM Flix

Playback goes through one service (`src/services/playback`) that only accepts sources VM Flix may stream:

- **`public/catalog.json`**: titles you own, are licensed for, or that carry an open licence. Add an entry per TMDB id with direct `hls` / `mp4` / `webm` URLs (CORS-enabled) and the licence details; the title then shows **Watch Now** and plays instantly. See the schema in `src/services/catalog.js`.
- **Internet Archive**: only `feature_films` items marked public-domain or Creative Commons, with an exact title and year match.
- **Official YouTube channels** (`public/free-movies.json`): complete films that studios and distributors such as Rajshri, Shemaroo, Pen Movies, Eagle and Goldmines publish for free. They play in YouTube's own embedded player and are marked **Free**; browse them under Free Movies. The index is generated, not hand-written:

  ```bash
  npm run build:free-movies                      # all channels in src/config/freeMovieChannels.js
  npm run build:free-movies -- --only=rajshri    # a single channel
  ```

  It needs `VITE_YOUTUBE_API_KEY` and `VITE_TMDB_TOKEN` in `.env.local`, takes a few minutes, and keeps only public, embeddable uploads of feature length that match a TMDB film by name, year and runtime. YouTube's API terms require stored API data to be refreshed within 30 days, so run it at least monthly. A few uploads still refuse to play in an embed; the watch page then moves to the next source or offers "Open on YouTube".

Everything else shows its trailer. There are no third-party embed sites: those serve unlicensed copies and are what caused the pop-ups and redirects in the previous version.

## Cricket

The Live page lists scores and fixtures (TheSportsDB, or CricAPI with a key) and, with a YouTube key, plays the free live streams, replays and highlights that official channels publish (ICC, cricket.com.au, Sri Lanka Cricket, Cricket South Africa, Bangladesh Cricket, Mumbai Indians). Matches whose rights belong to a broadcaster, such as the IPL, link to that broadcaster; they are not streamed here.

## Layout

```
src/config      routes, navigation, languages, env
src/services    TMDB client, discover, playback providers, downloads, cricket, music
src/store       Redux: My List, progress, downloads, playlists, prefs (per user, localStorage)
src/hooks       data and UI hooks
src/components  shared UI (video player, carousel, modal, header...)
src/pages       route screens, lazy-loaded
```

## Notes

- Accounts are local to the browser (no backend); passwords are PBKDF2-hashed before being stored.
- Downloads use Cache Storage and are offered only for sources flagged `downloadable: true`.
