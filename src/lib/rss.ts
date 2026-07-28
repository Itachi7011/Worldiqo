import { XMLParser } from "fast-xml-parser";
import type { CategoryId, NewsEvent } from "./types";
import { CATEGORY_KEYWORDS } from "./gdelt";

/**
 * Independent live data sources beyond GDELT. All standard-RSS-shaped
 * sources (outlet feeds, Google News editions, Bing News) share one parser
 * and fallback pool; Reddit (JSON, not XML) is handled separately below.
 */
const RSS_FEEDS = [
  // Major outlets
  "http://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://feeds.npr.org/1004/rss.xml",
  "https://www.theguardian.com/world/rss",
  "https://rss.dw.com/rdf/rss-en-all",
  "https://www.france24.com/en/rss",
  "https://www.euronews.com/rss",
  "https://www.cbc.ca/webfeed/rss/rss-world",
  // India priority
  "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms",
  "https://www.thehindu.com/news/national/feeder/default.rss",
  "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
  // Google News — keyless, per-edition (country/language aware), a
  // genuinely different aggregation source from single-outlet feeds.
  "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en",
  // Bing News — also keyless RSS, another independent aggregator.
  "https://www.bing.com/news/search?q=world+news&format=RSS",
];

// Rough "home country of the outlet" mapping — the same convention GDELT
// itself uses for its `sourcecountry` field (publisher's country, not
// necessarily the country the story is about). Used for the "top source
// countries" chart, matched against the feed's hostname.
const OUTLET_COUNTRY: Record<string, string> = {
  "bbci.co.uk": "United Kingdom",
  "bbc.co.uk": "United Kingdom",
  "aljazeera.com": "Qatar",
  "npr.org": "United States",
  "theguardian.com": "United Kingdom",
  "dw.com": "Germany",
  "france24.com": "France",
  "euronews.com": "France",
  "indiatimes.com": "India",
  "thehindu.com": "India",
  "hindustantimes.com": "India",
  "cbc.ca": "Canada",
  "news.google.com": "Aggregator",
  "bing.com": "Aggregator",
};

function countryForDomain(domain: string): string | null {
  const match = Object.keys(OUTLET_COUNTRY).find((k) => domain.includes(k));
  return match ? OUTLET_COUNTRY[match] : null;
}

// See CATEGORY_KEYWORDS in gdelt.ts for the keyword lists used below.

const TIMESPAN_MS: Record<string, number> = {
  "1h": 3600_000,
  "6h": 6 * 3600_000,
  "12h": 12 * 3600_000,
  "24h": 24 * 3600_000,
  "3d": 3 * 24 * 3600_000,
};

const parser = new XMLParser({ ignoreAttributes: false });

export interface RssItem {
  title?: string;
  link?: string | { "@_href"?: string };
  pubDate?: string;
  "dc:date"?: string; // RDF feeds (e.g. DW) use Dublin Core dates instead of pubDate
  description?: string;
}

export function linkOf(item: RssItem): string | null {
  if (typeof item.link === "string") return item.link;
  if (item.link && typeof item.link === "object") return item.link["@_href"] ?? null;
  return null;
}

/** Fetch and parse a single RSS/RDF/Atom feed, surfacing why it failed if it did. */
export async function fetchSingleFeed(
  url: string
): Promise<{ items: RssItem[]; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Worldiqo/1.0)" },
    });
    if (!res.ok) return { items: [], error: `Feed returned ${res.status}` };
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items =
      parsed?.rss?.channel?.item ?? // RSS 2.0 (most outlets, Google News, Bing News)
      parsed?.["rdf:RDF"]?.item ?? // RDF/RSS 1.0 (DW) — <item> is a sibling of <channel>, not nested
      parsed?.feed?.entry ?? // Atom
      [];
    const arr = Array.isArray(items) ? items : [items];
    return { items: arr, error: null };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "Unknown error fetching feed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOneFeed(url: string): Promise<RssItem[]> {
  const { items } = await fetchSingleFeed(url);
  return items;
}

