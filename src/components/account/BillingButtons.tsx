"use client";

import { useState, useTransition } from "react";
import { startCheckout, openBillingPortal } from "@/lib/actions/billing";

export default function BillingButtons({ premium }: { premium: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {premium ? (
        <button
          disabled={isPending}
          onClick={() => run(openBillingPortal)}
          className="text-sm font-medium px-4 py-2 rounded-md border border-border text-fg hover:border-muted-2 transition-colors disabled:opacity-50"
        >
          {isPending ? "Opening…" : "Manage billing"}
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => run(startCheckout)}
          className="text-sm font-medium px-4 py-2 rounded-md bg-signal-cyan/15 border border-signal-cyan text-signal-cyan hover:bg-signal-cyan/25 transition-colors disabled:opacity-50"
        >
          {isPending ? "Redirecting…" : "Upgrade to Premium"}
        </button>
      )}
      {error && <p className="text-xs text-signal-red">{error}</p>}
    </div>
  );
}
