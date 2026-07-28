import { NextRequest, NextResponse } from "next/server";
import { fetchRecentResults, fetchStandings, fetchEspnRecentResults } from "@/lib/sports/sportsdb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("league");
  const espnSlug = searchParams.get("espn");

  if (!leagueId) {
    return NextResponse.json({ error: "league is required" }, { status: 400 });
  }

  const errors: string[] = [];

  const [primaryResults, standings] = await Promise.all([
    fetchRecentResults(leagueId),
    fetchStandings(leagueId),
  ]);

  let events = primaryResults.events;
  let eventsSource = "thesportsdb";

  if (events.length === 0 && espnSlug) {
    if (primaryResults.error) errors.push(`TheSportsDB: ${primaryResults.error}`);
    const espnResults = await fetchEspnRecentResults(espnSlug);
    if (espnResults.events.length > 0) {
      events = espnResults.events;
      eventsSource = "espn";
    } else if (espnResults.error) {
      errors.push(`ESPN: ${espnResults.error}`);
    }
  }

  if (standings.error) errors.push(`Standings: ${standings.error}`);

  return NextResponse.json(
    {
      events,
      eventsSource: events.length > 0 ? eventsSource : null,
      table: standings.table,
      errors,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
