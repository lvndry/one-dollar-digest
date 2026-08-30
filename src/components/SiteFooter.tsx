import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="max-w-5xl mx-auto px-6 border-t pb-16 pt-8 flex items-center justify-between flex-wrap gap-4"
      style={{ borderColor: "var(--border)" }}
    >
      <span
        className="font-ui text-[0.575rem] tracking-[0.08em] uppercase"
        style={{ color: "var(--ink-faint)" }}
      >
        © {new Date().getFullYear()} The One Dollar Digest
      </span>
      <span
        className="font-display italic text-[0.875rem]"
        style={{ color: "var(--ink-muted)" }}
      >
        One dollar. Every story that matters.
      </span>
      <span className="flex items-center gap-4">
        <Link
          href="/contact"
          className="font-ui text-[0.575rem] tracking-[0.08em] uppercase transition-opacity duration-150 hover:opacity-60"
          style={{ color: "var(--ink-faint)" }}
        >
          Contact
        </Link>
        <Link
          href="/privacy"
          className="font-ui text-[0.575rem] tracking-[0.08em] uppercase transition-opacity duration-150 hover:opacity-60"
          style={{ color: "var(--ink-faint)" }}
        >
          Privacy
        </Link>
      </span>
    </footer>
  );
}
