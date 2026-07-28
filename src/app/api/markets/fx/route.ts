import { NextRequest, NextResponse } from "next/server";
import { fetchCurrencies, fetchLatestRates, fetchFxHistory } from "@/lib/markets/fx";
import type { TimeframeId } from "@/lib/markets/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_COMPARE = [
  "INR", "USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "CHF", "SGD",
  "AED", "SAR", "BRL", "ZAR", "KRW", "MXN", "NZD", "SEK", "NOK", "HKD",
];
const VALID_TIMEFRAMES = new Set(["1w", "1m", "6m", "1y", "5y", "max"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const base = (searchParams.get("base") ?? "USD").toUpperCase();
  const target = searchParams.get("target")?.toUpperCase() ?? null;
  const timeframeParam = searchParams.get("timeframe") ?? "1m";
  const timeframe = (VALID_TIMEFRAMES.has(timeframeParam) ? timeframeParam : "1m") as TimeframeId;
  const wantHistory = searchParams.get("history") === "1";

  if (wantHistory) {
    if (!target) {
      return NextResponse.json({ error: "target is required for history" }, { status: 400 });
    }
    const history = await fetchFxHistory(base, target, timeframe);
    return NextResponse.json(history, { headers: { "Cache-Control": "no-store" } });
  }

  const compareSymbols = DEFAULT_COMPARE.filter((c) => c !== base);
  const [currenciesResult, latestResult] = await Promise.all([
    fetchCurrencies(),
    fetchLatestRates(base, compareSymbols),
  ]);

  return NextResponse.json(
    {
      base,
      date: latestResult.date,
      rates: latestResult.rates,
      source: latestResult.source,
      currencies: currenciesResult.currencies,
      errors: [currenciesResult.error, latestResult.error].filter(Boolean),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
