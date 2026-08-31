import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApiKeyStatus, createCheckoutSession } from "@/app/actions";
import { ApiKeySection } from "@/components/ApiKeySection";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const apiKeyStatus = await getApiKeyStatus();

  return (
    <div
      style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--ink)" }}
    >
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <p
            className="font-ui text-[0.6rem] tracking-[0.14em] uppercase mb-4"
            style={{ color: "var(--ink-muted)" }}
          >
            Your account
          </p>
          <h1
            className="font-display italic text-[clamp(2.5rem,6vw,4rem)] tracking-tight leading-[0.93]"
            style={{ color: "var(--ink)" }}
          >
            Account
          </h1>
        </div>

        <div className="h-px mb-12" style={{ backgroundColor: "var(--border)" }} />

        <div className="max-w-2xl space-y-12">
          <section>
            <h2
              className="font-display italic text-[1.75rem] mb-3"
              style={{ color: "var(--ink)" }}
            >
              Subscription
            </h2>
            <p className="font-ui text-[0.75rem]" style={{ color: "var(--ink-muted)" }}>
              Signed in as {session.user.email}
            </p>
            <p
              className="font-ui text-[0.75rem] mt-2"
              style={{ color: "var(--ink-muted)" }}
            >
              Status:{" "}
              {session.user.subscribed ? "Active subscriber" : "Free trial or expired"}
            </p>
            {!session.user.subscribed ? (
              <form action={createCheckoutSession} className="mt-6">
                <button
                  type="submit"
                  className="font-ui text-[0.65rem] tracking-[0.08em] uppercase px-4 py-2 transition-opacity duration-150 hover:opacity-70"
                  style={{ color: "var(--bg)", backgroundColor: "var(--accent)" }}
                >
                  Upgrade — $1/mo
                </button>
              </form>
            ) : null}
          </section>

          <>
            <div className="h-px" style={{ backgroundColor: "var(--border)" }} />
            <ApiKeySection initialStatus={apiKeyStatus} />
          </>
        </div>
      </div>
    </div>
  );
}
