import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = "https://zxh-movies-api-test.bachasyco504.workers.dev";
const BRAND = {
  name: "ZXH-OFFICIAL", developer: "ZULQARNAIN X HAIDER",
  product: "LAB CREW MOVIES API", website: "https://zxh-official-movies-hub.vercel.app",
};
const error = (status: number, code: string, message: string) =>
  NextResponse.json({ api: "movies-api/v1", version: "6.0", integration: BRAND, error: { code, message } }, {
    status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path = [] } = await context.params;
  const parts = path.map((part) => String(part || "").trim()).filter(Boolean);
  const isEmbed = parts[0] === "embed";
  const allowed =
    (parts.length === 1 && ["search", "movies"].includes(parts[0])) ||
    (parts.length === 2 && ["movies", "series", "episodes"].includes(parts[0])) ||
    (parts.length === 3 && parts[0] === "embed" && ["movie", "episode"].includes(parts[1]));
  if (!allowed) return error(404, "not_found", "The requested movie API route was not found.");

  const url = new URL("/api/v1/" + parts.map(encodeURIComponent).join("/"), API_ORIGIN);
  const params = request.nextUrl.searchParams;
  if (parts[0] === "search") {
    const q = (params.get("q") || "").trim().slice(0, 160);
    const type = params.get("type") || "all";
    if (!q || !["movie", "series", "all"].includes(type)) return error(400, "bad_request", "Provide a search query and a valid type.");
    url.searchParams.set("q", q); url.searchParams.set("type", type);
  }
  if (parts[0] === "movies" && parts.length === 1) {
    const page = Math.max(1, Math.min(1000, Number.parseInt(params.get("page") || "1", 10) || 1));
    url.searchParams.set("page", String(page));
  }

  try {
    const upstream = await fetch(url.toString(), { method: "GET", headers: { Accept: isEmbed ? "text/html" : "application/json" } });
    const contentType = upstream.headers.get("content-type") || "";
    if (isEmbed) {
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { "Content-Type": contentType || "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
      });
    }
    if (contentType.includes("text/html")) {
      const body = await upstream.text();
      return NextResponse.json({
        api: "movies-api/v1", version: "6.0", integration: BRAND,
        error: { code: "upstream_html_response", message: "The movie provider returned an HTML page instead of JSON. Check provider access or Cloudflare protection.", upstream_status: upstream.status, content_type: contentType, response_preview: body.slice(0, 180) },
      }, { status: 502 });
    }
    const payload = await upstream.json().catch(() => null);
    if (!payload || typeof payload !== "object") return error(502, "bad_gateway", "The movie provider returned an invalid response.");
    payload.integration = BRAND;
    if (!payload.api) payload.api = "movies-api/v1";
    if (!payload.version) payload.version = "6.0";
    if (!upstream.ok && !payload.error) payload.error = { code: "upstream_error", message: "The movie provider could not complete the request." };
    return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return error(502, "bad_gateway", "The Cloudflare movie API Worker is temporarily unreachable. Please retry.");
  }
}
