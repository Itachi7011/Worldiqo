"use client";

import { useState } from "react";
import SportsView from "./SportsView";
import ChessView from "./ChessView";

export default function SportsHubView() {
  const [tab, setTab] = useState<"leagues" | "chess">("leagues");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 border-b border-border pb-3">
        {(["leagues", "chess"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-signal-cyan/15 text-signal-cyan" : "text-muted hover:text-fg"
            }`}
          >
            {t === "leagues" ? "Leagues" : "Chess"}
          </button>
        ))}
      </div>

      {tab === "leagues" ? <SportsView /> : <ChessView />}
    </div>
  );
}
