export interface LiveTvChannel {
  id: string;
  country: string;
  name: string;
  /** YouTube channel ID (UC...) — verified working, embeds via `embed/live_stream?channel=`. */
  channelId?: string;
  /** Public @handle — used for the "Watch on YouTube" link, and as the
   * fallback when channelId isn't verified. */
  handle: string;
}

/**
 * Embeds use YouTube's `embed/live_stream?channel=CHANNEL_ID` pattern,
 * which auto-plays whatever's currently live on that channel — no need to
 * track a specific (and eventually stale) video ID. YouTube's own player
 * chrome already includes volume/mute/fullscreen controls.
 *
 * Only three entries have a channel ID I could actually verify this
 * session (NDTV, Al Jazeera English, WION) — those get a real embed.
 * Every other entry still gets a direct "Watch on YouTube" link via its
 * @handle so there's always a working path, even without a verified ID.
 * If you verify more channel IDs, just add `channelId` to any entry below.
 */
export const LIVE_TV_CHANNELS: LiveTvChannel[] = [
  // India (priority 1)
  { id: "ndtv", country: "India", name: "NDTV 24x7", channelId: "UCZFMm1mMw0F81Z37aaEzTUA", handle: "ndtv" },
  { id: "wion", country: "India", name: "WION", channelId: "UC_gUM8rL-Lrg6O3adPW9K1g", handle: "WIONews" },
  { id: "indiatoday", country: "India", name: "India Today", handle: "IndiaToday" },
  { id: "aajtak", country: "India", name: "Aaj Tak", handle: "aajtak" },
  { id: "republic", country: "India", name: "Republic World", handle: "RepublicWorld" },

  // United States (priority 2)
  { id: "abcnews", country: "United States", name: "ABC News", handle: "ABCNews" },
  { id: "cbsnews", country: "United States", name: "CBS News", handle: "CBSNews" },
  { id: "bloomberg", country: "United States", name: "Bloomberg Television", handle: "business" },
  { id: "nbcnews", country: "United States", name: "NBC News", handle: "NBCNews" },

  // International
  { id: "aljazeera", country: "Qatar", name: "Al Jazeera English", channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg", handle: "aljazeeraenglish" },
  { id: "dw", country: "Germany", name: "DW News", handle: "dwnews" },
  { id: "france24", country: "France", name: "France 24 English", handle: "FRANCE24" },
  { id: "skynews", country: "United Kingdom", name: "Sky News", handle: "SkyNews" },
  { id: "euronews", country: "Europe", name: "Euronews", handle: "euronews" },
  { id: "cna", country: "Singapore", name: "CNA", handle: "channelnewsasia" },
];
