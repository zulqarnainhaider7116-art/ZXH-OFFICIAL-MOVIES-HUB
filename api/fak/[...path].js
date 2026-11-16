const API_ORIGIN = "https://zxh-movies-api-test.bachasyco504.workers.dev";
const BRAND = {
  name: "ZXH-OFFICIAL",
  developer: "ZULQARNAIN X HAIDER",
  product: "LAB CREW MOVIES API",
  website: "https://zxh-official-movies-hub.vercel.app"
};

function sendError(res, status, code, message) {
  return res.status(status).json({
    api: "movies-api/v1",
    version: "6.0",
    integration: BRAND,
    error: { code, message }
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "method_not_allowed", "Only GET requests are supported.");
  }

  // Vercel catch-all params can be absent in some runtimes; derive the route from the request URL as a safe fallback.
  const pathname = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`).pathname;
  const routeFromUrl = pathname.replace(/^\/api\/fak\/?/, "");
  const routeParam = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "");
  const route = routeParam || routeFromUrl;
  const safeParts = route.split("/").map(part => String(part || "").trim()).filter(Boolean);

  const isEmbed = safeParts[0] === "embed";
  const allowed =
    (safeParts.length === 1 && ["search", "movies"].includes(safeParts[0])) ||
    (safeParts.length === 2 && ["movies", "series", "episodes"].includes(safeParts[0])) ||
    (safeParts.length === 3 && safeParts[0] === "embed" && ["movie", "episode"].includes(safeParts[1]));

  if (!allowed) return sendError(res, 404, "not_found", "The requested movie API route was not found.");

  const upstreamPath = safeParts.map(encodeURIComponent).join("/");
  const url = new URL("/api/v1/" + upstreamPath, API_ORIGIN);

  if (safeParts[0] === "search") {
    const q = String(req.query.q || "").trim().slice(0, 160);
    const type = String(req.query.type || "all");
    if (!q || !["movie", "series", "all"].includes(type)) {
      return sendError(res, 400, "bad_request", "Provide a search query and a valid type.");
    }
    url.searchParams.set("q", q);
    url.searchParams.set("type", type);
  }

  if (safeParts[0] === "movies" && safeParts.length === 1) {
    const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page || "1", 10) || 1));
    url.searchParams.set("page", String(page));
  }

  try {
    // The upstream API key stays exclusively in the Cloudflare Worker Secret.
    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": isEmbed ? "text/html" : "application/json" }
    });

    const contentType = upstream.headers.get("content-type") || "";
    if (isEmbed) {
      const html = await upstream.text();
      res.status(upstream.status);
      res.setHeader("Content-Type", contentType || "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.send(html);
    }

    if (contentType.includes("text/html")) {
      const body = await upstream.text();
      return res.status(502).json({
        api: "movies-api/v1",
        version: "6.0",
        integration: BRAND,
        error: {
          code: "upstream_html_response",
          message: "The movie provider returned an HTML page instead of JSON. Check provider access or Cloudflare protection.",
          upstream_status: upstream.status,
          content_type: contentType,
          response_preview: body.slice(0, 180)
        }
      });
    }

    let payload;
    try { payload = await upstream.json(); }
    catch {
      return sendError(res, 502, "bad_gateway", "The movie provider returned an invalid response.");
    }

    if (!payload || typeof payload !== "object") {
      return sendError(res, 502, "bad_gateway", "The movie provider returned an invalid response.");
    }

    // Preserve the upstream provider's own brand and identify ZXH as the integration.
    payload.integration = BRAND;
    if (!payload.api) payload.api = "movies-api/v1";
    if (!payload.version) payload.version = "6.0";
    if (!upstream.ok && !payload.error) {
      payload.error = {
        code: "upstream_error",
        message: "The movie provider could not complete the request."
      };
    }

    res.status(upstream.status);
    res.setHeader("Cache-Control", "no-store");
    return res.json(payload);
  } catch {
    return sendError(res, 502, "bad_gateway", "The Cloudflare movie API Worker is temporarily unreachable. Please retry.");
  }
}
