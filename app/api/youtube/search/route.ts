import { NextRequest, NextResponse } from "next/server";

const BRAND = "ZXH-OFFICIAL";
const SEARCH_API = "https://eliteprotech-apis.zone.id/search/ytsearch";
const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json({ brand: BRAND, developer: "ZULQARNAIN X HAIDER", ...body }, {
    status, headers: { "Cache-Control": "s-maxage=180, stale-while-revalidate=300" },
  });

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
  if (q.length < 2) return json(400, { error: { code: "invalid_query", message: "Provide a title to search." } });
  try {
    const url = new URL(SEARCH_API); url.searchParams.set("q", q);
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) return json(502, { error: { code: "youtube_search_failed", message: "The video search provider is temporarily unavailable." } });
    const videos = Array.isArray(payload?.results?.videos) ? payload.results.videos : [];
    const results = videos.flatMap((video: any) => {
      const id = String(video?.id || "").trim();
      if (!id) return [];
      const author = video?.author || {};
      return [{
        id, title: String(video?.title || "Untitled").slice(0, 200),
        description: String(video?.description || "").slice(0, 500),
        channel: String(author?.name || "YouTube").slice(0, 100),
        channelUrl: String(author?.url || ""), thumbnail: String(video?.thumbnail || ""),
        duration: String(video?.duration || ""),
      }];
    });
    return json(200, { api: "ZXH YouTube Search", count: results.length, results });
  } catch {
    return json(502, { error: { code: "youtube_connection_failed", message: "Could not connect to the video search provider." } });
  }
}
