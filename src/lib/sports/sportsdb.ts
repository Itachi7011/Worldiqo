const BASE = "https://www.thesportsdb.com/api/v1/json/3";
const TIMEOUT_MS = 8000;

export interface LeagueRef {
  id: string;
  name: string;
  country: string;
  sport: string;
  /** ESPN's sport/league slug, used as a fallback source for recent results. */
  espnSlug: string;
}

// TheSportsDB league IDs for major competitions worldwide. The free tier
// (test key "3") is keyless and rate-limited to ~30 req/min, which is
// comfortably enough for on-demand lookups here.
export const LEAGUES: LeagueRef[] = [
  { id: "4460", name: "IPL", country: "India", sport: "Cricket", espnSlug: "" },
  { id: "4424", name: "MLB", country: "USA", sport: "Baseball", espnSlug: "baseball/mlb" },
  { id: "4328", name: "Premier League", country: "England", sport: "Soccer", espnSlug: "soccer/eng.1" },
  { id: "4335", name: "La Liga", country: "Spain", sport: "Soccer", espnSlug: "soccer/esp.1" },
  { id: "4331", name: "Bundesliga", country: "Germany", sport: "Soccer", espnSlug: "soccer/ger.1" },
  { id: "4332", name: "Serie A", country: "Italy", sport: "Soccer", espnSlug: "soccer/ita.1" },
  { id: "4334", name: "Ligue 1", country: "France", sport: "Soccer", espnSlug: "soccer/fra.1" },
  { id: "4346", name: "MLS", country: "USA", sport: "Soccer", espnSlug: "soccer/usa.1" },
  { id: "4480", name: "UEFA Champions League", country: "Europe", sport: "Soccer", espnSlug: "soccer/uefa.champions" },
  { id: "4387", name: "NBA", country: "USA", sport: "Basketball", espnSlug: "basketball/nba" },
  { id: "4391", name: "NFL", country: "USA", sport: "American Football", espnSlug: "football/nfl" },
  { id: "4380", name: "NHL", country: "USA/Canada", sport: "Ice Hockey", espnSlug: "hockey/nhl" },
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

export interface SportsEvent {
  id: string;
  date: string | null;
  home: string;
  away: string;
  homeScore: string | null;
  awayScore: string | null;
  status: string | null;
}

interface RawEvent {
  idEvent: string;
  dateEvent: string | null;
  strTime?: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
}

export async function fetchRecentResults(
  leagueId: string
): Promise<{ events: SportsEvent[]; error: string | null }> {
  try {
    const res = await fetchWithTimeout(`${BASE}/eventspastleague.php?id=${leagueId}`);
    if (!res.ok) return { events: [], error: `TheSportsDB returned ${res.status}` };
    const json = (await res.json()) as { events?: RawEvent[] };
    const events: SportsEvent[] = (json.events ?? []).map((e) => ({
      id: e.idEvent,
      date: e.dateEvent,
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      homeScore: e.intHomeScore,
      awayScore: e.intAwayScore,
      status: e.strStatus,
    }));
    return { events, error: null };
  } catch (err) {
    return {
      events: [],
      error: err instanceof Error ? err.message : "Unknown error fetching results",
    };
  }
}

export interface StandingRow {
  rank: string;
  team: string;
  played: string;
  win: string;
  draw: string;
  loss: string;
  points: string;
  badge: string | null;
}

interface RawStanding {
  intRank: string;
  strTeam: string;
  intPlayed: string;
  intWin: string;
  intDraw: string;
  intLoss: string;
  intPoints: string;
  strBadge: string | null;
}

export async function fetchStandings(
  leagueId: string
): Promise<{ table: StandingRow[]; error: string | null }> {
  try {
    const res = await fetchWithTimeout(`${BASE}/lookuptable.php?l=${leagueId}`);
    if (!res.ok) return { table: [], error: `TheSportsDB returned ${res.status}` };
    const json = (await res.json()) as { table?: RawStanding[] };
    if (!json.table || json.table.length === 0) {
      return { table: [], error: "No standings available for this league right now" };
    }
    const table: StandingRow[] = json.table.map((r) => ({
      rank: r.intRank,
      team: r.strTeam,
      played: r.intPlayed,
      win: r.intWin,
      draw: r.intDraw,
      loss: r.intLoss,
      points: r.intPoints,
      badge: r.strBadge,
    }));
    return { table, error: null };
  } catch (err) {
    return {
      table: [],
      error: err instanceof Error ? err.message : "Unknown error fetching standings",
    };
  }
}

interface EspnEvent {
  id: string;
  date: string;
  competitions: {
    status?: { type?: { description?: string } };
    competitors: { homeAway: "home" | "away"; team: { displayName: string }; score?: string }[];
  }[];
}

/**
 * ESPN's hidden (unofficial but widely-used, keyless) scoreboard API —
 * fallback when TheSportsDB's results are thin or unavailable. No
 * standings equivalent used here (ESPN's standings endpoint structure is
 * less consistently documented), so standings stay TheSportsDB-only.
 */
export async function fetchEspnRecentResults(
  espnSlug: string
): Promise<{ events: SportsEvent[]; error: string | null }> {
  try {
    const res = await fetchWithTimeout(
      `https://site.api.espn.com/apis/site/v2/sports/${espnSlug}/scoreboard`
    );
    if (!res.ok) return { events: [], error: `ESPN returned ${res.status}` };
    const json = (await res.json()) as { events?: EspnEvent[] };
    const events: SportsEvent[] = (json.events ?? [])
      .filter((e) => e.competitions?.[0]?.status?.type?.description !== "Scheduled")
      .map((e) => {
        const comp = e.competitions[0];
        const home = comp.competitors.find((c) => c.homeAway === "home");
        const away = comp.competitors.find((c) => c.homeAway === "away");
        return {
          id: e.id,
          date: e.date ? e.date.slice(0, 10) : null,
          home: home?.team.displayName ?? "Home",
          away: away?.team.displayName ?? "Away",
          homeScore: home?.score ?? null,
          awayScore: away?.score ?? null,
          status: comp.status?.type?.description ?? null,
        };
      });
    return { events, error: null };
  } catch (err) {
    return {
      events: [],
      error: err instanceof Error ? err.message : "Unknown error fetching from ESPN",
    };
  }
}
