# ZXH Movies — 3D Liquid Glass Cinema

A React + Vite movie/TV discovery web app using TMDB metadata.

## Features
- 3D liquid-glass cinematic UI
- Responsive desktop/tablet/mobile layouts
- TMDB trending, popular, top-rated, now-playing and on-air collections
- Search across movies and TV
- Movie/series detail modal
- Cast, genres, trailer link and recommendations
- Local watchlist
- Local browsing history
- Mobile bottom navigation
- SEO meta tags, Open Graph and Twitter metadata
- TMDB attribution notice

## Setup

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Put your TMDB V3 key in `VITE_TMDB_API_KEY`.
4. Run:

```bash
npm install
npm run dev
```

For production:

```bash
npm run build
npm run preview
```

Deploy the generated `dist` folder to Vercel, Netlify, Cloudflare Pages, etc.

## Important API note
Vite exposes `VITE_*` values to browser code. Therefore a V3 API key placed there is not a secret. For a public production deployment, proxy TMDB requests through your own server/serverless function and keep credentials server-side where appropriate.

TMDB requires attribution and the notice:
"This product uses the TMDB API but is not endorsed or certified by TMDB."

This project provides metadata/discovery and does not include unauthorized movie-streaming resolvers. Connect only lawful/authorized video providers to the player layer.
