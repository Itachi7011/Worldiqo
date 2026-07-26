"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-xs text-muted-2 font-mono">…</span>;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-xs font-mono px-2.5 py-1 rounded border border-border text-muted hover:text-fg hover:border-muted-2 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.role === "admin" && (
        <Link
          href="/admin"
          className="text-xs font-mono px-2 py-1 rounded border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/10 transition-colors"
        >
          Admin
        </Link>
      )}
      <Link
        href="/alerts"
        className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-fg hover:border-muted-2 transition-colors"
      >
        Alerts
      </Link>
      <Link
        href="/account"
        className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-fg hover:border-muted-2 transition-colors"
      >
        Account
      </Link>
      <span className="hidden sm:inline text-xs font-mono text-muted">
        {session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-xs font-mono px-2.5 py-1 rounded border border-border text-muted hover:text-fg hover:border-muted-2 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
