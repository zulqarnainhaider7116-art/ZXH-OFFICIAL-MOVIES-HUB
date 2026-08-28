ZXH MOVIES QUICK DEPLOY

Vercel:
1. npm install
2. npm run build
3. Deploy the project.
4. Add VITE_TMDB_API_KEY in Vercel Environment Variables.

Netlify/Cloudflare:
Build command: npm run build
Publish directory: dist

The supplied TMDB key is included as the fallback requested by the project owner. For a public production app, move API requests behind a serverless proxy so the key is not exposed in browser source.
