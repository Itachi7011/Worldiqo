import { NextRequest, NextResponse } from "next/server";
import { fetchCoinQuotes, fetchCoinHistory, COIN_UNIVERSE } from "@/lib/markets/crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = (searchParams.get("currency") ?? "usd").toLowerCase();
  const id = searchParams.get("id");
  const timeframe = searchParams.get("timeframe") ?? "1m";
  const wantHistory = searchParams.get("history") === "1";

  if (wantHistory) {
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const history = await fetchCoinHistory(id, currency, timeframe);
    return NextResponse.json(history, { headers: { "Cache-Control": "no-store" } });
  }

  const { quotes, error } = await fetchCoinQuotes(
    COIN_UNIVERSE.map((c) => c.id),
    currency
  );

  return NextResponse.json(
    { quotes, errors: error ? [error] : [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
