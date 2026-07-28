"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import TimeframePicker from "./TimeframePicker";
import Spinner from "@/components/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import type { TimeframeId } from "@/lib/markets/types";

const tooltipStyle = {
  background: "var(--panel-raised)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  color: "var(--fg)",
};

interface LatestState {
  rates: Record<string, number>;
  currencies: Record<string, string>;
  date: string | null;
  source: string | null;
  errors: string[];
}

export default function CurrencyView() {
  const [base, setBase] = useState("USD");
  const [target, setTarget] = useState("INR");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1m");
  const [search, setSearch] = useState("");

  const [latest, setLatest] = useState<LatestState | null>(null);
  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/markets/fx?base=${base}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setLatest(json);
      })
      .catch(() => {
        if (!cancelled)
          setLatest({
            rates: {},
            currencies: {},
            date: null,
            source: null,
            errors: ["Failed to load rates"],
          });
      });
    return () => {
      cancelled = true;
    };
  }, [base]);

  useEffect(() => {
    let cancelled = false;
    // Data-fetching effect: sets a loading flag before an async fetch, not
    // synchronously deriving state during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingHistory(true);
    fetch(`/api/markets/fx?base=${base}&target=${target}&timeframe=${timeframe}&history=1`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setHistory(json.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [base, target, timeframe]);

  const currencyCodes = Object.keys(latest?.currencies ?? {}).sort();
  const PRIORITY = ["INR", "USD"];
  const rateEntries = Object.entries(latest?.rates ?? {}).sort((a, b) => {
    const aP = PRIORITY.indexOf(a[0]);
    const bP = PRIORITY.indexOf(b[0]);
    if (aP !== -1 || bP !== -1) return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
    return a[0].localeCompare(b[0]);
  });

  const searchResults = search.trim()
    ? currencyCodes
        .filter(
          (c) =>
            c.toLowerCase().includes(search.toLowerCase()) ||
            latest?.currencies[c]?.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 8)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
            Base currency
          </label>
          <select
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="bg-panel-raised border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan"
          >
            {(currencyCodes.length ? currencyCodes : [base]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
            Search any currency
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Thai Baht, PHP..."
            className="w-full bg-panel-raised border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-cyan"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-panel-raised border border-border rounded-md overflow-hidden shadow-lg">
              {searchResults.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setTarget(c);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-panel flex items-center justify-between gap-2"
                >
                  <span>{c}</span>
                  <span className="text-xs text-muted-2 truncate">{latest?.currencies[c]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {latest?.date && (
          <p className="text-xs text-muted-2 font-mono">
            as of {latest.date}
            {latest.source && <span className="ml-1">· via {latest.source}</span>}
          </p>
        )}
      </div>

      <ErrorBanner errors={latest?.errors ?? []} className="-mt-2 rounded-md overflow-hidden" />

      <div className="flex gap-1 overflow-x-auto thin-scroll pb-1 -mx-1 px-1">
        {rateEntries.map(([code, rate]) => (
          <button
            key={code}
            onClick={() => setTarget(code)}
            className={`shrink-0 text-left rounded-md border px-3 py-2 transition-colors ${
              target === code ? "border-signal-cyan bg-signal-cyan/10" : "border-border hover:border-muted-2"
            }`}
          >
            <p className="text-[10px] font-mono text-muted-2 whitespace-nowrap">
              {base}/{code}
            </p>
            <p className="text-sm font-semibold whitespace-nowrap">{rate.toFixed(4)}</p>
          </button>
        ))}
        {rateEntries.length === 0 && <Spinner label="Loading rates…" size="sm" />}
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm font-medium">
            {base}/{target} history
          </p>
          <TimeframePicker value={timeframe} onChange={setTimeframe} />
        </div>
        <div className="h-56">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-2">
              No historical data available for this pair/timeframe
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--signal-cyan)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--signal-cyan)" stopOpacity={0} />
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
                  stroke="var(--signal-cyan)"
                  strokeWidth={2}
                  fill="url(#fxFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
