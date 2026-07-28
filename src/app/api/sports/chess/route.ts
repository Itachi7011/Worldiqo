import { NextRequest, NextResponse } from "next/server";
import { fetchChessLeaderboard } from "@/lib/sports/chess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "live_blitz";
  const result = await fetchChessLeaderboard(category);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
