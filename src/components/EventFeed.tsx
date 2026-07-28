"use client";

import type { NewsEvent } from "@/lib/types";
import { categoryById } from "@/lib/gdelt";
import Spinner from "./Spinner";
import ErrorBanner from "./ErrorBanner";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface EventFeedProps {
  events: NewsEvent[];
  loading: boolean;
  errors: string[];
}

export default function EventFeed({ events, loading, errors }: EventFeedProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold tracking-wide">Live Feed</h2>
        <span className="flex items-center gap-1.5 text-xs text-signal-cyan font-mono">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-signal-cyan" />
          </span>
          LIVE
        </span>
      </div>

      <ErrorBanner errors={errors} />

      <div className="flex-1 overflow-y-auto thin-scroll divide-y divide-border">
        {loading && events.length === 0 && (
          <div className="p-4">
            <Spinner label="Pulling live coverage…" />
          </div>
        )}
        {!loading && events.length === 0 && errors.length === 0 && (
          <div className="p-4 text-sm text-muted">
            No coverage matched this filter in the selected window. Try a wider
            window or a different category.
          </div>
        )}
        {!loading && events.length === 0 && errors.length > 0 && (
          <div className="p-4 text-sm text-muted">
            The data source(s) above returned an error rather than genuinely
            empty results — see the warning for details. Try switching Source
            to a different option in the sidebar.
          </div>
        )}
        {events.map((e) => {
          const cat = categoryById(e.category);
          return (
            <a
              key={e.id}
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="block p-3.5 hover:bg-panel-raised/60 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="text-[11px] uppercase tracking-wide text-muted-2 font-mono">
                  {e.domain}
                </span>
                <span className="text-[9px] uppercase tracking-wide text-muted-2 font-mono border border-border rounded px-1">
                  {e.source}
                </span>
                <span className="text-[11px] text-muted-2 font-mono ml-auto shrink-0">
                  {timeAgo(e.seenDate)}
                </span>
              </div>
              <p className="text-sm leading-snug text-fg/90 group-hover:text-fg">
                {e.title}
              </p>
              {e.country && (
                <p className="text-[11px] text-muted-2 mt-1 font-mono">{e.country}</p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
