import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPremium, FREE_SAVED_SEARCH_LIMIT } from "@/lib/billing";
import BillingButtons from "@/components/account/BillingButtons";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const { checkout } = await searchParams;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      email: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      _count: { select: { savedSearches: true } },
    },
  });

  const premium = isPremium(user.subscriptionStatus);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex items-center gap-6 px-4 py-3 border-b border-border bg-panel">
        <Link href="/" className="font-display font-bold text-lg tracking-tight">
          Worldiqo
        </Link>
        <span className="text-sm text-muted">Account</span>
        <Link href="/" className="ml-auto text-xs text-signal-cyan hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <main className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
        {checkout === "success" && (
          <div className="bg-signal-green/10 border border-signal-green/30 text-signal-green text-sm rounded-lg px-4 py-3">
            You&apos;re on Premium now — thanks for subscribing.
          </div>
        )}
        {checkout === "canceled" && (
          <div className="bg-panel border border-border text-muted text-sm rounded-lg px-4 py-3">
            Checkout was canceled — no charge was made.
          </div>
        )}

        <div>
          <h1 className="font-display text-xl font-semibold mb-1">Your plan</h1>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
        </div>

        <div className="bg-panel border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold">
                {premium ? "Premium" : "Free"}
              </p>
              <p className="text-sm text-muted mt-1">
                {premium
                  ? user.currentPeriodEnd
                    ? `Renews ${new Date(user.currentPeriodEnd).toLocaleDateString()}`
                    : "Active subscription"
                  : `${user._count.savedSearches}/${FREE_SAVED_SEARCH_LIMIT} saved search alerts used`}
              </p>
            </div>
            <span
              className={`text-xs font-mono px-2 py-1 rounded ${
                premium
                  ? "bg-signal-green/15 text-signal-green"
                  : "bg-panel-raised text-muted"
              }`}
            >
              {user.subscriptionStatus}
            </span>
          </div>

          <ul className="text-sm text-muted space-y-1.5">
            <li>✓ Live map, feed, and charts — unlimited, on every plan</li>
            <li className={premium ? "" : "opacity-50"}>
              {premium ? "✓" : "—"} Unlimited saved-search email alerts
            </li>
            <li className={premium ? "" : "opacity-50"}>
              {premium ? "✓" : "—"} Extended 3-day lookback window
            </li>
          </ul>

          <BillingButtons premium={premium} />
        </div>
      </main>
    </div>
  );
}
