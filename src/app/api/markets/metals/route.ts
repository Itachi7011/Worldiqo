import { NextRequest, NextResponse } from "next/server";
import { fetchMetalQuote } from "@/lib/markets/metals";
import { fetchYahooHistory } from "@/lib/markets/yahoo";
import { fetchTwelveDataHistory, twelveDataAvailable } from "@/lib/markets/twelvedata";
import type { TimeframeId } from "@/lib/markets/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TIMEFRAMES = new Set(["1w", "1m", "6m", "1y", "5y", "max"]);
const VALID_SOURCES = new Set(["auto", "yahoo", "twelvedata"]);
const YAHOO_FUTURES: Record<"XAU" | "XAG", string> = { XAU: "GC=F", XAG: "SI=F" };
const TWELVEDATA_PAIR: Record<"XAU" | "XAG", string> = { XAU: "XAU/USD", XAG: "XAG/USD" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = (searchParams.get("currency") ?? "USD").toUpperCase();
  const timeframeParam = searchParams.get("timeframe") ?? "1m";
  const timeframe = (VALID_TIMEFRAMES.has(timeframeParam) ? timeframeParam : "1m") as TimeframeId;
  const symbolParam = searchParams.get("symbol");
  const wantHistory = searchParams.get("history") === "1";
  const sourceParam = searchParams.get("source") ?? "auto";
  const sourceMode = VALID_SOURCES.has(sourceParam) ? sourceParam : "auto";

  if (wantHistory) {
    const symbol = symbolParam === "XAG" ? "XAG" : "XAU";
    const errors: string[] = [];
    const tryYahoo = sourceMode === "auto" || sourceMode === "yahoo";
    const tryTwelveData = sourceMode === "auto" || sourceMode === "twelvedata";

    if (tryYahoo) {
      const yahoo = await fetchYahooHistory(YAHOO_FUTURES[symbol], timeframe);
      if (yahoo.points.length > 0) {
        return NextResponse.json(
          { symbol, points: yahoo.points, source: "yahoo-futures", errors },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      if (yahoo.error) errors.push(`Yahoo Finance: ${yahoo.error}`);
    }
    if (tryTwelveData && twelveDataAvailable) {
      const td = await fetchTwelveDataHistory(TWELVEDATA_PAIR[symbol], timeframe);
      if (td.points.length > 0) {
        return NextResponse.json(
          { symbol, points: td.points, source: "twelvedata", errors },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      if (td.error) errors.push(`Twelve Data: ${td.error}`);
    }

    return NextResponse.json(
      { symbol, points: [], source: null, errors },
      { headers: { "Cache-Control": "no-store" } }
    );
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
