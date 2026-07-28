import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuote, fetchYahooHistory } from "@/lib/markets/yahoo";
import { fetchTwelveDataQuote, fetchTwelveDataHistory, twelveDataAvailable } from "@/lib/markets/twelvedata";
import type { TimeframeId } from "@/lib/markets/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TIMEFRAMES = new Set(["1w", "1m", "6m", "1y", "5y", "max"]);
const VALID_SOURCES = new Set(["auto", "yahoo", "twelvedata"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yahooTicker = searchParams.get("yahoo");
  const timeframeParam = searchParams.get("timeframe") ?? "1y";
  const timeframe = (VALID_TIMEFRAMES.has(timeframeParam) ? timeframeParam : "1y") as TimeframeId;
  const wantHistory = searchParams.get("history") === "1";
  const sourceParam = searchParams.get("source") ?? "auto";
  const sourceMode = VALID_SOURCES.has(sourceParam) ? sourceParam : "auto";

  if (!yahooTicker) {
    return NextResponse.json({ error: "yahoo ticker is required" }, { status: 400 });
  }

  const errors: string[] = [];
  const tryYahoo = sourceMode === "auto" || sourceMode === "yahoo";
  const tryTwelveData = sourceMode === "auto" || sourceMode === "twelvedata";

  if (wantHistory) {
    if (tryYahoo) {
      const yahoo = await fetchYahooHistory(yahooTicker, timeframe);
      if (yahoo.points.length > 0) {
        return NextResponse.json(
          { points: yahoo.points, source: "yahoo", errors },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      if (yahoo.error) errors.push(`Yahoo Finance: ${yahoo.error}`);
    }
    if (tryTwelveData && twelveDataAvailable) {
      const td = await fetchTwelveDataHistory(yahooTicker, timeframe);
      if (td.points.length > 0) {
        return NextResponse.json(
          { points: td.points, source: "twelvedata", errors },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      if (td.error) errors.push(`Twelve Data: ${td.error}`);
    }
    return NextResponse.json(
      { points: [], source: null, errors },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (tryYahoo) {
    const yahoo = await fetchYahooQuote(yahooTicker);
    if (yahoo.price != null) {
      return NextResponse.json(
        { quote: { ticker: yahooTicker, close: yahoo.price, date: "", time: "" }, source: "yahoo", errors },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    if (yahoo.error) errors.push(`Yahoo Finance: ${yahoo.error}`);
  }
  if (tryTwelveData && twelveDataAvailable) {
    const td = await fetchTwelveDataQuote(yahooTicker);
    if (td.price != null) {
      return NextResponse.json(
        { quote: { ticker: yahooTicker, close: td.price, date: "", time: "" }, source: "twelvedata", errors },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    if (td.error) errors.push(`Twelve Data: ${td.error}`);
  }

  return NextResponse.json(
    { quote: null, source: null, errors },
    { headers: { "Cache-Control": "no-store" } }
  );
}
