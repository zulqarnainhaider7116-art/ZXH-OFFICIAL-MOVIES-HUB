const API_ORIGIN = "https://movies-api.faizankhichi.me";
const BRAND = { name: "ZXH-OFFICIAL", product: "LAB CREW MOVIES API", url: "https://zxh-official-movies-hub.vercel.app" };

function sendError(res, status, code, message) {
  return res.status(status).json({
    api: "movies-api/v1",
    version: "6.0",
    brand: BRAND,
    error: { code, message }
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "method_not_allowed", "Only GET requests are supported.");
  }

  const key = process.env.FAK_MOVIES_API_KEY;
  if (!key) return sendError(res, 503, "service_unavailable", "Movie playback is not configured yet.");

  const parts = Array.isArray(req.query.path) ? req.query.path : String(req.query.path || "").split("/").filter(Boolean);
  const safeParts = parts.map(part => String(part || "").trim()).filter(Boolean);
  const isEmbed = safeParts[0] === "embed";
  const allowed =
    (safeParts.length === 1 && ["search", "movies"].includes(safeParts[0])) ||
    (safeParts.length === 2 && ["movies", "series", "episodes"].includes(safeParts[0])) ||
    (safeParts.length === 3 && safeParts[0] === "embed" && ["movie", "episode"].includes(safeParts[1]));

  if (!allowed) return sendError(res, 404, "not_found", "The requested movie API route was not found.");

  const upstreamPath = safeParts.join("/");
  const url = new URL("/api/v1/" + upstreamPath.split("/").map(encodeURIComponent).join("/"), API_ORIGIN);

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
    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-API-Key": key, "Accept": isEmbed ? "text/html" : "application/json" }
    });

    const contentType = upstream.headers.get("content-type") || "";
    if (isEmbed || contentType.includes("text/html")) {
      const html = (await upstream.text())
        .replace(/FAK\\s*LABS/gi, "ZXH-OFFICIAL LAB CREW")
        .replace(/FAK\\s*LABS/gi, "ZXH-OFFICIAL LAB CREW");
      res.status(upstream.status);
      res.setHeader("Content-Type", contentType || "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.send(html);
    }

    let payload;
    try { payload = await upstream.json(); }
    catch {
      return sendError(res, 502, "bad_gateway", "The movie provider returned an invalid response.");
    }

    if (!payload || typeof payload !== "object") {
      return sendError(res, 502, "bad_gateway", "The movie provider returned an invalid response.");
    }

    // Keep the provider's documented envelope and never expose request credentials.
    payload.brand = BRAND;
    if (!payload.api) payload.api = "movies-api/v1";
    if (!payload.version) payload.version = "6.0";
    if (!upstream.ok && !payload.error) {
      payload = {
        api: "movies-api/v1",
        version: "6.0",
        brand: BRAND,
        error: { code: "upstream_error", message: "The movie provider could not complete the request." }
      };
    }

    res.status(upstream.status);
    res.setHeader("Cache-Control", "no-store");
    return res.json(payload);
  } catch {
    return sendError(res, 502, "bad_gateway", "The movie provider is temporarily unreachable. Please retry.");
  }
}
