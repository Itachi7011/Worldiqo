import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AlertList from "@/components/alerts/AlertList";

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/alerts");

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex items-center gap-6 px-4 py-3 border-b border-border bg-panel">
        <Link href="/" className="font-display font-bold text-lg tracking-tight">
          Worldiqo
        </Link>
        <span className="text-sm text-muted">Alerts</span>
        <Link href="/" className="ml-auto text-xs text-signal-cyan hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <main className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-xl font-semibold mb-1">Your saved searches</h1>
          <p className="text-sm text-muted">
            Each active search is checked on a schedule; when there&apos;s new
            coverage, you&apos;ll get an email digest at {session.user.email}.
          </p>
        </div>

        {searches.length === 0 ? (
          <div className="bg-panel border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted">
              No saved searches yet. Go to the dashboard, set up a filter, and hit
              &quot;Save as alert.&quot;
            </p>
          </div>
        ) : (
          <AlertList searches={searches} />
        )}
      </main>
    </div>
  );
}
