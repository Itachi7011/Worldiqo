"use client";

import { useEffect, useState } from "react";
import { categoryById } from "@/lib/gdelt";
import type { CategoryId, SourceId } from "@/lib/types";
import AuthStatus from "./AuthStatus";

interface TopBarProps {
  eventCount: number;
  geoCount: number;
  category: CategoryId;
  fetchedAt: string | null;
  errors: string[];
  sourcesUsed: SourceId[];
}

export default function TopBar({
  eventCount,
  geoCount,
  category,
  fetchedAt,
  errors,
  sourcesUsed,
}: TopBarProps) {
  const [utc, setUtc] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      setUtc(
        new Date().toUTCString().split(" ").slice(0, 5).join(" ").replace("GMT", "UTC")
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cat = categoryById(category);

  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-border bg-panel">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full pulse-marker"
          style={{ color: "var(--signal-cyan)", background: "var(--signal-cyan)" }}
        />
        <h1 className="font-display font-bold text-lg tracking-tight">Worldiqo</h1>
      </div>

      <div className="hidden md:flex items-center gap-4 pl-4 border-l border-border text-xs font-mono text-muted">
        <span>
          <span className="text-fg">{eventCount}</span> articles
        </span>
        <span>
          <span className="text-fg">{geoCount}</span> geolocated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
          {cat.label}
        </span>
        {sourcesUsed.length > 0 && (
          <span className="uppercase">via {sourcesUsed.join(" + ")}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4 text-xs font-mono text-muted-2">
        {errors.length > 0 && (
          <span className="text-signal-amber" title={errors.join(" · ")}>
            ⚠ source degraded
          </span>
        )}
        {fetchedAt && <span className="hidden sm:inline">updated {new Date(fetchedAt).toLocaleTimeString()}</span>}
        <span suppressHydrationWarning>{utc}</span>
        <AuthStatus />
      </div>
    </header>
  );
}
