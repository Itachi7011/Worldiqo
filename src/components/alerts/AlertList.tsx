"use client";

import { useTransition } from "react";
import { toggleSavedSearch, deleteSavedSearch } from "@/lib/actions/alerts";
import { categoryById } from "@/lib/gdelt";

interface SavedSearchRow {
  id: string;
  name: string;
  category: string;
  query: string | null;
  timespan: string;
  active: boolean;
  lastRunAt: Date | null;
  lastSentCount: number;
}

export default function AlertList({ searches }: { searches: SavedSearchRow[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {searches.map((s) => {
        const cat = categoryById(s.category as never);
        return (
          <div
            key={s.id}
            className="bg-panel border border-border rounded-lg p-4 flex items-center gap-4"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: s.active ? cat.color : "var(--muted-2)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-2 font-mono mt-0.5">
                {cat.label} · window {s.timespan}
                {s.query ? ` · "${s.query}"` : ""}
                {s.lastRunAt
                  ? ` · last checked ${new Date(s.lastRunAt).toLocaleString()}`
                  : " · not checked yet"}
              </p>
            </div>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => toggleSavedSearch(s.id))}
              className="text-xs font-mono px-2.5 py-1 rounded border border-border text-muted hover:text-fg hover:border-muted-2 transition-colors disabled:opacity-50"
            >
              {s.active ? "Pause" : "Resume"}
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteSavedSearch(s.id))}
              className="text-xs font-mono px-2.5 py-1 rounded border border-signal-red/40 text-signal-red hover:bg-signal-red/10 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        );
      })}
    </div>
  );
}
