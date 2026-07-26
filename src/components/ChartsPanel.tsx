"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import type { NewsEvent, CategoryId } from "@/lib/types";
import { categoryById } from "@/lib/gdelt";

interface ChartsPanelProps {
  events: NewsEvent[];
  category: CategoryId;
  timespan: string;
}

function topCountries(events: NewsEvent[], limit = 8) {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.country) continue;
    counts.set(e.country, (counts.get(e.country) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, count]) => ({ country, count }));
}

// Bucket width scales with the window so the chart always shows a readable
// number of bars — e.g. hourly buckets for a 6h window, 6-hour buckets for 3d.
const BUCKET_MINUTES: Record<string, number> = {
  "1h": 5,
  "6h": 30,
  "12h": 60,
  "24h": 60,
  "3d": 360,
};

/**
 * Derived directly from the events already on screen, rather than a
 * separate API call — this is what actually populates the feed, so the
 * chart can never be empty while the feed has articles, and there's no
 * second network call that can independently fail.
 */
function volumeOverTime(events: NewsEvent[], timespan: string) {
  const bucketMs = (BUCKET_MINUTES[timespan] ?? 60) * 60_000;
  const buckets = new Map<number, number>();
  for (const e of events) {
    const t = new Date(e.seenDate).getTime();
    if (Number.isNaN(t)) continue;
    const bucketStart = Math.floor(t / bucketMs) * bucketMs;
    buckets.set(bucketStart, (buckets.get(bucketStart) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([date, count]) => ({ date: new Date(date).toISOString(), count }));
}

const tooltipStyle = {
  background: "var(--panel-raised)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  color: "var(--fg)",
};

export default function ChartsPanel({ events, category, timespan }: ChartsPanelProps) {
  const cat = categoryById(category);
  const countries = topCountries(events);
  const timeline = volumeOverTime(events, timespan);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border-t border-border">
      <div className="bg-panel p-4">
        <p className="text-xs uppercase tracking-wider text-muted mb-3">
          Coverage volume over time
        </p>
        <div className="h-40">
          {timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-2 text-center px-4">
              No articles in this window yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cat.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={cat.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  }
                  stroke="var(--muted-2)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-2)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => (v ? new Date(v as string).toLocaleString() : "")}
                  formatter={(v) => [`${v} article${v === 1 ? "" : "s"}`, "coverage"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={cat.color}
                  strokeWidth={2}
                  fill="url(#volFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-panel p-4">
        <p className="text-xs uppercase tracking-wider text-muted mb-3">
          Top source countries (this window)
        </p>
        <div className="h-40">
          {countries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-2 text-center px-4">
              No country-attributed sources in this window
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={countries}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="var(--muted-2)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  stroke="var(--muted-2)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={cat.color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
