import type { SeriesPoint, TimeframeId } from "./types";

const TIMEOUT_MS = 8000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

export const twelveDataAvailable = Boolean(API_KEY);

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

const OUTPUTSIZE_FOR_TIMEFRAME: Record<TimeframeId, number> = {
  "1w": 7,
  "1m": 30,
  "6m": 182,
  "1y": 365,
  "5y": 1825,
  max: 5000,
};

export async function fetchTwelveDataQuote(
  symbol: string
): Promise<{ price: number | null; error: string | null }> {
  if (!API_KEY) return { price: null, error: "Twelve Data not configured" };
  try {
    const res = await fetchWithTimeout(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`
    );
    const json = await res.json();
    if (json.price) return { price: parseFloat(json.price), error: null };
    return { price: null, error: json.message ?? `No price for "${symbol}"` };
  } catch (err) {
    return {
      price: null,
      error: err instanceof Error ? err.message : "Unknown error fetching from Twelve Data",
    };
  }
}

export async function fetchTwelveDataHistory(
  symbol: string,
  timeframe: TimeframeId
): Promise<{ points: SeriesPoint[]; error: string | null }> {
  if (!API_KEY) return { points: [], error: "Twelve Data not configured" };
  const outputsize = OUTPUTSIZE_FOR_TIMEFRAME[timeframe] ?? 30;
  try {
    const res = await fetchWithTimeout(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
        symbol
      )}&interval=1day&outputsize=${outputsize}&apikey=${API_KEY}`
    );
    const json = await res.json();
    const values = json.values as { datetime: string; close: string }[] | undefined;
    if (!values) return { points: [], error: json.message ?? `No history for "${symbol}"` };
    const points: SeriesPoint[] = values
      .map((v) => ({ date: v.datetime, value: parseFloat(v.close) }))
      .filter((p) => !Number.isNaN(p.value))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { points, error: null };
  } catch (err) {
    return {
      points: [],
      error: err instanceof Error ? err.message : "Unknown error fetching from Twelve Data",
    };
  }
}
