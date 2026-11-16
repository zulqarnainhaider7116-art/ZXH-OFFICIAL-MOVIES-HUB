const WORKER_ORIGIN = "https://zxh-movies-api-test.bachasyco504.workers.dev";
const BRAND = {
  name: "ZXH-OFFICIAL",
  developer: "ZULQARNAIN X HAIDER",
  product: "LAB CREW MOVIES API",
  website: "https://zxh-official-movies-hub.vercel.app"
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      api: "movies-api/v1",
      version: "6.0",
      integration: BRAND,
      error: { code: "method_not_allowed", message: "Only GET requests are supported." }
    });
  }

  const slug = String(req.query.slug || "").trim();
  if (!slug || slug.length > 180 || !/^[a-zA-Z0-9-]+$/.test(slug)) {
    return res.status(400).json({
      api: "movies-api/v1",
      version: "6.0",
      integration: BRAND,
      error: { code: "bad_request", message: "A valid movie slug is required." }
    });
  }

  try {
    const upstreamUrl = new URL("/api/v1/movies/" + encodeURIComponent(slug), WORKER_ORIGIN);
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const contentType = upstream.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const preview = (await upstream.text()).slice(0, 180);
      return res.status(502).json({
        api: "movies-api/v1",
        version: "6.0",
        integration: BRAND,
        error: {
          code: "upstream_not_json",
          message: "The movie details provider did not return JSON.",
          upstream_status: upstream.status,
          content_type: contentType,
          response_preview: preview
        }
      });
    }

    const payload = await upstream.json();
    if (!payload || typeof payload !== "object") {
      return res.status(502).json({
        api: "movies-api/v1",
        version: "6.0",
        integration: BRAND,
        error: { code: "invalid_upstream_response", message: "The provider returned invalid JSON." }
      });
    }

    payload.integration = BRAND;
    return res.status(upstream.status).json(payload);
  } catch {
    return res.status(502).json({
      api: "movies-api/v1",
      version: "6.0",
      integration: BRAND,
      error: { code: "upstream_connection_failed", message: "The movie API Worker is unreachable." }
    });
  }
}
