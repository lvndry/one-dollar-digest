import { NextResponse } from "next/server";
import { canAccessApiDigestDate, type ApiKeyUser } from "@/lib/access";
import { authenticateApiKeyFromRequest } from "@/lib/api-key";

const API_KEY_CHALLENGE = 'Bearer realm="onedollardigest-api"';

export async function requireApiKey(
  request: Request,
): Promise<{ apiKeyUser: ApiKeyUser } | { response: NextResponse }> {
  const apiKeyUser = await authenticateApiKeyFromRequest(request);
  if (apiKeyUser) return { apiKeyUser };

  return {
    response: NextResponse.json(
      {
        error: {
          code: "api_key_required",
          message:
            "A valid API key is required. Create a free key to access today's digest.",
        },
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": API_KEY_CHALLENGE,
          "Cache-Control": "private, no-store",
        },
      },
    ),
  };
}

export function apiAccessDeniedResponse(digestDate: string, apiKeyUser: ApiKeyUser) {
  if (canAccessApiDigestDate(digestDate, apiKeyUser)) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
  return NextResponse.json(
    {
      error: {
        code: "premium_required",
        message: "Archive access requires a Premium API key.",
        upgradeUrl: `${baseUrl}/account`,
      },
    },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function apiResponseHeaders(contentType?: string): HeadersInit {
  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    "Cache-Control": "private, no-store",
  };
}
