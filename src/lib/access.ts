import type { Session } from "next-auth";

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

export type ApiKeyUser = {
  subscribed: boolean;
};

export function canAccessArchive(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.subscribed) return true;
  if (!session.user.createdAt) return false;
  return Date.now() - new Date(session.user.createdAt).getTime() < TRIAL_MS;
}

export function canAccessDigestDate(
  digestDate: string,
  session: Session | null,
  apiKeyUser: ApiKeyUser | null = null,
): boolean {
  const today = new Date().toISOString().split("T")[0]!;
  if (digestDate === today) return true;
  if (canAccessArchive(session)) return true;
  return apiKeyUser?.subscribed ?? false;
}

/**
 * Programmatic access is deliberately stricter than the website. A valid API
 * key is required even for today's free digest; only subscribed key owners may
 * read an archived digest.
 */
export function canAccessApiDigestDate(
  digestDate: string,
  apiKeyUser: ApiKeyUser | null,
): boolean {
  if (!apiKeyUser) return false;
  return digestDate === new Date().toISOString().split("T")[0] || apiKeyUser.subscribed;
}

export function trialDaysRemaining(session: Session | null): number {
  if (!session?.user?.createdAt) return 0;
  const elapsed = Date.now() - new Date(session.user.createdAt).getTime();
  return Math.max(0, Math.ceil((TRIAL_MS - elapsed) / (24 * 60 * 60 * 1000)));
}
