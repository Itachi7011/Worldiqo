import { NextRequest, NextResponse } from "next/server";
import { fetchMetalQuote, fetchMetalHistory } from "@/lib/markets/metals";
import type { TimeframeId } from "@/lib/markets/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TIMEFRAMES = new Set(["1w", "1m", "6m", "1y", "5y", "max"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = (searchParams.get("currency") ?? "USD").toUpperCase();
  const timeframeParam = searchParams.get("timeframe") ?? "1m";
  const timeframe = (VALID_TIMEFRAMES.has(timeframeParam) ? timeframeParam : "1m") as TimeframeId;
  const symbolParam = searchParams.get("symbol");
  const wantHistory = searchParams.get("history") === "1";

  if (wantHistory) {
    const symbol = symbolParam === "XAG" ? "XAG" : "XAU";
    const history = await fetchMetalHistory(symbol, timeframe);
    return NextResponse.json(history, { headers: { "Cache-Control": "no-store" } });
  }

  const [gold, silver] = await Promise.all([
    fetchMetalQuote("XAU", currency),
    fetchMetalQuote("XAG", currency),
  ]);

  return NextResponse.json(
    {
      quotes: [gold.quote, silver.quote].filter(Boolean),
      errors: [gold.error, silver.error].filter(Boolean),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
