"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/gdelt";
import type { CategoryId, SourceId } from "@/lib/types";
import { createSavedSearch } from "@/lib/actions/alerts";

const TIMESPANS: { id: string; label: string }[] = [
  { id: "1h", label: "1h" },
  { id: "6h", label: "6h" },
  { id: "12h", label: "12h" },
  { id: "24h", label: "24h" },
  { id: "3d", label: "3d" },
];

interface FilterRailProps {
  mode: "news" | "markets";
  onModeChange: (m: "news" | "markets") => void;
  category: CategoryId;
  onCategoryChange: (c: CategoryId) => void;
  search: string;
  onSearchChange: (s: string) => void;
  timespan: string;
  onTimespanChange: (t: string) => void;
  source: "auto" | SourceId;
  onSourceChange: (s: "auto" | SourceId) => void;
  eventCount: number;
}

function SaveSearchControl({
  category,
  search,
  timespan,
}: {
  category: CategoryId;
  search: string;
  timespan: string;
}) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session?.user) {
    return (
      <p className="text-xs text-muted-2">
        <Link href="/login" className="text-signal-cyan hover:underline">
          Sign in
        </Link>{" "}
        to save this search and get email alerts.
      </p>
    );
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    const cat = CATEGORIES.find((c) => c.id === category);
    startTransition(async () => {
      try {
        await createSavedSearch({
          name: `${cat?.label ?? "All signals"}${search ? `: ${search}` : ""}`,
          category,
          query: search || null,
          timespan,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save this search.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-mono px-2.5 py-1.5 rounded border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/10 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save as alert"}
        </button>
        <Link href="/alerts" className="text-xs text-muted hover:text-fg transition-colors">
          Manage alerts →
        </Link>
      </div>
      {error && <p className="text-xs text-signal-amber leading-snug">{error}</p>}
    </div>
  );
}

export default function FilterRail({
  mode,
  onModeChange,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  timespan,
  onTimespanChange,
  source,
  onSourceChange,
  eventCount,
}: FilterRailProps) {
  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-panel flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex gap-1.5">
          {(["news", "markets"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-mono uppercase tracking-wide transition-colors ${
                mode === m
                  ? "bg-signal-cyan/15 border border-signal-cyan text-signal-cyan"
                  : "border border-border text-muted hover:text-fg hover:border-muted-2"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "markets" ? (
        <div className="p-4">
          <p className="text-sm text-muted leading-relaxed">
            Live currency and precious metal prices, with historical charts.
          </p>
        </div>
      ) : (
        <>
      <div className="p-4 border-b border-border">
        <label className="text-xs uppercase tracking-wider text-muted mb-2 block">
          Search signals
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="e.g. Taiwan, Nvidia, ECB..."
          className="w-full bg-panel-raised border border-border rounded-md px-3 py-2 text-sm font-mono placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-signal-cyan"
        />
      </div>

      <div className="p-4 border-b border-border">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Window</p>
        <div className="flex gap-1.5 flex-wrap">
          {TIMESPANS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTimespanChange(t.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                timespan === t.id
                  ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                  : "border-border text-muted hover:text-fg hover:border-muted-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">
          Source
          <span className="normal-case tracking-normal text-muted-2"> — auto falls back automatically</span>
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {(["auto", "gdelt", "rss"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSourceChange(s)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors uppercase ${
                source === s
                  ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                  : "border-border text-muted hover:text-fg hover:border-muted-2"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {source === "rss" && (
          <p className="text-xs text-muted-2 mt-2 leading-snug">
            RSS mode has no map coordinates — the map will be empty. Use GDELT
            or Auto for pins.
          </p>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto thin-scroll">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Categories</p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-colors ${
                category === c.id ? "bg-panel-raised" : "hover:bg-panel-raised/60"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: c.color }}
              />
              <span className={category === c.id ? "text-fg" : "text-muted"}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border flex flex-col gap-2">
        <SaveSearchControl category={category} search={search} timespan={timespan} />
        <p className="text-xs text-muted-2 font-mono">
          {eventCount} article{eventCount === 1 ? "" : "s"} in window
        </p>
      </div>
        </>
      )}
    </aside>
  );
}
