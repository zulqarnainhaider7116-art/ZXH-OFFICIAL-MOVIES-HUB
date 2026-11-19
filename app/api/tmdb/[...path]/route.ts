import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ORIGIN = "https://api.themoviedb.org/3";
const ALLOWED_ROOTS = new Set(["trending", "movie", "tv", "search", "discover", "genre", "configuration"]);

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  if (!path.length || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)) || !ALLOWED_ROOTS.has(path[0])) {
    return NextResponse.json({ success: false, error: { code: "invalid_tmdb_route", message: "Unsupported TMDB route." } }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: { code: "tmdb_key_missing", message: "Set TMDB_API_KEY in Vercel Environment Variables." } }, { status: 503 });
  }

  const target = new URL(path.map(encodeURIComponent).join("/"), API_ORIGIN + "/");
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "api_key") target.searchParams.set(key, value);
  });
  target.searchParams.set("api_key", apiKey);

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 180 },
    });
    const body = await upstream.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: { code: "invalid_tmdb_response", message: "TMDB returned an invalid response." } }, { status: 502 });
    }
    return NextResponse.json(body, {
      status: upstream.status,
      headers: { "Cache-Control": "s-maxage=180, stale-while-revalidate=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return NextResponse.json({ success: false, error: { code: "tmdb_unavailable", message: "TMDB is temporarily unavailable." } }, { status: 502 });
  }
}
