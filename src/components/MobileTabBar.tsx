"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDateAwareNav } from "@/hooks/useDateAwareNav";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/tech", label: "Tech" },
  { href: "/politics", label: "Politics" },
  { href: "/finance", label: "Finance" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const toHref = useDateAwareNav();
  const activeIndex = TABS.findIndex((tab) => tab.href === pathname);

  return (
    <div className="sm:hidden border-t" style={{ borderColor: "var(--border)" }}>
      <div className="relative flex">
        {TABS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={toHref(href)}
              className="flex-1 py-2.5 text-center font-ui text-[0.6rem] tracking-[0.08em] uppercase transition-colors duration-150"
              style={{
                color: active ? "var(--ink)" : "var(--ink-muted)",
                fontWeight: active ? "500" : "400",
              }}
            >
              {label}
            </Link>
          );
        })}

        {activeIndex !== -1 && (
          <span
            className="absolute bottom-0 h-[2px] transition-transform duration-200 ease-out"
            style={{
              width: `${100 / TABS.length}%`,
              backgroundColor: "var(--accent)",
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
