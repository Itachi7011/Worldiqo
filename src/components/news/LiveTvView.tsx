"use client";

import { useMemo, useState } from "react";
import { LIVE_TV_CHANNELS, type LiveTvChannel } from "@/lib/liveTv";

export default function LiveTvView() {
  const countries = useMemo(
    () => Array.from(new Set(LIVE_TV_CHANNELS.map((c) => c.country))),
    []
  );
  const [countryFilter, setCountryFilter] = useState<string | "all">("all");
  const [selected, setSelected] = useState<LiveTvChannel>(LIVE_TV_CHANNELS[0]);

  const filtered =
    countryFilter === "all"
      ? LIVE_TV_CHANNELS
      : LIVE_TV_CHANNELS.filter((c) => c.country === countryFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setCountryFilter("all")}
          className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
            countryFilter === "all"
              ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
              : "border-border text-muted hover:text-fg hover:border-muted-2"
          }`}
        >
          All countries
        </button>
        {countries.map((c) => (
          <button
            key={c}
            onClick={() => setCountryFilter(c)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
              countryFilter === c
                ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
                : "border-border text-muted hover:text-fg hover:border-muted-2"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-panel border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selected.name}</p>
              <p className="text-xs text-muted-2 font-mono">{selected.country}</p>
            </div>
            <a
              href={`https://www.youtube.com/@${selected.handle}/live`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-signal-cyan hover:underline"
            >
              Open on YouTube ↗
            </a>
          </div>
          <div className="aspect-video bg-black">
            {selected.channelId ? (
              <iframe
                key={selected.id}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/live_stream?channel=${selected.channelId}&autoplay=1`}
                title={selected.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-sm text-muted">
                  This channel&apos;s live embed isn&apos;t verified yet — watch it directly on
                  YouTube instead.
                </p>
                <a
                  href={`https://www.youtube.com/@${selected.handle}/live`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm px-3 py-1.5 rounded-md border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/10 transition-colors"
                >
                  Watch {selected.name} on YouTube
                </a>
              </div>
            )}
          </div>
          <p className="px-4 py-2 text-[11px] text-muted-2">
            Volume, mute, and fullscreen are built into the player controls above.
          </p>
        </div>

        <div className="bg-panel border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium">Channels</p>
          </div>
          <div className="divide-y divide-border max-h-96 xl:max-h-[420px] overflow-y-auto thin-scroll">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                  selected.id === c.id
                    ? "bg-signal-cyan/10 text-signal-cyan"
                    : "hover:bg-panel-raised/60"
                }`}
              >
                <span>{c.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {!c.channelId && (
                    <span className="text-[9px] uppercase text-muted-2 border border-border rounded px-1">
                      link only
                    </span>
                  )}
                  <span className="text-[11px] text-muted-2 font-mono">{c.country}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
