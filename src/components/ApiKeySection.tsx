"use client";

import { useState, useTransition } from "react";
import { generateApiKey, revokeApiKey, type ApiKeyStatus } from "@/app/actions";

interface ApiKeySectionProps {
  initialStatus: ApiKeyStatus;
  canGenerate?: boolean;
}

export function ApiKeySection({ initialStatus, canGenerate = true }: ApiKeySectionProps) {
  const [status, setStatus] = useState(initialStatus);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await generateApiKey();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRevealedKey(result.key);
      setStatus({
        prefix: `${result.key.slice(0, 12)}...`,
        createdAt: new Date(),
      });
    });
  }

  function handleRevoke() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      await revokeApiKey();
      setRevealedKey(null);
      setStatus({ prefix: null, createdAt: null });
    });
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
  }

  return (
    <section>
      <h2
        className="font-display italic text-[1.75rem] mb-3"
        style={{ color: "var(--ink)" }}
      >
        API key
      </h2>
      <p
        className="font-ui text-[0.75rem] leading-relaxed mb-6 max-w-xl"
        style={{ color: "var(--ink-muted)" }}
      >
        API keys are required for scripts and AI agents. Free keys can access today&apos;s
        digest; Premium keys can also access the archive.
      </p>

      {status.prefix ? (
        <div
          className="mb-6 px-4 py-3 font-mono text-[0.75rem]"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "color-mix(in srgb, var(--ink) 3%, transparent)",
          }}
        >
          Active key: {status.prefix}
          {status.createdAt ? (
            <span style={{ color: "var(--ink-faint)" }} suppressHydrationWarning>
              {" "}
              · created{" "}
              {status.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="font-ui text-[0.75rem] mb-6" style={{ color: "var(--ink-faint)" }}>
          No API key yet.
        </p>
      )}

      {revealedKey ? (
        <div className="mb-6">
          <p
            className="font-ui text-[0.65rem] tracking-[0.08em] uppercase mb-2"
            style={{ color: "var(--ink-muted)" }}
          >
            Copy now — it won&apos;t be shown again
          </p>
          <div
            className="px-4 py-3 font-mono text-[0.7rem] break-all mb-3"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "color-mix(in srgb, var(--ink) 3%, transparent)",
            }}
          >
            {revealedKey}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="font-ui text-[0.65rem] tracking-[0.08em] uppercase px-4 py-2 border transition-opacity duration-150 hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {copied ? "Copied" : "Copy key"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="font-ui text-[0.75rem] mb-4" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canGenerate ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="font-ui text-[0.65rem] tracking-[0.08em] uppercase px-4 py-2 transition-opacity duration-150 hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--bg)", backgroundColor: "var(--accent)" }}
          >
            {status.prefix ? "Regenerate key" : "Generate key"}
          </button>
        ) : null}
        {status.prefix ? (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className="font-ui text-[0.65rem] tracking-[0.08em] uppercase px-4 py-2 border transition-opacity duration-150 hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
          >
            Revoke key
          </button>
        ) : null}
      </div>

      <div
        className="mt-8 pt-6 font-mono text-[0.65rem] leading-relaxed"
        style={{ borderTop: "1px solid var(--border)", color: "var(--ink-faint)" }}
      >
        <p className="mb-2">Example:</p>
        <p>curl -H &quot;Authorization: Bearer YOUR_KEY&quot; \</p>
        <p className="pl-4">https://www.onedollardigest.com/api/articles?date=today</p>
      </div>
    </section>
  );
}
