const BASE = "https://api.coingecko.com/api/v3";
const TIMEOUT_MS = 8000;

export interface CoinRef {
  id: string;
  symbol: string;
  name: string;
}

// A focused set rather than CoinGecko's full 10,000+ coin list — keeps the
// UI meaningful and avoids leaning on the keyless tier's low rate limit
// (~10-30 req/min) for a giant search index.
export const COIN_UNIVERSE: CoinRef[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
];

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export interface CoinQuote {
  id: string;
  price: number;
  change24h: number | null;
}

export async function fetchCoinQuotes(
  ids: string[],
  vsCurrency: string
): Promise<{ quotes: CoinQuote[]; error: string | null }> {
  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: vsCurrency,
    include_24hr_change: "true",
  });
  try {
    const res = await fetchWithTimeout(`${BASE}/simple/price?${params.toString()}`);
    if (!res.ok) return { quotes: [], error: `CoinGecko returned ${res.status}` };
    const json = (await res.json()) as Record<string, Record<string, number>>;
    const quotes: CoinQuote[] = ids
      .filter((id) => json[id])
      .map((id) => ({
        id,
        price: json[id][vsCurrency.toLowerCase()],
        change24h: json[id][`${vsCurrency.toLowerCase()}_24h_change`] ?? null,
      }));
    return { quotes, error: null };
  } catch (err) {
    return {
      quotes: [],
      error: err instanceof Error ? err.message : "Unknown error fetching crypto prices",
    };
  }
}

const TIMEFRAME_DAYS: Record<string, number> = {
  "1w": 7,
  "1m": 30,
  "6m": 182,
  "1y": 365,
  "5y": 1825,
  max: 3650,
};

export async function fetchCoinHistory(
  id: string,
  vsCurrency: string,
  timeframe: string
): Promise<{ points: { date: string; value: number }[]; error: string | null }> {
  const days = TIMEFRAME_DAYS[timeframe] ?? 30;
  const params = new URLSearchParams({ vs_currency: vsCurrency, days: String(days) });
  try {
    const res = await fetchWithTimeout(`${BASE}/coins/${id}/market_chart?${params.toString()}`);
    if (!res.ok) return { points: [], error: `CoinGecko returned ${res.status}` };
    const json = (await res.json()) as { prices?: [number, number][] };
    const raw = json.prices ?? [];
    // Downsample to keep the chart light for long ranges.
    const maxPoints = 300;
    const step = Math.max(1, Math.ceil(raw.length / maxPoints));
    const points = raw
      .filter((_, i) => i % step === 0)
      .map(([ts, value]) => ({ date: new Date(ts).toISOString().slice(0, 10), value }));
    return { points, error: null };
  } catch (err) {
    return {
      points: [],
      error: err instanceof Error ? err.message : "Unknown error fetching crypto history",
    };
  }
}
