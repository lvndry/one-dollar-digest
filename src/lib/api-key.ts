import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { ApiKeyUser } from "@/lib/access";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/schema";

const API_KEY_PREFIX = "odd_";

export function generateApiKeyValue(): string {
  return API_KEY_PREFIX + randomBytes(24).toString("base64url");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function getKeyDisplayPrefix(key: string): string {
  return `${key.slice(0, 12)}...`;
}

export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && /^bearer\s+/i.test(authHeader)) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const apiKeyHeader = request.headers.get("x-api-key")?.trim();
  return apiKeyHeader || null;
}

export async function authenticateApiKeyFromRequest(
  request: Request,
): Promise<ApiKeyUser | null> {
  const key = extractApiKeyFromRequest(request);
  if (!key?.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = hashApiKey(key);
  const rows = await db
    .select({ subscribed: users.subscribed })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { subscribed: row.subscribed ?? false };
}
