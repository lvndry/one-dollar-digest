"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDateAwareNav } from "@/hooks/useDateAwareNav";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { ThemeToggle } from "./ThemeToggle";
import { MobileTabBar } from "./MobileTabBar";
import { createCheckoutSession } from "@/app/actions";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

const NAV_ITEMS = [
  { href: "/", label: "Today" },
  { href: "/tech", label: "Technology" },
  { href: "/politics", label: "Politics" },
  { href: "/bookmarks", label: "Bookmarks" },
];

interface SiteNavProps {
  session: Session | null;
}

export function SiteNav({ session }: SiteNavProps) {
  const pathname = usePathname();
  const toHref = useDateAwareNav();
  useSwipeNavigation();

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href={toHref("/")}
          className="font-display italic shrink-0"
          style={{ color: "var(--ink)", fontSize: "1rem", letterSpacing: "-0.01em" }}
        >
          The One Dollar Digest
        </Link>

        <nav className="hidden sm:flex items-center gap-8">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={toHref(href)}
                className="font-ui text-[0.6rem] tracking-widest uppercase transition-opacity duration-150"
                style={{
                  color: active ? "var(--ink)" : "var(--ink-muted)",
                  fontWeight: active ? "500" : "400",
                  opacity: 1,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          {session?.user ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/account"
                  className="font-ui text-[0.6rem] tracking-widest uppercase transition-opacity duration-150 hover:opacity-60"
                  style={{ color: "var(--ink-muted)" }}
                >
                  Account
                </Link>
                {!session.user.subscribed && (
                  <form action={createCheckoutSession}>
                    <button
                      type="submit"
                      className="font-ui text-[0.6rem] tracking-widest uppercase px-3 py-1.5 transition-opacity duration-150 hover:opacity-70"
                      style={{
                        color: "var(--bg)",
                        backgroundColor: "var(--accent)",
                      }}
                    >
                      Upgrade — $1/mo
                    </button>
                  </form>
                )}
                <button
                  onClick={() => signOut({ redirectTo: "/" })}
                  className="font-ui text-[0.6rem] tracking-widest uppercase transition-opacity duration-150 hover:opacity-60"
                  style={{ color: "var(--ink-muted)" }}
                >
                  Sign out
                </button>
              </div>
              <div className="flex sm:hidden items-center gap-1">
                {!session.user.subscribed && (
                  <form action={createCheckoutSession}>
                    <button
                      type="submit"
                      className="font-ui text-[0.55rem] tracking-[0.12em] uppercase px-2.5 py-1.5 transition-opacity duration-150 active:opacity-70"
                      style={{
                        color: "var(--bg)",
                        backgroundColor: "var(--accent)",
                      }}
                    >
                      Upgrade
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ redirectTo: "/" })}
                  aria-label="Sign out"
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-colors duration-150"
                  style={{ color: "var(--ink-muted)" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                aria-label="Sign in"
                className="sm:hidden w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-colors duration-150 hover:opacity-80 active:opacity-70"
                style={{
                  color: "var(--bg)",
                  backgroundColor: "var(--ink)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="hidden sm:inline-block font-ui text-[0.6rem] tracking-widest uppercase px-4 py-2 transition-opacity duration-150 hover:opacity-75"
                style={{
                  color: "var(--bg)",
                  backgroundColor: "var(--ink)",
                }}
              >
                Sign in
              </Link>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>

      <MobileTabBar />
    </header>
  );
}
