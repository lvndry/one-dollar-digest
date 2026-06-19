"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { auth } from "@/auth";
import { canAccessArchive } from "@/lib/access";
import { generateApiKeyValue, getKeyDisplayPrefix, hashApiKey } from "@/lib/api-key";
import { db } from "@/lib/db";
import { apiKeys, bookmarks } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function createCheckoutSession() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;
  if (!stripeSecretKey || !stripePriceId) {
    throw new Error("Stripe checkout is not configured");
  }

  const stripe = new Stripe(stripeSecretKey);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${base}/?subscribed=1`,
    cancel_url: `${base}/`,
  });

  if (!checkout.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  redirect(checkout.url);
}

export async function toggleBookmark(articleId: number) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!canAccessArchive(session)) redirect("/");

  const existing = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, session.user.id), eq(bookmarks.articleId, articleId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(bookmarks)
      .where(
        and(eq(bookmarks.userId, session.user.id), eq(bookmarks.articleId, articleId)),
      );
  } else {
    await db.insert(bookmarks).values({
      userId: session.user.id,
      articleId,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/article/${articleId}`);
  revalidatePath("/bookmarks");
}

export type ApiKeyStatus = {
  prefix: string | null;
  createdAt: Date | null;
};

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const session = await auth();
  if (!session?.user?.id || !session.user.subscribed) {
    return { prefix: null, createdAt: null };
  }

  const rows = await db
    .select({ keyPrefix: apiKeys.keyPrefix, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .limit(1);

  const row = rows[0];
  return {
    prefix: row?.keyPrefix ?? null,
    createdAt: row?.createdAt ?? null,
  };
}

export async function generateApiKey(): Promise<{ key: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.subscribed) {
    return { error: "An active subscription is required to generate an API key." };
  }

  const key = generateApiKeyValue();
  const now = new Date();

  await db
    .insert(apiKeys)
    .values({
      userId: session.user.id,
      keyHash: hashApiKey(key),
      keyPrefix: getKeyDisplayPrefix(key),
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: apiKeys.userId,
      set: {
        keyHash: hashApiKey(key),
        keyPrefix: getKeyDisplayPrefix(key),
        createdAt: now,
      },
    });

  revalidatePath("/account");
  return { key };
}

export async function revokeApiKey(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.subscribed) redirect("/account");

  await db.delete(apiKeys).where(eq(apiKeys.userId, session.user.id));
  revalidatePath("/account");
}
