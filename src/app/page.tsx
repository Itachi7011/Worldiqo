"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FilterRail from "@/components/FilterRail";
import TopBar from "@/components/TopBar";
import EventFeed from "@/components/EventFeed";
import ChartsPanel from "@/components/ChartsPanel";
import Spinner from "@/components/Spinner";
import MetalsView from "@/components/markets/MetalsView";
import CurrencyView from "@/components/markets/CurrencyView";
import StocksView from "@/components/markets/StocksView";
import CryptoView from "@/components/markets/CryptoView";
import NewsHubView from "@/components/news/NewsHubView";
import SportsHubView from "@/components/sports/SportsHubView";
import type { CategoryId, EventsResponse, SourceId } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <Spinner label="Loading map…" />
    </div>
  ),
});

const POLL_MS = 60_000; // GDELT refreshes its index roughly every 15 minutes; 60s keeps the UI feeling live without hammering a free public API.

type Tab = "map" | "markets" | "channels" | "sports";

const TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "Live Map" },
  { id: "markets", label: "Markets" },
  { id: "channels", label: "News Channels" },
  { id: "sports", label: "Sports" },
];

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("map");

  const [category, setCategory] = useState<CategoryId>("all");
  const [search, setSearch] = useState("");
  const [timespan, setTimespan] = useState("6h");
  const [source, setSource] = useState<"auto" | SourceId>("auto");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, timespan, source });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const res = await fetch(`/api/events?${params.toString()}`, {
        signal: controller.signal,
      });
      const eventsJson: EventsResponse = await res.json();
      setData(eventsJson);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Failed to load Worldiqo data", err);
      }
    } finally {
      setLoading(false);
    }
  }, [category, timespan, source, debouncedSearch]);

  useEffect(() => {
    if (tab !== "map") return;
    // Data-fetching effect: `load` sets state asynchronously (after awaiting
    // the network response), it does not set state synchronously during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, tab]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        eventCount={data?.events.length ?? 0}
        geoCount={data?.geo.length ?? 0}
        category={category}
        fetchedAt={data?.fetchedAt ?? null}
        errors={data?.errors ?? []}
        sourcesUsed={data?.sourcesUsed ?? []}
      />

      <nav className="flex gap-1 px-4 py-2 border-b border-border bg-panel shrink-0 overflow-x-auto thin-scroll">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-signal-cyan/15 text-signal-cyan"
                : "text-muted hover:text-fg hover:bg-panel-raised/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {tab === "map" && (
          <FilterRail
            category={category}
            onCategoryChange={setCategory}
            search={search}
            onSearchChange={setSearch}
            timespan={timespan}
            onTimespanChange={setTimespan}
            source={source}
            onSourceChange={setSource}
            eventCount={data?.events.length ?? 0}
          />
        )}

        {tab === "map" && (
          <main className="flex-1 min-h-0 overflow-y-auto thin-scroll flex flex-col">
            <div className="flex flex-col xl:flex-row h-[560px] shrink-0 border-b border-border">
              <div className="flex-1 min-h-[280px] relative">
                <WorldMap
                  points={data?.geo ?? []}
                  showLegend={category === "all"}
                  loading={loading}
                />
              </div>
              <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-l border-border bg-panel min-h-[280px]">
                <EventFeed events={data?.events ?? []} loading={loading} errors={data?.errors ?? []} />
              </div>
            </div>
            <ChartsPanel events={data?.events ?? []} category={category} timespan={timespan} />
          </main>
        )}

        {tab === "markets" && (
          <main className="flex-1 min-h-0 overflow-y-auto thin-scroll p-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
              <div>
                <SectionHeading title="Gold & Silver" subtitle="Live spot price + historical chart" />
                <MetalsView />
              </div>
              <div>
                <SectionHeading title="Currencies" subtitle="Live exchange rates, ECB-sourced" />
                <CurrencyView />
              </div>
              <div>
                <SectionHeading title="Shares" subtitle="Search major companies across 22 countries" />
                <StocksView />
              </div>
              <div>
                <SectionHeading title="Crypto" subtitle="Live prices + historical chart" />
                <CryptoView />
              </div>
            </div>
          </main>
        )}

        {tab === "channels" && (
          <main className="flex-1 min-h-0 overflow-y-auto thin-scroll p-6">
            <div className="max-w-5xl mx-auto">
              <SectionHeading
                title="News Channels"
                subtitle="Browse live headlines by country, straight from each outlet's own feed"
              />
              <NewsHubView />
            </div>
          </main>
        )}

        {tab === "sports" && (
          <main className="flex-1 min-h-0 overflow-y-auto thin-scroll p-6">
            <div className="max-w-5xl mx-auto">
              <SectionHeading
                title="Sports"
                subtitle="Recent results and standings across major world leagues"
              />
              <SportsHubView />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
