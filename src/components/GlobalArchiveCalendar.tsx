"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DateCalendar } from "@/components/DateCalendar";

const DIGEST_PATHS = new Set(["/", "/tech", "/politics", "/finance"]);

/** Hide archive strip on auth flows: `/login`, `/login/verify`, and optional top-level `/verify`. */
function isAuthClutterPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/verify" || pathname.startsWith("/verify/")) return true;
  return false;
}

interface GlobalArchiveCalendarProps {
  availableDates: string[];
  canAccessArchive: boolean;
}

export function GlobalArchiveCalendar({
  availableDates,
  canAccessArchive,
}: GlobalArchiveCalendarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (isAuthClutterPath(pathname)) return null;

  const today = new Date().toISOString().split("T")[0]!;
  const selectedDate = searchParams.get("date") ?? today;
  const navigateBasePath = DIGEST_PATHS.has(pathname) ? pathname : "/";

  return (
    <DateCalendar
      availableDates={availableDates}
      selectedDate={selectedDate}
      canAccessArchive={canAccessArchive}
      navigateBasePath={navigateBasePath}
    />
  );
}
