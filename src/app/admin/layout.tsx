import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex items-center gap-6 px-4 py-3 border-b border-border bg-panel">
        <Link href="/" className="font-display font-bold text-lg tracking-tight">
          Worldiqo
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="text-muted hover:text-fg transition-colors">
            Overview
          </Link>
          <Link href="/admin/users" className="text-muted hover:text-fg transition-colors">
            Users
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs font-mono text-muted-2">
          <span>{session.user.email}</span>
          <Link href="/" className="text-signal-cyan hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
