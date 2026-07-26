export type TimeframeId = "1w" | "1m" | "6m" | "1y" | "5y" | "max";

export const TIMEFRAMES: { id: TimeframeId; label: string; days: number | null }[] = [
  { id: "1w", label: "1W", days: 7 },
  { id: "1m", label: "1M", days: 30 },
  { id: "6m", label: "6M", days: 182 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "5y", label: "5Y", days: 365 * 5 },
  { id: "max", label: "Max", days: null },
];

export interface SeriesPoint {
  date: string; // ISO date (YYYY-MM-DD)
  value: number;
}

export interface FxLatestResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface FxHistoryResponse {
  base: string;
  target: string;
  points: SeriesPoint[];
  error: string | null;
}

export interface MetalQuote {
  symbol: "XAU" | "XAG";
  name: string;
  currency: string;
  currencySymbol: string;
  price: number;
  updatedAt: string;
}

export interface MetalHistoryResponse {
  symbol: "XAU" | "XAG";
  points: SeriesPoint[];
  error: string | null;
}
