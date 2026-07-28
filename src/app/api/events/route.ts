import { NextRequest, NextResponse } from "next/server";
import { fetchArticles, fetchGeo, normalizeArticles } from "@/lib/gdelt";
import { fetchRssFallback, fetchRedditFallback } from "@/lib/rss";
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
const VALID_SOURCES = new Set(["auto", "gdelt", "rss", "reddit"]);

// Below this many GDELT articles, "auto" mode also uses the other sources —
// GDELT is comprehensive but occasionally thin (or unreachable) for a given
// category/window, so this keeps the feed populated.
const AUTO_FALLBACK_THRESHOLD = 8;

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

  const wantGdelt = sourceMode === "auto" || sourceMode === "gdelt";
  // In "auto" mode we don't wait to see if GDELT is thin before trying the
  // others — everything is kicked off concurrently and decided after.
  // Sequential fallback (wait for GDELT's full timeout, THEN start the
  // next one's) was the actual cause of ~17s responses previously; doing
  // them concurrently bounds latency by the slowest source, not the sum.
  const wantRss = sourceMode === "rss" || sourceMode === "auto";
  const wantReddit = sourceMode === "reddit" || sourceMode === "auto";

  const [gdeltResult, rssResult, redditResult] = await Promise.all([
    wantGdelt
      ? Promise.all([
          fetchArticles(category, search, timespan, 75),
          fetchGeo(category, search, timespan),
        ])
      : Promise.resolve(null),
    wantRss ? fetchRssFallback(category, search, timespan) : Promise.resolve(null),
    wantReddit ? fetchRedditFallback(category, search, timespan) : Promise.resolve(null),
  ]);

  let events: NewsEvent[] = [];
  let geo: GeoPoint[] = [];

  if (gdeltResult) {
    const [articlesResult, geoResult] = gdeltResult;
    if (articlesResult.error) errors.push(`GDELT: ${articlesResult.error}`);
    if (geoResult.error) errors.push(`GDELT geo: ${geoResult.error}`);
    const gdeltEvents = normalizeArticles(articlesResult.articles, category);
    if (gdeltEvents.length > 0) sourcesUsed.push("gdelt");
    events = gdeltEvents;
    geo = geoResult.points;
  }

  const useFallbacks =
    sourceMode === "rss" ||
    sourceMode === "reddit" ||
    (sourceMode === "auto" && events.length < AUTO_FALLBACK_THRESHOLD);

  const seenUrls = new Set(events.map((e) => e.url));
  function merge(result: { events: NewsEvent[]; error: string | null } | null, label: string, id: SourceId) {
    if (!result) return;
    if (result.error) errors.push(`${label}: ${result.error}`);
    if (result.events.length > 0) sourcesUsed.push(id);
    for (const e of result.events) {
      if (!seenUrls.has(e.url)) {
        events.push(e);
        seenUrls.add(e.url);
      }
    }
  }

  if (useFallbacks) {
    merge(rssResult, "RSS", "rss");
    merge(redditResult, "Reddit", "reddit");
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
