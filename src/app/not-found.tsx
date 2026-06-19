import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes printRule {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes glyphSettle {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nf-rule {
          transform-origin: left center;
        }

        @media (prefers-reduced-motion: no-preference) {
          .nf-rule-1 { animation: printRule 0.9s 0.05s cubic-bezier(0.16,1,0.3,1) both; }
          .nf-rule-2 { animation: printRule 0.9s 0.18s cubic-bezier(0.16,1,0.3,1) both; }
          .nf-rule-3 { animation: printRule 0.9s 0.28s cubic-bezier(0.16,1,0.3,1) both; }
          .nf-rule-4 { animation: printRule 0.9s 0.38s cubic-bezier(0.16,1,0.3,1) both; }
          .nf-glyph  { animation: glyphSettle 1.1s 0.55s cubic-bezier(0.16,1,0.3,1) both; }
          .nf-up-1   { animation: fadeUp 0.65s 1.05s cubic-bezier(0.16,1,0.3,1) both; }
          .nf-up-2   { animation: fadeUp 0.65s 1.2s  cubic-bezier(0.16,1,0.3,1) both; }
          .nf-up-3   { animation: fadeUp 0.65s 1.35s cubic-bezier(0.16,1,0.3,1) both; }
        }

      `}</style>

      {/* Print registration marks */}
      {(
        [
          { top: "20px", left: "20px" },
          { top: "20px", right: "20px" },
          { bottom: "20px", left: "20px" },
          { bottom: "20px", right: "20px" },
        ] as React.CSSProperties[]
      ).map((pos, i) => (
        <span
          key={i}
          className="font-ui"
          style={{
            position: "fixed",
            fontSize: "10px",
            color: "var(--ink-faint)",
            lineHeight: 1,
            pointerEvents: "none",
            userSelect: "none",
            ...pos,
          }}
          aria-hidden
        >
          +
        </span>
      ))}

      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--bg)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "4rem clamp(1.5rem, 5vw, 5rem)",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto", width: "100%" }}>
          {/* ── Newspaper masthead ── */}
          <div>
            <div
              className="nf-rule nf-rule-1"
              style={{ height: "3px", backgroundColor: "var(--ink)" }}
            />
            <div style={{ height: "5px" }} />
            <div
              className="nf-rule nf-rule-2"
              style={{ height: "1px", backgroundColor: "var(--ink)" }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "10px 0",
              }}
            >
              <span
                className="font-ui"
                style={{
                  fontSize: "0.575rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                }}
              >
                The One Dollar Digest
              </span>
              <span
                className="font-ui"
                style={{
                  fontSize: "0.575rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                }}
              >
                No. 404 — Edition Not Found
              </span>
            </div>

            <div
              className="nf-rule nf-rule-3"
              style={{ height: "1px", backgroundColor: "var(--ink)" }}
            />
            <div style={{ height: "5px" }} />
            <div
              className="nf-rule nf-rule-4"
              style={{ height: "3px", backgroundColor: "var(--ink)" }}
            />
          </div>

          {/* ── Giant 404 ── */}
          <div style={{ textAlign: "center", padding: "3rem 0 2.5rem" }}>
            <h1
              className="nf-glyph font-display"
              style={{
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(6rem, 22vw, 18rem)",
                lineHeight: 0.88,
                letterSpacing: "-0.04em",
                color: "var(--ink)",
                margin: 0,
              }}
            >
              404
            </h1>
          </div>

          {/* ── Divider ── */}
          <div
            style={{
              height: "1px",
              backgroundColor: "var(--border-strong)",
              marginBottom: "2.5rem",
            }}
          />

          {/* ── Copy ── */}
          <div
            className="nf-up-1"
            style={{ textAlign: "center", marginBottom: "1.25rem" }}
          >
            <p
              className="font-ui"
              style={{
                fontSize: "0.575rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: 0,
              }}
            >
              Page not found
            </p>
          </div>

          <div
            className="nf-up-2"
            style={{
              maxWidth: "420px",
              margin: "0 auto 2.75rem",
              textAlign: "center",
            }}
          >
            <p
              className="font-body"
              style={{
                fontSize: "1rem",
                lineHeight: 1.85,
                color: "var(--ink-mid)",
                margin: 0,
              }}
            >
              The article or page you requested does not exist in our archives. It may
              have been moved, removed, or never published.
            </p>
          </div>

          <div className="nf-up-3" style={{ textAlign: "center" }}>
            <Link
              href="/"
              className="btn-accent font-ui text-[0.6875rem] tracking-[0.08em] uppercase px-6 py-3 border inline-block"
            >
              ← Return to Today&apos;s Digest
            </Link>
          </div>

          {/* ── Bottom rule ── */}
          <div
            style={{
              marginTop: "3.5rem",
              height: "1px",
              backgroundColor: "var(--border)",
            }}
          />
        </div>
      </main>
    </>
  );
}
