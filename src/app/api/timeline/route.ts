import { NextRequest, NextResponse } from "next/server";
import { fetchTimeline } from "@/lib/gdelt";
import type { CategoryId, TimelineResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") ?? "all") as CategoryId;
  const search = searchParams.get("q");
  const timespan = searchParams.get("timespan") ?? "6h";

  const { points, error } = await fetchTimeline(category, search, timespan);

  const body: TimelineResponse = {
    series: { [category]: points },
    fetchedAt: new Date().toISOString(),
    errors: error ? [error] : [],
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
