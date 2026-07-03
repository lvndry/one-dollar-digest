"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { dateAwareHref } from "@/lib/nav";

const SWIPEABLE_TABS = ["/", "/tech", "/politics", "/finance"];
const SWIPE_THRESHOLD = 80;
const HORIZONTAL_DOMINANCE_RATIO = 1.5;

export function useSwipeNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const date = searchParams.get("date");
    let startX = 0;
    let startY = 0;

    function onTouchStart(event: TouchEvent) {
      startX = event.touches[0]!.clientX;
      startY = event.touches[0]!.clientY;
    }

    function onTouchEnd(event: TouchEvent) {
      const deltaX = event.changedTouches[0]!.clientX - startX;
      const deltaY = event.changedTouches[0]!.clientY - startY;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_DOMINANCE_RATIO) return;

      const currentIndex = SWIPEABLE_TABS.indexOf(pathname);
      if (currentIndex === -1) return;

      if (deltaX < 0 && currentIndex < SWIPEABLE_TABS.length - 1) {
        router.push(dateAwareHref(SWIPEABLE_TABS[currentIndex + 1]!, date));
      } else if (deltaX > 0 && currentIndex > 0) {
        router.push(dateAwareHref(SWIPEABLE_TABS[currentIndex - 1]!, date));
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, pathname, searchParams]);
}