export async function fetchRssFallback(
  category: CategoryId,
  search: string | null,
  timespan: string
): Promise<{ events: NewsEvent[]; error: string | null }> {
  try {
    const results = await Promise.all(RSS_FEEDS.map(fetchOneFeed));
    const cutoff = Date.now() - (TIMESPAN_MS[timespan] ?? TIMESPAN_MS["24h"]);
    const keywords = category === "all" ? [] : CATEGORY_KEYWORDS[category] ?? [];
    const searchLower = search?.toLowerCase().trim() || null;

    const events: NewsEvent[] = [];
    results.forEach((items, feedIdx) => {
      const domain = new URL(RSS_FEEDS[feedIdx]).hostname.replace(/^www\./, "");
      const country = countryForDomain(domain);
      for (const item of items) {
        const link = linkOf(item);
        if (!item.title || !link) continue;
        const dateStr = item.pubDate ?? item["dc:date"];
        const seenDate = dateStr ? new Date(dateStr) : new Date();
        if (Number.isNaN(seenDate.getTime()) || seenDate.getTime() < cutoff) continue;

        const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
        if (keywords.length > 0 && !keywords.some((k) => haystack.includes(k))) continue;
        if (searchLower && !haystack.includes(searchLower)) continue;

        events.push({
          id: link,
          title: stripHtml(item.title),
          url: link,
          domain,
          country,
          language: "en",
          seenDate: seenDate.toISOString(),
          image: null,
          category,
          source: "rss",
        });
      }
    });

    events.sort((a, b) => new Date(b.seenDate).getTime() - new Date(a.seenDate).getTime());
    return { events, error: null };
  } catch (err) {
    return {
      events: [],
      error: err instanceof Error ? err.message : "Unknown error fetching RSS fallback",
    };
  }
}

interface RedditPost {
  data: { title: string; url: string; permalink: string; created_utc: number; subreddit: string };
}

/**
 * Reddit's read-only JSON endpoints — keyless, no auth needed for public
 * subreddit listings. A genuinely different kind of source (crowd-submitted
 * links, not a wire service), which is exactly the point of a fallback.
 */
export async function fetchRedditFallback(
  category: CategoryId,
  search: string | null,
  timespan: string
): Promise<{ events: NewsEvent[]; error: string | null }> {
  const subreddits = ["worldnews", "news"];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const results = await Promise.all(
      subreddits.map((sub) =>
        fetch(`https://www.reddit.com/r/${sub}/top.json?limit=25&t=day`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { "User-Agent": "Worldiqo/1.0 (by /u/worldiqo)" },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    const cutoff = Date.now() - (TIMESPAN_MS[timespan] ?? TIMESPAN_MS["24h"]);
    const keywords = category === "all" ? [] : CATEGORY_KEYWORDS[category] ?? [];
    const searchLower = search?.toLowerCase().trim() || null;
    const events: NewsEvent[] = [];

    for (const json of results) {
      const posts: RedditPost[] = json?.data?.children ?? [];
      for (const post of posts) {
        const { title, url, permalink, created_utc, subreddit } = post.data;
        if (!title || !url) continue;
        const seenDate = new Date(created_utc * 1000);
        if (seenDate.getTime() < cutoff) continue;

        const haystack = title.toLowerCase();
        if (keywords.length > 0 && !keywords.some((k) => haystack.includes(k))) continue;
        if (searchLower && !haystack.includes(searchLower)) continue;

        // Link to the original article when it's an external link post;
        // fall back to the Reddit discussion for self-posts.
        const finalUrl = url.startsWith("https://www.reddit.com") || url.startsWith("/r/")
          ? `https://www.reddit.com${permalink}`
          : url;

        events.push({
          id: `https://www.reddit.com${permalink}`,
          title,
          url: finalUrl,
          domain: `r/${subreddit}`,
          country: null,
          language: "en",
          seenDate: seenDate.toISOString(),
          image: null,
          category,
          source: "reddit",
        });
      }
    }

    events.sort((a, b) => new Date(b.seenDate).getTime() - new Date(a.seenDate).getTime());
    return { events, error: null };
  } catch (err) {
    return {
      events: [],
      error: err instanceof Error ? err.message : "Unknown error fetching Reddit",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
