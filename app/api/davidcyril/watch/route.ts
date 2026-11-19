import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = "https://apis.davidcyril.name.ng";
const BRAND = { name: "ZXH OFFICIAL", developer: "ZULQARNAIN X HAIDER" };
const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=240", "X-Content-Type-Options": "nosniff" } });

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") || "").trim().slice(0, 160);
  const tmdb = (params.get("tmdb") || "").trim();
  const type = (params.get("type") || "movie").toLowerCase() === "tv" ? "tv" : "movie";
  const season = params.get("season") || "1";
  const episode = params.get("episode") || "1";
  if (!q || !/^[0-9]+$/.test(tmdb) || !/^[0-9]+$/.test(season) || !/^[0-9]+$/.test(episode)) {
    return json(400, { success: false, brand: BRAND, error: { code: "invalid_parameters", message: "A title, TMDB ID, season and episode are required." } });
  }
  try {
    const url = new URL("/movies/watch", API_ORIGIN);
    url.searchParams.set("q", q); url.searchParams.set("tmdb", tmdb);
    url.searchParams.set("type", type); url.searchParams.set("season", season); url.searchParams.set("episode", episode);
    const upstream = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(25000) });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload || payload.success !== true || !payload.result) {
      return json(upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, {
        success: false, brand: BRAND,
        error: { code: "server7_unavailable", message: payload?.error?.message || "SERVER 7 could not resolve this title." },
      });
    }
    return json(200, { success: true, brand: BRAND, result: payload.result });
  } catch {
    return json(502, { success: false, brand: BRAND, error: { code: "server7_connection_failed", message: "Could not connect to SERVER 7. Please try another server." } });
  }
}
