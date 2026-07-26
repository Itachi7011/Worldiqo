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
  errors: string[];
}

export default function CurrencyView() {
  const [base, setBase] = useState("USD");
  const [target, setTarget] = useState("EUR");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1m");

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
        if (!cancelled) setLatest({ rates: {}, currencies: {}, date: null, errors: ["Failed to load rates"] });
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
  const rateEntries = Object.entries(latest?.rates ?? {}).sort((a, b) => a[0].localeCompare(b[0]));

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
        {latest?.date && (
          <p className="text-xs text-muted-2 font-mono">as of {latest.date}</p>
        )}
        {latest?.errors && latest.errors.length > 0 && (
          <p className="text-xs text-signal-amber">⚠ {latest.errors.join(" · ")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {rateEntries.map(([code, rate]) => (
          <button
            key={code}
            onClick={() => setTarget(code)}
            className={`bg-panel border rounded-lg p-3 text-left transition-colors ${
              target === code ? "border-signal-cyan" : "border-border hover:border-muted-2"
            }`}
          >
            <p className="text-xs font-mono text-muted-2">
              {base}/{code}
            </p>
            <p className="font-display text-lg font-semibold mt-0.5">{rate.toFixed(4)}</p>
            <p className="text-[11px] text-muted-2 truncate">{latest?.currencies[code]}</p>
          </button>
        ))}
        {rateEntries.length === 0 && (
          <p className="text-sm text-muted col-span-full">Loading rates…</p>
        )}
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
            <div className="h-full flex items-center justify-center text-xs text-muted-2">
              Loading…
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
