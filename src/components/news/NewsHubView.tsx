"use client";

import { useState } from "react";
import LiveTvView from "./LiveTvView";
import NewsChannelsView from "./NewsChannelsView";

export default function NewsHubView() {
  const [tab, setTab] = useState<"tv" | "articles">("tv");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 border-b border-border pb-3">
        {(["tv", "articles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-signal-cyan/15 text-signal-cyan" : "text-muted hover:text-fg"
            }`}
          >
            {t === "tv" ? "Live TV" : "Articles"}
          </button>
        ))}
      </div>

      {tab === "tv" ? <LiveTvView /> : <NewsChannelsView />}
    </div>
  );
}
