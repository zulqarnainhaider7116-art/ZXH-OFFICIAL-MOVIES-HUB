import { NextRequest, NextResponse } from "next/server";

const BRAND = "ZXH-OFFICIAL";
const IA_SEARCH = "https://archive.org/advancedsearch.php";
const IA_METADATA = "https://archive.org/metadata/";
const headers = { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" };
const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json({ brand: BRAND, developer: "ZULQARNAIN X HAIDER", ...body }, { status, headers });

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) return json(400, { error: { code: "invalid_query", message: "Provide a title with at least 2 characters." } });
  try {
    const safe = q.replace(/[\\"]/g, " ").replace(/\\s+/g, " ").trim();
    const url = new URL(IA_SEARCH);
    url.searchParams.set("q", `mediatype:movies AND title:"${safe}"`);
    ["identifier", "title"].forEach((field) => url.searchParams.append("fl[]", field));
    url.searchParams.set("rows", "12");
    url.searchParams.set("page", "1");
    url.searchParams.set("output", "json");
    const search = await fetch(url, { headers: { "User-Agent": "ZXH-OFFICIAL-MoviesHub/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!search.ok) return json(502, { error: { code: "archive_search_failed", message: "Internet Archive search is temporarily unavailable." } });
    const docs = (await search.json())?.response?.docs || [];
    const results = await Promise.all(docs.slice(0, 8).map(async (doc: any) => {
      const id = String(doc.identifier || "");
      if (!/^[a-zA-Z0-9._-]{1,180}$/.test(id)) return null;
      try {
        const response = await fetch(IA_METADATA + encodeURIComponent(id), { signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;
        const data = await response.json();
        const meta = data?.metadata || {};
        const rights = [meta.licenseurl, meta.rights].flat().filter(Boolean).join(" ").toLowerCase();
        if (!/public.?domain|creativecommons\\.org\\/licenses\\//i.test(rights)) return null;
        const files = (data.files || []).filter((file: any) => {
          const name = String(file.name || "").toLowerCase();
          const format = String(file.format || "").toLowerCase();
          return !file.source && !file.private && !file.encrypted &&
            (format.includes("mpeg4") || format === "h.264" || format === "webm" || /\\.(mp4|m4v|webm)$/.test(name));
        }).sort((a: any, b: any) => Number(b.size || 0) - Number(a.size || 0));
        const file = files[0];
        if (!file) return null;
        const format = String(file.format || "").toLowerCase().includes("webm") ? "WebM" : "MPEG4";
        return {
          id, title: String(meta.title || doc.title || id).slice(0, 180), format,
          license: String(meta.licenseurl || meta.rights || "Open license").slice(0, 180),
          poster: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          url: `https://archive.org/download/${encodeURIComponent(id)}/${file.name.split("/").map(encodeURIComponent).join("/")}`,
        };
      } catch { return null; }
    }));
    const clean = results.filter(Boolean);
    return json(200, { api: "ZXH Archive Stream Search", count: clean.length, results: clean });
  } catch {
    return json(502, { error: { code: "upstream_connection_failed", message: "Could not connect to Internet Archive." } });
  }
}
