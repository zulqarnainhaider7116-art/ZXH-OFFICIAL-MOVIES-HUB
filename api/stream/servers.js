const BRAND = "ZXH OFFICIAL";

// Keep the working options first. Public responses expose generic labels only.
const SERVER_ORDER = [
  "68ca4cf7203ee8afe6ee44cf",
  "68ca4d03203ee8afe6ee44d0",
  "68ca4d15203ee8afe6ee44d1",
  "68cc06b42672fdfecc749029",
  "68cc56953768c48a4c4055a9",
  "68ca4cbd203ee8afe6ee44cb",
  "68ca4cd1203ee8afe6ee44cc",
  "68ca4cdd203ee8afe6ee44cd",
  "68ca4cea203ee8afe6ee44ce"
];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    return res.status(405).json({ brand: BRAND, error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://api.anyplay.stream/v1/servers", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({ brand: BRAND, error: "Playback options are temporarily unavailable" });
    }

    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : (payload.servers || payload.results || []);
    const byId = new Map(list.filter(item => item && item.id).map(item => [String(item.id), item]));

    const servers = SERVER_ORDER
      .filter(id => byId.has(id))
      .map((id, index) => ({ id, name: "SERVER " + (index + 1) }));

    if (!servers.length) {
      return res.status(502).json({ brand: BRAND, error: "No playback options are currently available" });
    }

    return res.status(200).json({ brand: BRAND, servers });
  } catch {
    return res.status(502).json({ brand: BRAND, error: "Unable to load playback options" });
  }
}
