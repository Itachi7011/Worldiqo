import type { SeriesPoint, TimeframeId } from "./types";

const TIMEOUT_MS = 8000;

// Yahoo's v8 chart endpoint isn't an officially published API, but it's
// the same JSON backend Yahoo Finance's own website uses, and remains
// widely used as a free fallback. Requires a browser-like User-Agent or
// requests get blocked.
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

const RANGE_FOR_TIMEFRAME: Record<TimeframeId, string> = {
  "1w": "5d",
  "1m": "1mo",
  "6m": "6mo",
  "1y": "1y",
  "5y": "5y",
  max: "max",
};

interface ChartResult {
  meta: { regularMarketPrice?: number; currency?: string };
  timestamp?: number[];
  indicators: { quote: [{ close?: (number | null)[] }] };
}

async function fetchChart(
  ticker: string,
  range: string
): Promise<{ result: ChartResult | null; error: string | null }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=${range}&interval=1d`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { result: null, error: `Yahoo Finance returned ${res.status}` };
    const json = await res.json();
    const result = json?.chart?.result?.[0] as ChartResult | undefined;
    if (!result) {
      const errDesc = json?.chart?.error?.description;
      return { result: null, error: errDesc ?? `No data for symbol "${ticker}"` };
    }
    return { result, error: null };
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : "Unknown error fetching from Yahoo Finance",
    };
  }
}

export async function fetchYahooQuote(
  ticker: string
): Promise<{ price: number | null; currency: string | null; error: string | null }> {
  const { result, error } = await fetchChart(ticker, "5d");
  if (error || !result) return { price: null, currency: null, error };
  const price = result.meta.regularMarketPrice ?? null;
  if (price == null) return { price: null, currency: null, error: `No price for "${ticker}"` };
  return { price, currency: result.meta.currency ?? null, error: null };
}

const MAX_POINTS = 300;
function downsample(points: SeriesPoint[], maxPoints = MAX_POINTS): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

export async function fetchYahooHistory(
  ticker: string,
  timeframe: TimeframeId
): Promise<{ points: SeriesPoint[]; error: string | null }> {
  const range = RANGE_FOR_TIMEFRAME[timeframe] ?? "1y";
  const { result, error } = await fetchChart(ticker, range);
  if (error || !result) return { points: [], error };

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators.quote[0]?.close ?? [];
  const points: SeriesPoint[] = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), value: closes[i] }))
    .filter((p): p is SeriesPoint => typeof p.value === "number");

  return { points: downsample(points), error: null };
}
