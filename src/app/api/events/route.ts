import { NextRequest, NextResponse } from "next/server";
import { fetchArticles, fetchGeo, normalizeArticles } from "@/lib/gdelt";
import { fetchRssFallback } from "@/lib/rss";
import type { CategoryId, EventsResponse, GeoPoint, NewsEvent, SourceId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_CATEGORIES: CategoryId[] = [
  "all",
  "conflict",
  "disaster",
  "protest",
  "economy",
  "politics",
  "technology",
  "health",
];

const VALID_TIMESPANS = new Set(["1h", "6h", "12h", "24h", "3d"]);
const VALID_SOURCES = new Set(["auto", "gdelt", "rss"]);

// Below this many GDELT articles, "auto" mode also pulls the RSS fallback
// and merges it in — GDELT is comprehensive but occasionally thin (or
// unreachable) for a given category/window, so this keeps the feed populated.
const AUTO_FALLBACK_THRESHOLD = 5;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryParam = (searchParams.get("category") ?? "all") as CategoryId;
  const category = VALID_CATEGORIES.includes(categoryParam) ? categoryParam : "all";
  const search = searchParams.get("q");
  const timespanParam = searchParams.get("timespan") ?? "6h";
  const timespan = VALID_TIMESPANS.has(timespanParam) ? timespanParam : "6h";
  const sourceParam = searchParams.get("source") ?? "auto";
  const sourceMode = (VALID_SOURCES.has(sourceParam) ? sourceParam : "auto") as
    | "auto"
    | SourceId;

  const errors: string[] = [];
  const sourcesUsed: SourceId[] = [];
  let events: NewsEvent[] = [];
  let geo: GeoPoint[] = [];

  const wantGdelt = sourceMode === "auto" || sourceMode === "gdelt";
  const wantRss = sourceMode === "rss";

  if (wantGdelt) {
    const [articlesResult, geoResult] = await Promise.all([
      fetchArticles(category, search, timespan, 75),
      fetchGeo(category, search, timespan),
    ]);
    if (articlesResult.error) errors.push(`GDELT: ${articlesResult.error}`);
    if (geoResult.error) errors.push(`GDELT geo: ${geoResult.error}`);

    const gdeltEvents = normalizeArticles(articlesResult.articles, category);
    if (gdeltEvents.length > 0) sourcesUsed.push("gdelt");
    events = gdeltEvents;
    geo = geoResult.points;
  }

  const shouldFallbackToRss =
    wantRss || (sourceMode === "auto" && events.length < AUTO_FALLBACK_THRESHOLD);

  if (shouldFallbackToRss) {
    const rssResult = await fetchRssFallback(category, search, timespan);
    if (rssResult.error) errors.push(`RSS: ${rssResult.error}`);
    if (rssResult.events.length > 0) sourcesUsed.push("rss");

    // Merge, de-duplicating by URL (some outlets get picked up by both).
    const seenUrls = new Set(events.map((e) => e.url));
    for (const e of rssResult.events) {
      if (!seenUrls.has(e.url)) {
        events.push(e);
        seenUrls.add(e.url);
      }
    }
    events.sort((a, b) => new Date(b.seenDate).getTime() - new Date(a.seenDate).getTime());
  }

  const body: EventsResponse = {
    events,
    geo,
    fetchedAt: new Date().toISOString(),
    timespan,
    category,
    query: search,
    sourceMode,
    sourcesUsed,
    errors,
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
