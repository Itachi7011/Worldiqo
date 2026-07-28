const TIMEOUT_MS = 8000;

export const CHESS_CATEGORIES = [
  { id: "live_blitz", label: "Blitz" },
  { id: "live_rapid", label: "Rapid" },
  { id: "live_bullet", label: "Bullet" },
  { id: "live_daily", label: "Daily" },
] as const;

export interface ChessPlayer {
  rank: number;
  username: string;
  score: number;
  country: string | null;
  url: string;
}

interface RawChessPlayer {
  player_id: number;
  username: string;
  score: number;
  rank: number;
  country?: string; // URL like "https://api.chess.com/pub/country/IN"
  url: string;
}

export async function fetchChessLeaderboard(
  category: string
): Promise<{ players: ChessPlayer[]; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.chess.com/pub/leaderboards", {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Worldiqo/1.0 (+https://worldiqo.app)" },
    });
    if (!res.ok) return { players: [], error: `Chess.com returned ${res.status}` };
    const json = await res.json();
    const raw: RawChessPlayer[] = json[category] ?? [];
    const players: ChessPlayer[] = raw.slice(0, 25).map((p) => ({
      rank: p.rank,
      username: p.username,
      score: p.score,
      country: p.country ? p.country.split("/").pop() ?? null : null,
      url: `https://www.chess.com/member/${p.username}`,
    }));
    return { players, error: null };
  } catch (err) {
    return {
      players: [],
      error: err instanceof Error ? err.message : "Unknown error fetching Chess.com leaderboard",
    };
  } finally {
    clearTimeout(timer);
  }
}
