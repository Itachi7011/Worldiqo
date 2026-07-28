"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { CHESS_CATEGORIES } from "@/lib/sports/chess";

interface ChessPlayer {
  rank: number;
  username: string;
  score: number;
  country: string | null;
  url: string;
}

export default function ChessView() {
  const [category, setCategory] = useState<string>(CHESS_CATEGORIES[0].id);
  const [players, setPlayers] = useState<ChessPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/sports/chess?category=${category}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setPlayers(json.players ?? []);
          setError(json.error ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load leaderboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 flex-wrap">
        {CHESS_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
              category === c.id
                ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                : "border-border text-muted hover:text-fg hover:border-muted-2"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <ErrorBanner errors={error ? [error] : []} />
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium">Top 25 — via Chess.com</p>
        </div>
        {loading ? (
          <div className="p-4">
            <Spinner label="Loading leaderboard…" size="sm" />
          </div>
        ) : players.length === 0 ? (
          <p className="p-4 text-sm text-muted">No leaderboard data available right now.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {players.map((p) => (
                <tr key={p.username}>
                  <td className="px-4 py-2 text-muted-2 font-mono w-10">{p.rank}</td>
                  <td className="px-4 py-2">
                    <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {p.username}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-muted-2 font-mono text-xs">{p.country ?? ""}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
