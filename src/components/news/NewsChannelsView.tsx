"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import { NEWS_CHANNELS } from "@/lib/newsChannels";

interface Headline {
  title: string;
  url: string;
  seenDate: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsChannelsView() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(NEWS_CHANNELS[0].id);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selected = NEWS_CHANNELS.find((c) => c.id === selectedId) ?? NEWS_CHANNELS[0];

  const filteredChannels = NEWS_CHANNELS.filter(
    (c) =>
      !search.trim() ||
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.outlet.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/news-channels?id=${selectedId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setHeadlines(json.headlines ?? []);
          setError(json.error ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load this channel");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="md:w-64 shrink-0 flex flex-col gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search country or outlet..."
          className="w-full bg-panel-raised border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-cyan"
        />
        <div className="flex flex-col gap-1 max-h-80 md:max-h-[420px] overflow-y-auto thin-scroll">
          {filteredChannels.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedId === c.id
                  ? "bg-signal-cyan/15 text-signal-cyan"
                  : "text-muted hover:text-fg hover:bg-panel-raised/60"
              }`}
            >
              <span className="block">{c.country}</span>
              <span className="block text-[11px] text-muted-2 font-mono">{c.outlet}</span>
            </button>
          ))}
          {filteredChannels.length === 0 && (
            <p className="text-xs text-muted-2 px-3 py-2">No matching country/outlet</p>
          )}
        </div>
      </div>

      <div className="flex-1 bg-panel border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium">{selected.country}</p>
          <p className="text-xs text-muted-2 font-mono">{selected.outlet}</p>
        </div>
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto thin-scroll">
          {loading && (
            <div className="p-4">
              <Spinner label="Loading headlines…" size="sm" />
            </div>
          )}
          {!loading && error && (
            <div className="p-4">
              <p className="text-xs text-signal-amber">⚠ {error}</p>
              <p className="text-xs text-muted-2 mt-1">
                This outlet&apos;s feed may be temporarily unavailable — try another country.
              </p>
            </div>
          )}
          {!loading && !error && headlines.length === 0 && (
            <p className="p-4 text-sm text-muted">No headlines returned right now.</p>
          )}
          {headlines.map((h) => (
            <a
              key={h.url}
              href={h.url}
              target="_blank"
              rel="noreferrer"
              className="block p-3.5 hover:bg-panel-raised/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] text-muted-2 font-mono">{timeAgo(h.seenDate)}</span>
              </div>
              <p className="text-sm leading-snug text-fg/90">{h.title}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
