export interface NewsChannel {
  id: string;
  country: string;
  outlet: string;
  feedUrl: string;
}

/**
 * One reliable public RSS feed per country, for browsing headlines by
 * country directly (separate from the GDELT/RSS blend that powers the main
 * map + feed, though a few outlets overlap). India and the US are listed
 * first per priority; every other country carried over from earlier
 * revisions, plus 10 more added at the end. Chosen for being well-known,
 * stable, English-language feeds so headlines are readable in this UI.
 */
export const NEWS_CHANNELS: NewsChannel[] = [
  { id: "in", country: "India", outlet: "Times of India", feedUrl: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms" },
  { id: "us", country: "United States", outlet: "NPR", feedUrl: "https://feeds.npr.org/1004/rss.xml" },
  { id: "uk", country: "United Kingdom", outlet: "BBC News", feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "de", country: "Germany", outlet: "DW", feedUrl: "https://rss.dw.com/rdf/rss-en-all" },
  { id: "fr", country: "France", outlet: "France 24", feedUrl: "https://www.france24.com/en/rss" },
  { id: "qa", country: "Qatar", outlet: "Al Jazeera", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "ca", country: "Canada", outlet: "CBC News", feedUrl: "https://www.cbc.ca/webfeed/rss/rss-world" },
  { id: "eu", country: "Europe (general)", outlet: "Euronews", feedUrl: "https://www.euronews.com/rss" },
  { id: "au", country: "Australia", outlet: "ABC News Australia", feedUrl: "https://www.abc.net.au/news/feed/51120/rss.xml" },
  { id: "ie", country: "Ireland", outlet: "RTE News", feedUrl: "https://www.rte.ie/feeds/rss/?index=/news" },
  { id: "za", country: "South Africa", outlet: "News24", feedUrl: "https://feeds.24.com/articles/news24/TopStories/rss" },
  { id: "jp", country: "Japan", outlet: "NHK World", feedUrl: "https://www3.nhk.or.jp/rss/news/cat0.xml" },
  { id: "cn-hk", country: "Hong Kong", outlet: "South China Morning Post", feedUrl: "https://www.scmp.com/rss/91/feed" },
  { id: "kr", country: "South Korea", outlet: "Yonhap News", feedUrl: "https://en.yna.co.kr/RSS/news.xml" },
  { id: "ru", country: "Russia", outlet: "TASS", feedUrl: "https://tass.com/rss/v2.xml" },
  { id: "tr", country: "Turkey", outlet: "TRT World", feedUrl: "https://www.trtworld.com/rss" },
  { id: "il", country: "Israel", outlet: "Times of Israel", feedUrl: "https://www.timesofisrael.com/feed/" },
  { id: "eg", country: "Egypt", outlet: "Ahram Online", feedUrl: "https://english.ahram.org.eg/UI/Front/RssPage.aspx" },
  { id: "ng", country: "Nigeria", outlet: "Premium Times", feedUrl: "https://www.premiumtimesng.com/feed" },
  { id: "br", country: "Brazil", outlet: "Brazil Reports", feedUrl: "https://brazilian.report/feed/" },
  { id: "mx", country: "Mexico", outlet: "Mexico News Daily", feedUrl: "https://mexiconewsdaily.com/feed/" },
  { id: "sg", country: "Singapore", outlet: "Channel News Asia", feedUrl: "https://www.channelnewsasia.com/rssfeeds/8395986" },
  { id: "ph", country: "Philippines", outlet: "Philippine Star", feedUrl: "https://www.philstar.com/rss/headlines" },
  { id: "id", country: "Indonesia", outlet: "The Jakarta Post", feedUrl: "https://www.thejakartapost.com/rss" },
  { id: "pk", country: "Pakistan", outlet: "Dawn", feedUrl: "https://www.dawn.com/feeds/home" },
  { id: "ua", country: "Ukraine", outlet: "Kyiv Independent", feedUrl: "https://kyivindependent.com/feed/" },
  { id: "it", country: "Italy", outlet: "ANSA English", feedUrl: "https://www.ansa.it/english/english_rss.xml" },
  { id: "es", country: "Spain", outlet: "El Pais English", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada" },

  // --- 10 more countries ---
  { id: "sa", country: "Saudi Arabia", outlet: "Arab News", feedUrl: "https://www.arabnews.com/rss.xml" },
  { id: "ae", country: "United Arab Emirates", outlet: "Khaleej Times", feedUrl: "https://www.khaleejtimes.com/rss" },
  { id: "bd", country: "Bangladesh", outlet: "The Daily Star", feedUrl: "https://www.thedailystar.net/rss.xml" },
  { id: "lk", country: "Sri Lanka", outlet: "Daily Mirror", feedUrl: "https://www.dailymirror.lk/rss/" },
  { id: "np", country: "Nepal", outlet: "The Kathmandu Post", feedUrl: "https://kathmandupost.com/rss" },
  { id: "ke", country: "Kenya", outlet: "The Star Kenya", feedUrl: "https://www.the-star.co.ke/rss" },
  { id: "ar", country: "Argentina", outlet: "Buenos Aires Herald", feedUrl: "https://buenosairesherald.com/feed" },
  { id: "co", country: "Colombia", outlet: "Colombia Reports", feedUrl: "https://colombiareports.com/feed/" },
  { id: "pl", country: "Poland", outlet: "Notes From Poland", feedUrl: "https://notesfrompoland.com/feed/" },
  { id: "nl", country: "Netherlands", outlet: "NL Times", feedUrl: "https://nltimes.nl/rss.xml" },
];
