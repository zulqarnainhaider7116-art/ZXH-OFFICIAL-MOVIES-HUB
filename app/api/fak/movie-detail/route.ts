import { NextRequest, NextResponse } from "next/server";

const WORKER_ORIGIN = "https://zxh-movies-api-test.bachasyco504.workers.dev";
const BRAND = {
  name: "ZXH-OFFICIAL", developer: "ZULQARNAIN X HAIDER",
  product: "LAB CREW MOVIES API", website: "https://zxh-official-movies-hub.vercel.app",
};
const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug || slug.length > 180 || !/^[a-zA-Z0-9-]+$/.test(slug)) {
    return json(400, { api: "movies-api/v1", version: "6.0", integration: BRAND, error: { code: "bad_request", message: "A valid movie slug is required." } });
  }
  try {
    const url = new URL("/api/v1/movies/" + encodeURIComponent(slug), WORKER_ORIGIN);
    const upstream = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const preview = (await upstream.text()).slice(0, 180);
      return json(502, { api: "movies-api/v1", version: "6.0", integration: BRAND, error: { code: "upstream_not_json", message: "The movie details provider did not return JSON.", upstream_status: upstream.status, content_type: contentType, response_preview: preview } });
    }
    const payload = await upstream.json().catch(() => null);
    if (!payload || typeof payload !== "object") return json(502, { api: "movies-api/v1", version: "6.0", integration: BRAND, error: { code: "invalid_upstream_response", message: "The provider returned invalid JSON." } });
    payload.integration = BRAND;
    return json(upstream.status, payload);
  } catch {
    return json(502, { api: "movies-api/v1", version: "6.0", integration: BRAND, error: { code: "upstream_connection_failed", message: "The movie API Worker is unreachable." } });
  }
}
