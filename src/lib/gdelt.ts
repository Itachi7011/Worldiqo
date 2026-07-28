import type {
  CategoryDef,
  CategoryId,
  GeoPoint,
  NewsEvent,
  TimelinePoint,
} from "./types";

/**
 * Worldiqo pulls real, live data from the GDELT Project (gdeltproject.org) —
 * a free, keyless, publicly funded database that monitors news media in
 * over 100 languages worldwide, updated every 15 minutes.
 *
 *   - DOC 2.0 API   -> individual article-level events (the live feed)
 *   - GEO 2.0 API   -> geocoded locations mentioned in matching coverage (the map)
 *   - DOC timelinevol -> volume-over-time series (the activity chart)
 *
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */

const DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const GEO_ENDPOINT = "https://api.gdeltproject.org/api/v2/geo/geo";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "all",
    label: "All signals",
    color: "#4FD1C5",
    query: "",
  },
  {
    id: "conflict",
    label: "Conflict & Security",
    color: "#E0555A",
    query: "(war OR military OR airstrike OR ceasefire OR insurgency)",
  },
  {
    id: "disaster",
    label: "Disaster & Climate",
    color: "#F2A65A",
    query: "(earthquake OR flood OR wildfire OR hurricane OR typhoon OR drought)",
  },
  {
    id: "protest",
    label: "Protest & Unrest",
    color: "#C77DFF",
    query: "(protest OR demonstration OR riot OR strike OR unrest)",
  },
  {
    id: "economy",
    label: "Economy & Markets",
    color: "#4ADE80",
    query: "(inflation OR recession OR markets OR trade deal OR interest rate)",
  },
  {
    id: "politics",
    label: "Politics & Government",
    color: "#60A5FA",
    query: "(election OR parliament OR president OR legislation OR summit)",
  },
  {
    id: "technology",
    label: "Technology",
    color: "#22D3EE",
    query: "(artificial intelligence OR cyberattack OR semiconductor OR spacecraft)",
  },
  {
    id: "health",
    label: "Health",
    color: "#F472B6",
    query: "(outbreak OR pandemic OR vaccine OR epidemic OR health ministry)",
  },
];

export function categoryById(id: CategoryId): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

// Plain-language keyword lists mirroring the GDELT boolean queries above —
// used to classify free text (e.g. RSS articles, or GDELT geo-point article
// snippets) into a category by simple substring matching, which GDELT's own
// query syntax can't do for us after the fact.
export const CATEGORY_KEYWORDS: Record<Exclude<CategoryId, "all">, string[]> = {
  conflict: ["war", "military", "airstrike", "ceasefire", "insurgency", "troops", "conflict"],
  disaster: ["earthquake", "flood", "wildfire", "hurricane", "typhoon", "drought", "storm"],
  protest: ["protest", "demonstration", "riot", "strike", "unrest", "rally"],
  economy: ["inflation", "recession", "markets", "trade", "interest rate", "economy", "economic"],
  politics: ["election", "parliament", "president", "legislation", "summit", "government", "minister"],
  technology: ["artificial intelligence", "cyberattack", "semiconductor", "spacecraft", "technology"],
  health: ["outbreak", "pandemic", "vaccine", "epidemic", "health"],
};

/** Best-guess category for a piece of free text, or "all" if nothing matches. */
export function classifyText(text: string): CategoryId {
  const haystack = text.toLowerCase();
  let best: CategoryId = "all";
  let bestHits = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    Exclude<CategoryId, "all">,
    string[],
  ][]) {
    const hits = keywords.filter((k) => haystack.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = cat;
    }
  }
  return best;
}

/** Build the final GDELT query string for a category + free-text search + timespan. */
export function buildQuery(category: CategoryId, search: string | null): string {
  const cat = categoryById(category);
  const parts: string[] = [];
  if (search && search.trim().length > 0) parts.push(search.trim());
  if (cat.query) parts.push(cat.query);
  // sourcelang:eng keeps results readable in the demo UI; GDELT covers 100+ languages.
  parts.push("sourcelang:eng");
  return parts.join(" ");
}

const TIMEOUT_MS = 7000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Live intelligence data — never cache.
      cache: "no-store",
      headers: { "User-Agent": "Worldiqo/1.0 (+https://worldiqo.app)" },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export interface DocApiArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language?: string;
  sourcecountry?: string;
  socialimage?: string;
}

