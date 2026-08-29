/// <reference types="bun-types" />
import { beforeAll, describe, expect, test } from "bun:test";
import { createClient } from "@libsql/client";

// bunfig [test].preload (scripts/test-prelude.ts) has already pointed
// TURSO_DATABASE_URL at an isolated temp DB before any @/ module imported, so
// the shared db (used by authenticateApiKeyFromRequest) and this raw client
// hit the same throwaway file.
const dbUrl = process.env.TURSO_DATABASE_URL!;
const raw = createClient({ url: dbUrl });

const { authenticateApiKeyFromRequest, generateApiKeyValue, hashApiKey } =
  await import("@/lib/api-key");
const { db } = await import("@/lib/db");
const { users, apiKeys } = await import("@/lib/schema");

async function seedUser(subscribed: boolean): Promise<string> {
  const id = "user_" + Math.random().toString(36).slice(2);
  await db
    .insert(users)
    .values({ id, email: id + "@x.dev", subscribed, createdAt: new Date() })
    .onConflictDoNothing();
  return id;
}

async function seedKey(userId: string): Promise<string> {
  const key = generateApiKeyValue();
  await db.insert(apiKeys).values({
    userId,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, 12),
    createdAt: new Date(),
  });
  return key;
}

describe("api-key archive gate (api_key -> user.subscribed join)", () => {
  beforeAll(async () => {
    await raw.execute(
      `CREATE TABLE IF NOT EXISTS "user" (
        id text primary key,
        name text,
        email text not null,
        emailVerified integer,
        image text,
        subscribed integer default 0,
        stripe_customer_id text,
        stripe_subscription_id text,
        stripe_subscription_status text,
        created_at integer
      )`,
    );
    await raw.execute(
      "CREATE TABLE IF NOT EXISTS api_key (user_id text primary key, key_hash text not null, key_prefix text not null, created_at integer not null)",
    );
  });

  test("grants archive access when the key's user is subscribed", async () => {
    const userId = await seedUser(true);
    const key = await seedKey(userId);
    const req = new Request("https://example.com", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(await authenticateApiKeyFromRequest(req)).toEqual({ subscribed: true });
  });

  test("denies archive access when the key's user is not subscribed", async () => {
    const userId = await seedUser(false);
    const key = await seedKey(userId);
    const req = new Request("https://example.com", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(await authenticateApiKeyFromRequest(req)).toBeNull();
  });

  test("denies archive access when the key is unknown", async () => {
    const req = new Request("https://example.com", {
      headers: { Authorization: `Bearer ${generateApiKeyValue()}` },
    });
    expect(await authenticateApiKeyFromRequest(req)).toBeNull();
  });

  test("rejects non-odd_ keys without querying the database", async () => {
    const before = await raw.execute("SELECT count(*) AS c FROM api_key");
    const req = new Request("https://example.com", {
      headers: { "X-API-Key": "sk_live_not_our_prefix" },
    });
    expect(await authenticateApiKeyFromRequest(req)).toBeNull();
    const after = await raw.execute("SELECT count(*) AS c FROM api_key");
    expect(after.rows[0].c).toEqual(before.rows[0].c);
  });
});
