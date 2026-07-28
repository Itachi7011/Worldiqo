"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import TimeframePicker from "./TimeframePicker";
import Spinner from "@/components/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import type { TimeframeId } from "@/lib/markets/types";

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY",
  "HKD", "SGD", "SEK", "NOK", "DKK", "NZD", "MXN", "INR", "BRL", "ZAR", "KRW",
];

const tooltipStyle = {
  background: "var(--panel-raised)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  color: "var(--fg)",
};

interface Quote {
  symbol: "XAU" | "XAG";
  name: string;
  currency: string;
  currencySymbol: string;
  price: number;
  updatedAt: string;
}

export default function MetalsView() {
  const [currency, setCurrency] = useState("USD");
  const [metal, setMetal] = useState<"XAU" | "XAG">("XAU");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1y");

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteErrors, setQuoteErrors] = useState<string[]>([]);
  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [historySource, setHistorySource] = useState<string | null>(null);
  const [historyErrors, setHistoryErrors] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/markets/metals?currency=${currency}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setQuotes(json.quotes ?? []);
          setQuoteErrors(json.errors ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setQuoteErrors(["Failed to load live metal prices"]);
      });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  useEffect(() => {
    let cancelled = false;
    // Data-fetching effect: sets a loading flag before an async fetch, not
    // synchronously deriving state during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingHistory(true);
    fetch(`/api/markets/metals?symbol=${metal}&timeframe=${timeframe}&history=1`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setHistory(json.points ?? []);
          setHistorySource(json.source ?? null);
          setHistoryErrors(json.errors ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryErrors(["Failed to load historical data"]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metal, timeframe]);

  const gold = quotes.find((q) => q.symbol === "XAU");
  const silver = quotes.find((q) => q.symbol === "XAG");
  const ratio = gold && silver && silver.price > 0 ? gold.price / silver.price : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
          Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-panel-raised border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner errors={quoteErrors} className="-mx-1" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["XAU", "XAG"] as const).map((sym) => {
          const q = quotes.find((x) => x.symbol === sym);
          return (
            <button
              key={sym}
              onClick={() => setMetal(sym)}
              className={`bg-panel border rounded-lg p-4 text-left transition-colors ${
                metal === sym ? "border-signal-amber" : "border-border hover:border-muted-2"
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-muted">
                {sym === "XAU" ? "Gold" : "Silver"} · per oz
              </p>
              <p className="font-display text-2xl font-semibold mt-1">
                {q ? `${q.currencySymbol}${q.price.toFixed(2)}` : "—"}
              </p>
              <p className="text-[11px] text-muted-2 mt-1">{q?.currency ?? currency}</p>
            </button>
          );
        })}
        <div className="bg-panel border border-border rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Gold/Silver ratio</p>
          <p className="font-display text-2xl font-semibold mt-1">
            {ratio ? ratio.toFixed(1) : "—"}
          </p>
          <p className="text-[11px] text-muted-2 mt-1">oz silver per oz gold</p>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <ErrorBanner errors={historyErrors} />
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm font-medium">
              {metal === "XAU" ? "Gold" : "Silver"} history (USD)
              {historySource && (
                <span className="text-xs text-muted-2 font-normal ml-1.5">
                  · via {historySource === "yahoo-futures" ? "Yahoo Finance (futures)" : historySource}
                </span>
              )}
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
                    <linearGradient id="metalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--signal-amber)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--signal-amber)" stopOpacity={0} />
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
                    stroke="var(--signal-amber)"
                    strokeWidth={2}
                    fill="url(#metalFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-[11px] text-muted-2 mt-2">
            History is sourced separately from live prices and always shown in USD.
          </p>
        </div>
      </div>
    </div>
  );
}