export async function fetchArticles(
  category: CategoryId,
  search: string | null,
  timespan: string,
  maxrecords = 75
): Promise<{ articles: DocApiArticle[]; error: string | null }> {
  const query = buildQuery(category, search);
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: String(maxrecords),
    timespan,
    sort: "datedesc",
  });
  try {
    const res = await fetchWithTimeout(`${DOC_ENDPOINT}?${params.toString()}`);
    if (!res.ok) {
      return { articles: [], error: `GDELT DOC API returned ${res.status}` };
    }
    const text = await res.text();
    if (!text.trim()) return { articles: [], error: null };
    const json = JSON.parse(text) as { articles?: DocApiArticle[] };
    return { articles: json.articles ?? [], error: null };
  } catch (err) {
    return {
      articles: [],
      error: err instanceof Error ? err.message : "Unknown error fetching articles",
    };
  }
}

interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    name?: string;
    count?: number;
    html?: string;
    shareimage?: string;
  };
}

/**
 * GDELT's GEO API packs a small HTML snippet per location — usually a short
 * list of `<a href="...">headline</a>` links to the articles mentioning that
 * place. We extract all of them (not just the first) so map popups can show
 * a short reading list per location instead of a single link.
 */
function extractArticleLinks(html: string, limit = 5): { title: string; url: string }[] {
  const links: { title: string; url: string }[] = [];
  const re = /<a[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g;
  let match: RegExpExecArray | null;
  const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
  while ((match = re.exec(html)) !== null && links.length < limit) {
    const [, rawUrl, rawTitle] = match;
    const url = decode(rawUrl);
    const title = decode(rawTitle);
    if (url && title) links.push({ title, url });
  }
  return links;
}

export async function fetchGeo(
  category: CategoryId,
  search: string | null,
  timespan: string
): Promise<{ points: GeoPoint[]; error: string | null }> {
  const query = buildQuery(category, search);
  const params = new URLSearchParams({
    query,
    format: "geojson",
    timespan,
  });
  try {
    const res = await fetchWithTimeout(`${GEO_ENDPOINT}?${params.toString()}`);
    if (!res.ok) {
      return { points: [], error: `GDELT GEO API returned ${res.status}` };
    }
    const text = await res.text();
    if (!text.trim()) return { points: [], error: null };
    const json = JSON.parse(text) as { features?: GeoFeature[] };
    const features = json.features ?? [];
    const points: GeoPoint[] = features
      .filter((f) => f.geometry?.coordinates?.length === 2)
      .map((f, idx) => {
        const [lon, lat] = f.geometry.coordinates;
        const html = f.properties.html ?? "";
        const articles = extractArticleLinks(html);
        const classifyBasis = `${f.properties.name ?? ""} ${articles.map((a) => a.title).join(" ")}`;
        return {
          id: `${lat}-${lon}-${idx}`,
          name: f.properties.name ?? "Unknown location",
          lat,
          lon,
          count: f.properties.count ?? 1,
          category,
          subCategory: category === "all" ? classifyText(classifyBasis) : category,
          articleUrl: articles[0]?.url ?? null,
          articles,
        };
      });
    return { points, error: null };
  } catch (err) {
    return {
      points: [],
      error: err instanceof Error ? err.message : "Unknown error fetching geo data",
    };
  }
}

export function normalizeArticles(
  articles: DocApiArticle[],
  category: CategoryId
): NewsEvent[] {
  return articles.map((a, idx) => ({
    id: `${a.url}-${idx}`,
    title: a.title,
    url: a.url,
    domain: a.domain,
    country: a.sourcecountry ?? null,
    language: a.language ?? null,
    seenDate: parseGdeltDate(a.seendate),
    image: a.socialimage ?? null,
    category,
    source: "gdelt" as const,
  }));
}

/** GDELT dates look like "20260726T143000Z" */
function parseGdeltDate(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
}

export async function fetchTimeline(
  category: CategoryId,
  search: string | null,
  timespan: string
): Promise<{ points: TimelinePoint[]; error: string | null }> {
  const query = buildQuery(category, search);
  const params = new URLSearchParams({
    query,
    mode: "timelinevol",
    format: "json",
    timespan,
  });
  try {
    const res = await fetchWithTimeout(`${DOC_ENDPOINT}?${params.toString()}`);
    if (!res.ok) {
      return { points: [], error: `GDELT timeline API returned ${res.status}` };
    }
    const text = await res.text();
    if (!text.trim()) return { points: [], error: null };
    const json = JSON.parse(text) as {
      timeline?: { data?: { date: string; value: number }[] }[];
    };
    const series = json.timeline?.[0]?.data ?? [];
    const points: TimelinePoint[] = series.map((p) => ({
      date: parseGdeltDate(p.date),
      value: p.value,
    }));
    return { points, error: null };
  } catch (err) {
    return {
      points: [],
      error: err instanceof Error ? err.message : "Unknown error fetching timeline",
    };
  }
}
