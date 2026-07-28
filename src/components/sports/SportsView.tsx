"use client";

import { useEffect, useMemo, useState } from "react";
import Spinner from "@/components/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { LEAGUES } from "@/lib/sports/sportsdb";

interface SportsEvent {
  id: string;
  date: string | null;
  home: string;
  away: string;
  homeScore: string | null;
  awayScore: string | null;
  status: string | null;
}

interface StandingRow {
  rank: string;
  team: string;
  played: string;
  win: string;
  draw: string;
  loss: string;
  points: string;
  badge: string | null;
}

const ALL = "__all__";

export default function SportsView() {
  const [sportFilter, setSportFilter] = useState<string>("All sports");
  const [countryFilter, setCountryFilter] = useState<string>("All countries");
  const [leagueId, setLeagueId] = useState<string>(ALL);

  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [eventsSource, setEventsSource] = useState<string | null>(null);
  const [table, setTable] = useState<StandingRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const sports = useMemo(() => ["All sports", ...Array.from(new Set(LEAGUES.map((l) => l.sport)))], []);
  const countries = useMemo(
    () => ["All countries", ...Array.from(new Set(LEAGUES.map((l) => l.country)))],
    []
  );

  const filteredLeagues = LEAGUES.filter(
    (l) =>
      (sportFilter === "All sports" || l.sport === sportFilter) &&
      (countryFilter === "All countries" || l.country === countryFilter)
  );

  const league = LEAGUES.find((l) => l.id === leagueId);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    async function load() {
      if (leagueId === ALL) {
        // Combined view: recent results across every currently-filtered
        // league, merged and sorted. Standings don't make sense combined —
        // pick one league to see its table.
        const results = await Promise.all(
          filteredLeagues.map((l) =>
            fetch(`/api/sports?league=${l.id}&espn=${encodeURIComponent(l.espnSlug)}`)
              .then((r) => r.json())
              .then((json) => ({ league: l, json }))
              .catch(() => ({ league: l, json: { events: [], errors: [] } }))
          )
        );
        if (cancelled) return;
        const merged = results
          .flatMap((r) => r.json.events.map((e: SportsEvent) => ({ ...e, league: r.league.name })))
          .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
          .slice(0, 30);
        setEvents(merged);
        setEventsSource(null);
        setTable([]);
        setErrors([]);
        setLoading(false);
        return;
      }

      if (!league) {
        setLoading(false);
        return;
      }
      const json = await fetch(`/api/sports?league=${leagueId}&espn=${encodeURIComponent(league.espnSlug)}`)
        .then((r) => r.json())
        .catch(() => ({ events: [], table: [], errors: ["Failed to load league data"] }));
      if (cancelled) return;
      setEvents(json.events ?? []);
      setEventsSource(json.eventsSource ?? null);
      setTable(json.table ?? []);
      setErrors(json.errors ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // filteredLeagues intentionally excluded — it's derived fresh each
    // render from stable inputs (sportFilter/countryFilter), which ARE deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, sportFilter, countryFilter, league]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {sports.map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                sportFilter === s
                  ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                  : "border-border text-muted hover:text-fg hover:border-muted-2"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {countries.map((c) => (
          <button
            key={c}
            onClick={() => setCountryFilter(c)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              countryFilter === c
                ? "bg-signal-amber/15 border-signal-amber text-signal-amber"
                : "border-border text-muted-2 hover:text-fg hover:border-muted-2"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setLeagueId(ALL)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
            leagueId === ALL
              ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
              : "border-border text-muted hover:text-fg hover:border-muted-2"
          }`}
        >
          All (combined results)
        </button>
        {filteredLeagues.map((l) => (
          <button
            key={l.id}
            onClick={() => setLeagueId(l.id)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
              leagueId === l.id
                ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                : "border-border text-muted hover:text-fg hover:border-muted-2"
            }`}
          >
            {l.name}
            <span className="text-muted-2"> · {l.country}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading…" size="sm" />
      ) : (
        <>
          <ErrorBanner errors={errors} className="-mx-1" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-panel border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">
                  Recent results
                  {eventsSource && (
                    <span className="text-xs text-muted-2 font-normal ml-1.5">
                      · via {eventsSource === "thesportsdb" ? "TheSportsDB" : "ESPN"}
                    </span>
                  )}
                </p>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto thin-scroll">
                {events.length === 0 && (
                  <p className="p-4 text-sm text-muted">No recent results available.</p>
                )}
                {events.map((e, i) => (
                  <div key={`${e.id}-${i}`} className="px-4 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{e.home}</span>
                      <span className="font-mono text-muted-2 shrink-0 px-2">
                        {e.homeScore ?? "-"} : {e.awayScore ?? "-"}
                      </span>
                      <span className="truncate text-right">{e.away}</span>
                    </div>
                    {e.date && (
                      <p className="text-[11px] text-muted-2 font-mono mt-0.5">
                        {e.date}
                        {leagueId === ALL && (e as { league?: string }).league
                          ? ` · ${(e as { league?: string }).league}`
                          : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-panel border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">Standings</p>
              </div>
              <div className="max-h-96 overflow-y-auto thin-scroll">
                {leagueId === ALL ? (
                  <p className="p-4 text-sm text-muted">
                    Pick a single league above to see its standings.
                  </p>
                ) : table.length === 0 ? (
                  <p className="p-4 text-sm text-muted">No standings available right now.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Team</th>
                        <th className="px-3 py-2 font-medium text-right">P</th>
                        <th className="px-3 py-2 font-medium text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {table.map((r) => (
                        <tr key={r.rank}>
                          <td className="px-3 py-2 text-muted-2 font-mono">{r.rank}</td>
                          <td className="px-3 py-2 truncate">{r.team}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-2">
                            {r.played}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {r.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
