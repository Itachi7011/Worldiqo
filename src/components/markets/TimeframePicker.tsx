"use client";

import { TIMEFRAMES } from "@/lib/markets/types";
import type { TimeframeId } from "@/lib/markets/types";

export default function TimeframePicker({
  value,
  onChange,
}: {
  value: TimeframeId;
  onChange: (t: TimeframeId) => void;
}) {
  return (
    <div className="flex gap-1">
      {TIMEFRAMES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
            value === t.id
              ? "bg-signal-cyan/15 border-signal-cyan text-signal-cyan"
              : "border-border text-muted hover:text-fg hover:border-muted-2"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
