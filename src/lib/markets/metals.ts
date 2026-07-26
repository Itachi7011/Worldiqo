import type { MetalHistoryResponse, MetalQuote, SeriesPoint, TimeframeId } from "./types";
import { TIMEFRAMES } from "./types";

const GOLD_API_BASE = "https://api.gold-api.com";
const TIMEOUT_MS = 8000;

const METAL_NAMES: Record<"XAU" | "XAG", string> = { XAU: "Gold", XAG: "Silver" };

async function fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store", headers });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live spot price — gold-api.com is free and keyless for this endpoint
 * (no auth, no rate limit per their docs), and supports currency conversion
 * server-side across ~19 major currencies.
 */
export async function fetchMetalQuote(
  symbol: "XAU" | "XAG",
  currency: string
): Promise<{ quote: MetalQuote | null; error: string | null }> {
  try {
    const res = await fetchWithTimeout(`${GOLD_API_BASE}/price/${symbol}/${currency}`);
    if (!res.ok) return { quote: null, error: `gold-api.com returned ${res.status}` };
    const json = await res.json();
    return {
      quote: {
        symbol,
        name: METAL_NAMES[symbol],
        currency: json.currency ?? currency,
        currencySymbol: json.currencySymbol ?? "",
        price: json.price,
        updatedAt: json.updatedAt ?? new Date().toISOString(),
      },
      error: null,
    };
  } catch (err) {
    return {
      quote: null,
      error: err instanceof Error ? err.message : "Unknown error fetching metal price",
    };
  }
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const MAX_POINTS = 300;
function downsample(points: SeriesPoint[], maxPoints = MAX_POINTS): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

/**
 * Historical daily closes, in USD, via Stooq's public CSV export — there's
 * no official Stooq API, but this CSV endpoint is the same one widely used
 * by tools like pandas-datareader and is free and keyless. Best-effort: if
 * Stooq is unavailable, this fails gracefully and the caller still has the
 * live spot price from gold-api.com.
 */
export async function fetchMetalHistory(
  symbol: "XAU" | "XAG",
  timeframe: TimeframeId
): Promise<MetalHistoryResponse> {
  const ticker = symbol === "XAU" ? "xauusd" : "xagusd";
  const days = TIMEFRAMES.find((t) => t.id === timeframe)?.days;
  const end = new Date();
  const start = days ? new Date(end.getTime() - days * 86_400_000) : new Date("2000-01-01");

  const params = new URLSearchParams({ s: ticker, i: "d", d1: ymd(start), d2: ymd(end) });
  const url = `https://stooq.com/q/d/l/?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url, {
      "User-Agent": "Mozilla/5.0 (compatible; Worldiqo/1.0)",
    });
    if (!res.ok) return { symbol, points: [], error: `Stooq returned ${res.status}` };
    const csv = await res.text();

    if (!csv.trim() || csv.trim().startsWith("<") || /exceeded/i.test(csv)) {
      return { symbol, points: [], error: "Stooq did not return usable CSV data" };
    }

    const lines = csv.trim().split("\n");
    const header = lines[0].split(",");
    const dateIdx = header.indexOf("Date");
    const closeIdx = header.indexOf("Close");
    if (dateIdx === -1 || closeIdx === -1) {
      return { symbol, points: [], error: "Unexpected CSV format from Stooq" };
    }

    const points: SeriesPoint[] = lines
      .slice(1)
      .map((line) => line.split(","))
      .filter((cols) => cols.length > closeIdx && cols[dateIdx] && cols[closeIdx])
      .map((cols) => ({ date: cols[dateIdx], value: parseFloat(cols[closeIdx]) }))
      .filter((p) => !Number.isNaN(p.value));

    return { symbol, points: downsample(points), error: null };
  } catch (err) {
    return {
      symbol,
      points: [],
      error: err instanceof Error ? err.message : "Unknown error fetching metal history",
    };
  }
}
