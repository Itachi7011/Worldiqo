import { prisma } from "@/lib/prisma";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <p className="text-xs uppercase tracking-wider text-muted mb-2">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  // Server component — this runs fresh per request on the server, not during
  // a client render, so computing "now" here is safe despite the lint rule
  // being written primarily for client component purity.
  // eslint-disable-next-line react-hooks/purity
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalUsers, totalAdmins, newUsers24h] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: { createdAt: { gte: since24h } } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">Overview</h1>
        <p className="text-sm text-muted">Live counts from the Worldiqo database.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Admins" value={totalAdmins} />
        <StatCard label="New signups (24h)" value={newUsers24h} />
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">
          Live data source
        </p>
        <p className="text-sm text-muted">
          Event data itself (map pins, headlines, charts) isn&apos;t stored in this
          database — it&apos;s pulled live from GDELT on every request, so there&apos;s
          nothing to moderate here yet. Saved searches and alert history (Phase 4)
          live in the <code className="font-mono text-xs">SavedSearch</code> collection.
        </p>
      </div>
    </div>
  );
}
