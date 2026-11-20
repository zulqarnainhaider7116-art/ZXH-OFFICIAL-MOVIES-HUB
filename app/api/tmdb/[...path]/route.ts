import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ORIGIN = "https://api.themoviedb.org/3";

const ALLOWED_ROOTS = new Set([
  "trending",
  "movie",
  "tv",
  "search",
  "discover",
  "genre",
  "configuration",
]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

type TMDBErrorBody = {
  status_message?: string;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { path = [] } = await context.params;

  if (
    !path.length ||
    path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)) ||
    !ALLOWED_ROOTS.has(path[0])
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "invalid_tmdb_route",
          message: "Unsupported TMDB route.",
        },
      },
      { status: 400 }
    );
  }

  // Use the TMDB Read Access Token first; V3 key is a separate fallback.
  const bearerToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const apiKey = process.env.TMDB_API_KEY?.trim();

  if (!bearerToken && !apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "tmdb_credentials_missing",
          message:
            "Set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in Vercel Environment Variables.",
        },
      },
      { status: 503 }
    );
  }

  const target = new URL(
    path.map(encodeURIComponent).join("/"),
    API_ORIGIN + "/"
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "api_key") {
      target.searchParams.set(key, value);
    }
  });

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // Do not send both authentication methods in the same request.
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  } else {
    target.searchParams.set("api_key", apiKey!);
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const body: unknown = await upstream.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_tmdb_response",
            message: "TMDB returned an invalid response.",
          },
        },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      const tmdbError = body as TMDBErrorBody;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "tmdb_upstream_error",
            status: upstream.status,
            message: tmdbError.status_message || "TMDB request failed.",
          },
        },
        { status: upstream.status }
      );
    }

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=180, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "tmdb_unavailable",
          message: "TMDB is temporarily unavailable.",
        },
      },
      { status: 502 }
    );
  }
}
