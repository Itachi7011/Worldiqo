import type { MetalQuote } from "./types";

const GOLD_API_BASE = "https://api.gold-api.com";
const TIMEOUT_MS = 8000;

const METAL_NAMES: Record<"XAU" | "XAG", string> = { XAU: "Gold", XAG: "Silver" };

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live spot price — gold-api.com is free and keyless for this endpoint
 * (no auth, no rate limit per their docs), and supports currency conversion
 * server-side across ~19 major currencies. (Historical data used to come
 * from Stooq here, but Stooq now blocks automated/server-side requests
 * with a CAPTCHA page — removed. See yahoo.ts and twelvedata.ts for the
 * history sources used instead.)
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
