export type CategoryId =
  | "all"
  | "conflict"
  | "disaster"
  | "protest"
  | "economy"
  | "politics"
  | "technology"
  | "health";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  color: string;
  /** GDELT boolean query fragment used to approximate this category */
  query: string;
}

export type SourceId = "gdelt" | "rss";

export interface NewsEvent {
  id: string;
  title: string;
  url: string;
  domain: string;
  country: string | null;
  language: string | null;
  seenDate: string; // ISO string
  image: string | null;
  category: CategoryId;
  source: SourceId;
}

export interface GeoArticleLink {
  title: string;
  url: string;
}

export interface GeoPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  count: number;
  category: CategoryId;
  /** Best-guess topic when the filter is "all" — used to color-code the map. */
  subCategory: CategoryId;
  articleUrl: string | null;
  articles: GeoArticleLink[];
}

export interface TimelinePoint {
  date: string; // ISO
  value: number;
}

export interface EventsResponse {
  events: NewsEvent[];
  geo: GeoPoint[];
  fetchedAt: string;
  timespan: string;
  category: CategoryId;
  query: string | null;
  sourceMode: "auto" | SourceId;
  sourcesUsed: SourceId[];
  errors: string[];
}

export interface TimelineResponse {
  series: Record<string, TimelinePoint[]>;
  fetchedAt: string;
  errors: string[];
}
