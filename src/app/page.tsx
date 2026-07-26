"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FilterRail from "@/components/FilterRail";
import TopBar from "@/components/TopBar";
import EventFeed from "@/components/EventFeed";
import ChartsPanel from "@/components/ChartsPanel";
import MarketsPanel from "@/components/markets/MarketsPanel";
import type { CategoryId, EventsResponse, SourceId } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-muted text-sm">
      Loading map…
    </div>
  ),
});

const POLL_MS = 60_000; // GDELT refreshes its index roughly every 15 minutes; 60s keeps the UI feeling live without hammering a free public API.

export default function DashboardPage() {
  const [mode, setMode] = useState<"news" | "markets">("news");
  const [category, setCategory] = useState<CategoryId>("all");
  const [search, setSearch] = useState("");
  const [timespan, setTimespan] = useState("6h");
  const [source, setSource] = useState<"auto" | SourceId>("auto");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  // Debounce free-text search so we don't hit the API on every keystroke.
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
    if (mode !== "news") return;
    // Data-fetching effect: `load` sets state asynchronously (after awaiting
    // the network response), it does not set state synchronously during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, mode]);

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
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <FilterRail
          mode={mode}
          onModeChange={setMode}
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

        {mode === "markets" ? (
          <MarketsPanel />
        ) : (
          <main className="flex-1 min-h-0 flex flex-col">
            <div className="flex flex-1 min-h-0 flex-col xl:flex-row">
              <div className="flex-1 min-h-[320px] relative">
                <WorldMap points={data?.geo ?? []} showLegend={category === "all"} />
              </div>
              <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-l border-border bg-panel min-h-[320px]">
                <EventFeed events={data?.events ?? []} loading={loading} errors={data?.errors ?? []} />
              </div>
            </div>
            <ChartsPanel events={data?.events ?? []} category={category} timespan={timespan} />
          </main>
        )}
      </div>
    </div>
  );
}
