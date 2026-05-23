import { NextRequest, NextResponse } from "next/server";

export function getConfiguredApiKey(): string | null {
  const key = process.env.EIE_TOOL_API_KEY?.trim();

  if (!key) {
    return null;
  }

  return key;
}

export function requireApiKey(request: NextRequest): NextResponse | null {
  const configuredKey = getConfiguredApiKey();

  if (!configuredKey) {
    return NextResponse.json(
      { error: "Server configuration error: API key not configured." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized: missing Authorization header." },
      { status: 401 }
    );
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedKey = match?.[1]?.trim();

  if (!providedKey || providedKey !== configuredKey) {
    return NextResponse.json(
      { error: "Unauthorized: invalid API key." },
      { status: 401 }
    );
  }

  return null;
}
