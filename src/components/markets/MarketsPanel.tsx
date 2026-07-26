"use client";

import { useState } from "react";
import CurrencyView from "./CurrencyView";
import MetalsView from "./MetalsView";

export default function MarketsPanel() {
  const [tab, setTab] = useState<"currency" | "metals">("currency");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-xl font-semibold mb-1">Markets</h1>
          <p className="text-sm text-muted">
            Live currency exchange rates and precious metal spot prices, with
            historical charts.
          </p>
        </div>

        <div className="flex gap-1.5 border-b border-border pb-3">
          {(["currency", "metals"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-signal-cyan/15 text-signal-cyan"
                  : "text-muted hover:text-fg"
              }`}
            >
              {t === "currency" ? "Currencies" : "Gold & Silver"}
            </button>
          ))}
        </div>

        {tab === "currency" ? <CurrencyView /> : <MetalsView />}
      </div>
    </div>
  );
}
