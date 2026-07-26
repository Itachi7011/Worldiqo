import type { FxHistoryResponse, SeriesPoint, TimeframeId } from "./types";
import { TIMEFRAMES } from "./types";

const BASE = "https://api.frankfurter.dev/v1";
const TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return { data: null, error: `Frankfurter API returned ${res.status}` };
    return { data: (await res.json()) as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error fetching FX data",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCurrencies(): Promise<{
  currencies: Record<string, string>;
  error: string | null;
}> {
  const { data, error } = await fetchJson<Record<string, string>>(`${BASE}/currencies`);
  return { currencies: data ?? {}, error };
}

export async function fetchLatestRates(
  base: string,
  symbols: string[]
): Promise<{ rates: Record<string, number>; date: string | null; error: string | null }> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") });
  const { data, error } = await fetchJson<{ rates: Record<string, number>; date: string }>(
    `${BASE}/latest?${params.toString()}`
  );
  return { rates: data?.rates ?? {}, date: data?.date ?? null, error };
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Keep chart payloads reasonable — daily data over 5 years is ~1300 points,
// which is more than a line chart needs to look right.
const MAX_POINTS = 300;

function downsample(points: SeriesPoint[], maxPoints = MAX_POINTS): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

export async function fetchFxHistory(
  base: string,
  target: string,
  timeframe: TimeframeId
): Promise<FxHistoryResponse> {
  const days = TIMEFRAMES.find((t) => t.id === timeframe)?.days;
  // Frankfurter's earliest ECB data is 1999-01-04; "max" just requests from there.
  const start = days ? daysAgo(days) : "1999-01-04";
  const end = new Date().toISOString().slice(0, 10);

  const params = new URLSearchParams({ base, symbols: target });
  const { data, error } = await fetchJson<{ rates: Record<string, Record<string, number>> }>(
    `${BASE}/${start}..${end}?${params.toString()}`
  );

  if (error || !data) {
    return { base, target, points: [], error: error ?? "No data returned" };
  }

  const points: SeriesPoint[] = Object.entries(data.rates)
    .map(([date, rateForDate]) => ({ date, value: rateForDate[target] }))
    .filter((p) => typeof p.value === "number")
    .sort((a, b) => a.date.localeCompare(b.date));

  return { base, target, points: downsample(points), error: null };
}
