import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The One Dollar Digest: Technology";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#131210",
        display: "flex",
        flexDirection: "column",
        padding: "64px 80px",
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 48,
        }}
      >
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6a6460",
          }}
        >
          The One Dollar Digest
        </span>
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#fff",
            background: "#6d28d9",
            padding: "6px 14px",
          }}
        >
          Technology
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1
          style={{
            fontSize: 96,
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 0.92,
            color: "#eae4da",
            margin: 0,
          }}
        >
          Today in Tech
        </h1>
      </div>

      {/* Bottom */}
      <div style={{ height: 1, background: "#2c2a26", marginBottom: 20 }} />
      <p
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6a6460",
          margin: 0,
        }}
      >
        AI, startups, research &amp; security, curated daily
      </p>
    </div>,
    size,
  );
}
