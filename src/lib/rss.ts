import { XMLParser } from "fast-xml-parser";
import type { CategoryId, NewsEvent } from "./types";
import { CATEGORY_KEYWORDS } from "./gdelt";

/**
 * A second, independent live data source. GDELT is the primary source (it's
 * global and gives us map coordinates), but it's a single point of failure —
 * if it's rate-limited, blocked by a network, or just having a slow moment,
 * this pulls straight from major outlets' public RSS feeds instead. No API
 * key, no aggregator, just the same public RSS feeds outlined in the
 * original project spec.
 */
const FEEDS = [
  "http://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://feeds.npr.org/1004/rss.xml",
  "https://www.theguardian.com/world/rss",
  "https://rss.dw.com/rdf/rss-en-all",
  "https://www.france24.com/en/rss",
  "https://www.euronews.com/rss",
  "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms",
  "https://www.cbc.ca/webfeed/rss/rss-world",
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
  "cbc.ca": "Canada",
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

interface RssItem {
  title?: string;
  link?: string | { "@_href"?: string };
  pubDate?: string;
  "dc:date"?: string; // RDF feeds (e.g. DW) use Dublin Core dates instead of pubDate
  description?: string;
}

function linkOf(item: RssItem): string | null {
  if (typeof item.link === "string") return item.link;
  if (item.link && typeof item.link === "object") return item.link["@_href"] ?? null;
  return null;
}

async function fetchOneFeed(url: string): Promise<RssItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Worldiqo/1.0 (+https://worldiqo.app)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items =
      parsed?.rss?.channel?.item ?? // RSS 2.0 (BBC, Al Jazeera, NPR, Guardian, France24, Euronews, ToI, CBC)
      parsed?.["rdf:RDF"]?.item ?? // RDF/RSS 1.0 (DW) — <item> is a sibling of <channel>, not nested
      parsed?.feed?.entry ?? // Atom
      [];
    return Array.isArray(items) ? items : [items];
  } catch {
    return []; // one dead feed shouldn't take down the whole fallback
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRssFallback(
  category: CategoryId,
  search: string | null,
  timespan: string
): Promise<{ events: NewsEvent[]; error: string | null }> {
  try {
    const results = await Promise.all(FEEDS.map(fetchOneFeed));
    const cutoff = Date.now() - (TIMESPAN_MS[timespan] ?? TIMESPAN_MS["24h"]);
    const keywords = category === "all" ? [] : CATEGORY_KEYWORDS[category] ?? [];
    const searchLower = search?.toLowerCase().trim() || null;

    const events: NewsEvent[] = [];
    results.forEach((items, feedIdx) => {
      const domain = new URL(FEEDS[feedIdx]).hostname.replace(/^www\./, "");
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

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
