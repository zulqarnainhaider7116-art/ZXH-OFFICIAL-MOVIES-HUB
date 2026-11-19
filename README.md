# ZXH OFFICIAL MOVIES HUB

Movie and series discovery experience built with **Next.js App Router, React and TypeScript**, styled around the extracted MOVIBOX Android resource reference.

## Stack
- Next.js 15 App Router
- React 18
- TypeScript for the application shell and server routes
- Existing React discovery, detail, search, watchlist, history and player components retained
- Existing Vercel API endpoints retained
- Server-side TMDB proxy at `/api/tmdb/*`

## Run locally
1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `TMDB_API_KEY` to your TMDB v3 API key.
4. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production
```bash
npm run build
npm start
```

Deploy the repository to Vercel with the project framework set to **Next.js**. Add `TMDB_API_KEY` in Vercel Project Settings → Environment Variables, then redeploy.

## Existing API routes
The existing Vercel endpoints under `/api` are preserved:
- `/api/fak/*`
- `/api/fak/movie-detail`
- `/api/davidcyril/watch`
- `/api/archive/search`
- `/api/youtube/search`

The TMDB API key is read server-side by the Next.js proxy and is not sent to the browser.

## MOVIBOX reference
The extracted Android resources were used as the layout and visual reference: app navigation, home category structure, poster cards, ranking treatments, player controls, typography and the original green brand token. Third-party content and playback providers remain subject to their own availability and rights.

## Credits
**ZXH OFFICIAL**  
Created by **ZULQARNAIN X HAIDER**

TMDB attribution: This product uses the TMDB API but is not endorsed or certified by TMDB.
