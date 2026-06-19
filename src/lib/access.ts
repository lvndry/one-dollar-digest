import type { Session } from "next-auth";

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

export type ApiKeyArchiveUser = {
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
  apiKeyUser: ApiKeyArchiveUser | null = null,
): boolean {
  const today = new Date().toISOString().split("T")[0]!;
  if (digestDate === today) return true;
  if (canAccessArchive(session)) return true;
  return apiKeyUser?.subscribed ?? false;
}

export function trialDaysRemaining(session: Session | null): number {
  if (!session?.user?.createdAt) return 0;
  const elapsed = Date.now() - new Date(session.user.createdAt).getTime();
  return Math.max(0, Math.ceil((TRIAL_MS - elapsed) / (24 * 60 * 60 * 1000)));
}
