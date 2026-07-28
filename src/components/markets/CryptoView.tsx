"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import TimeframePicker from "./TimeframePicker";
import Spinner from "@/components/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { COIN_UNIVERSE } from "@/lib/markets/crypto";
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
  id: string;
  price: number;
  change24h: number | null;
}

export default function CryptoView() {
  const [selected, setSelected] = useState(COIN_UNIVERSE[0].id);
  const [timeframe, setTimeframe] = useState<TimeframeId>("1m");

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteErrors, setQuoteErrors] = useState<string[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/markets/crypto?currency=usd`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setQuotes(json.quotes ?? []);
          setQuoteErrors(json.errors ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setQuoteErrors(["Failed to load crypto prices"]);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuotes(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingHistory(true);
    fetch(`/api/markets/crypto?id=${selected}&currency=usd&timeframe=${timeframe}&history=1`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setHistory(json.points ?? []);
          setHistoryError(json.error ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryError("Failed to load history");
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, timeframe]);

  const selectedCoin = COIN_UNIVERSE.find((c) => c.id === selected);

  return (
    <div className="flex flex-col gap-4">
      <ErrorBanner errors={quoteErrors} className="-mx-1" />

      {loadingQuotes ? (
        <Spinner label="Loading prices…" size="sm" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {COIN_UNIVERSE.map((coin) => {
            const q = quotes.find((x) => x.id === coin.id);
            return (
              <button
                key={coin.id}
                onClick={() => setSelected(coin.id)}
                className={`bg-panel border rounded-lg p-3 text-left transition-colors ${
                  selected === coin.id ? "border-signal-purple" : "border-border hover:border-muted-2"
                }`}
              >
                <p className="text-xs font-mono text-muted-2">{coin.symbol}</p>
                <p className="font-display text-sm font-semibold mt-0.5 truncate">
                  {q ? `$${q.price.toLocaleString()}` : "—"}
                </p>
                {q?.change24h != null && (
                  <p
                    className={`text-[11px] font-mono mt-0.5 ${
                      q.change24h >= 0 ? "text-signal-green" : "text-signal-red"
                    }`}
                  >
                    {q.change24h >= 0 ? "+" : ""}
                    {q.change24h.toFixed(2)}%
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm font-medium">{selectedCoin?.name} (USD)</p>
          <TimeframePicker value={timeframe} onChange={setTimeframe} />
        </div>
        <div className="h-56">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : historyError ? (
            <div className="h-full flex items-center justify-center text-xs text-signal-amber text-center px-4">
              ⚠ {historyError}
            </div>
          ) : history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-2">
              No historical data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="cryptoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--signal-purple)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--signal-purple)" stopOpacity={0} />
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
                  width={55}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--signal-purple)"
                  strokeWidth={2}
                  fill="url(#cryptoFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
