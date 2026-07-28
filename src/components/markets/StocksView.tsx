"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import TimeframePicker from "./TimeframePicker";
import Spinner from "@/components/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { STOCK_UNIVERSE, type StockRef } from "@/lib/markets/stockUniverse";
import type { TimeframeId } from "@/lib/markets/types";

const tooltipStyle = {
  background: "var(--panel-raised)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  color: "var(--fg)",
};

interface Quote {
  ticker: string;
  close: number;
}

type SourceMode = "auto" | "yahoo" | "twelvedata";

export default function StocksView() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StockRef>(STOCK_UNIVERSE[0]);
  const [timeframe, setTimeframe] = useState<TimeframeId>("1y");
  const [sourceMode, setSourceMode] = useState<SourceMode>("auto");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteSource, setQuoteSource] = useState<string | null>(null);
  const [quoteErrors, setQuoteErrors] = useState<string[]>([]);
  const [loadingQuote, setLoadingQuote] = useState(true);

  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [historySource, setHistorySource] = useState<string | null>(null);
  const [historyErrors, setHistoryErrors] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return STOCK_UNIVERSE.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.yahooTicker.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingQuote(true);
    fetch(`/api/markets/stocks?yahoo=${encodeURIComponent(selected.yahooTicker)}&source=${sourceMode}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setQuote(json.quote ?? null);
          setQuoteSource(json.source ?? null);
          setQuoteErrors(json.errors ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setQuoteErrors(["Failed to load quote"]);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, sourceMode]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingHistory(true);
    fetch(
      `/api/markets/stocks?yahoo=${encodeURIComponent(
        selected.yahooTicker
      )}&timeframe=${timeframe}&history=1&source=${sourceMode}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setHistory(json.points ?? []);
          setHistorySource(json.source ?? null);
          setHistoryErrors(json.errors ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryErrors(["Failed to load history"]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, timeframe, sourceMode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
            Search shares — {STOCK_UNIVERSE.length} companies across 35 countries
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Toyota, Samsung, India, TSMC..."
            className="w-full bg-panel-raised border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-cyan"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-panel-raised border border-border rounded-md overflow-hidden shadow-lg">
              {searchResults.map((s) => (
                <button
                  key={s.yahooTicker}
                  onClick={() => {
                    setSelected(s);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-panel flex items-center justify-between gap-2"
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-2 font-mono">{s.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
            Source
          </label>
          <div className="flex gap-1">
            {(["auto", "yahoo", "twelvedata"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSourceMode(s)}
                className={`px-2 py-1.5 rounded text-xs font-mono border transition-colors uppercase ${
                  sourceMode === s
                    ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                    : "border-border text-muted hover:text-fg hover:border-muted-2"
                }`}
              >
                {s === "twelvedata" ? "Twelve Data" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top companies as tabs — India and US first, per priority */}
      <div className="flex gap-1 overflow-x-auto thin-scroll pb-1 -mx-1 px-1">
        {STOCK_UNIVERSE.map((s) => (
          <button
            key={s.yahooTicker}
            onClick={() => setSelected(s)}
            className={`shrink-0 px-2.5 py-1.5 rounded-md text-xs font-mono border whitespace-nowrap transition-colors ${
              selected.yahooTicker === s.yahooTicker
                ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                : "border-border text-muted hover:text-fg hover:border-muted-2"
            }`}
            title={`${s.name} · ${s.country}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <ErrorBanner errors={[...quoteErrors, ...historyErrors]} />
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div>
              <p className="font-display text-lg font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-2 font-mono">
                {selected.yahooTicker} · {selected.country}
              </p>
            </div>
            {loadingQuote ? (
              <Spinner size="sm" />
            ) : quote ? (
              <div className="text-right">
                <p className="font-display text-xl font-semibold">{quote.close.toFixed(2)}</p>
                {quoteSource && (
                  <p className="text-[11px] text-muted-2 font-mono">via {quoteSource}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-2">No quote available</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-4 mb-3">
            <p className="text-xs uppercase tracking-wider text-muted">
              Price history {historySource && <span className="normal-case">· via {historySource}</span>}
            </p>
            <TimeframePicker value={timeframe} onChange={setTimeframe} />
          </div>
          <div className="h-56">
            {loadingHistory ? (
              <div className="h-full flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-2 text-center px-4">
                No historical data available from either source for this timeframe
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--signal-green)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--signal-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-2)"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={50}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="var(--muted-2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--signal-green)"
                    strokeWidth={2}
                    fill="url(#stockFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
