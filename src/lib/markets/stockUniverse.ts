export interface StockRef {
  yahooTicker: string; // Yahoo Finance format, e.g. "AAPL", "RELIANCE.NS"
  name: string;
  country: string;
}

// A curated set of large, well-known companies across major economies so
// there's something meaningful to search/browse per country without
// needing a live ticker-search API (which no free/keyless source offers).
// India and the US are listed first and carry the most entries, per
// priority; every other country from earlier revisions is kept, plus 12
// more added. Confidence on the exact Yahoo ticker is high for large-cap
// US/UK/EU/Japan names (extremely well-documented conventions); lower for
// a handful of newer additions (Nigeria, Vietnam, UAE, Turkey, New Zealand)
// where I couldn't verify the exact exchange suffix live — if one doesn't
// resolve, only that entry is affected.
export const STOCK_UNIVERSE: StockRef[] = [
  // India (priority 1)
  { yahooTicker: "RELIANCE.NS", name: "Reliance Industries", country: "India" },
  { yahooTicker: "TCS.NS", name: "Tata Consultancy Services", country: "India" },
  { yahooTicker: "HDFCBANK.NS", name: "HDFC Bank", country: "India" },
  { yahooTicker: "INFY.NS", name: "Infosys", country: "India" },
  { yahooTicker: "ICICIBANK.NS", name: "ICICI Bank", country: "India" },
  { yahooTicker: "SBIN.NS", name: "State Bank of India", country: "India" },
  { yahooTicker: "ITC.NS", name: "ITC", country: "India" },
  { yahooTicker: "BHARTIARTL.NS", name: "Bharti Airtel", country: "India" },

  // United States (priority 2)
  { yahooTicker: "AAPL", name: "Apple", country: "United States" },
  { yahooTicker: "MSFT", name: "Microsoft", country: "United States" },
  { yahooTicker: "GOOGL", name: "Alphabet (Google)", country: "United States" },
  { yahooTicker: "AMZN", name: "Amazon", country: "United States" },
  { yahooTicker: "NVDA", name: "Nvidia", country: "United States" },
  { yahooTicker: "TSLA", name: "Tesla", country: "United States" },
  { yahooTicker: "META", name: "Meta Platforms", country: "United States" },
  { yahooTicker: "JPM", name: "JPMorgan Chase", country: "United States" },
  { yahooTicker: "BRK-B", name: "Berkshire Hathaway", country: "United States" },
  { yahooTicker: "V", name: "Visa", country: "United States" },

  // United Kingdom
  { yahooTicker: "BP.L", name: "BP", country: "United Kingdom" },
  { yahooTicker: "HSBA.L", name: "HSBC", country: "United Kingdom" },
  { yahooTicker: "GSK.L", name: "GSK", country: "United Kingdom" },
  { yahooTicker: "ULVR.L", name: "Unilever", country: "United Kingdom" },
  // Germany
  { yahooTicker: "SAP.DE", name: "SAP", country: "Germany" },
  { yahooTicker: "SIE.DE", name: "Siemens", country: "Germany" },
  { yahooTicker: "BMW.DE", name: "BMW", country: "Germany" },
  { yahooTicker: "ALV.DE", name: "Allianz", country: "Germany" },
  // France
  { yahooTicker: "MC.PA", name: "LVMH", country: "France" },
  { yahooTicker: "OR.PA", name: "L'Oreal", country: "France" },
  { yahooTicker: "SAN.PA", name: "Sanofi", country: "France" },
  // Japan
  { yahooTicker: "7203.T", name: "Toyota", country: "Japan" },
  { yahooTicker: "6758.T", name: "Sony", country: "Japan" },
  { yahooTicker: "9984.T", name: "SoftBank", country: "Japan" },
  // Hong Kong / China (H-shares)
  { yahooTicker: "0700.HK", name: "Tencent", country: "Hong Kong" },
  { yahooTicker: "9988.HK", name: "Alibaba", country: "Hong Kong" },
  { yahooTicker: "0941.HK", name: "China Mobile", country: "Hong Kong" },
  // Canada
  { yahooTicker: "SHOP.TO", name: "Shopify", country: "Canada" },
  { yahooTicker: "RY.TO", name: "Royal Bank of Canada", country: "Canada" },
  { yahooTicker: "TD.TO", name: "Toronto-Dominion Bank", country: "Canada" },
  // Australia
  { yahooTicker: "BHP.AX", name: "BHP Group", country: "Australia" },
  { yahooTicker: "CBA.AX", name: "Commonwealth Bank", country: "Australia" },
  { yahooTicker: "CSL.AX", name: "CSL Limited", country: "Australia" },
  // Brazil
  { yahooTicker: "PETR4.SA", name: "Petrobras", country: "Brazil" },
  { yahooTicker: "VALE3.SA", name: "Vale", country: "Brazil" },
  { yahooTicker: "ITUB4.SA", name: "Itau Unibanco", country: "Brazil" },
  // South Korea
  { yahooTicker: "005930.KS", name: "Samsung Electronics", country: "South Korea" },
  // Netherlands
  { yahooTicker: "ASML.AS", name: "ASML", country: "Netherlands" },
  // Switzerland
  { yahooTicker: "NESN.SW", name: "Nestle", country: "Switzerland" },
  { yahooTicker: "NOVN.SW", name: "Novartis", country: "Switzerland" },
  { yahooTicker: "ROG.SW", name: "Roche", country: "Switzerland" },
  // Italy
  { yahooTicker: "ENI.MI", name: "Eni", country: "Italy" },
  { yahooTicker: "ISP.MI", name: "Intesa Sanpaolo", country: "Italy" },
  // Spain
  { yahooTicker: "SAN.MC", name: "Banco Santander", country: "Spain" },
  { yahooTicker: "ITX.MC", name: "Inditex", country: "Spain" },
  // Sweden
  { yahooTicker: "VOLV-B.ST", name: "Volvo", country: "Sweden" },
  // Mexico
  { yahooTicker: "WALMEX.MX", name: "Walmart de Mexico", country: "Mexico" },
  { yahooTicker: "AMXL.MX", name: "America Movil", country: "Mexico" },
  // Indonesia
  { yahooTicker: "BBCA.JK", name: "Bank Central Asia", country: "Indonesia" },
  // South Africa
  { yahooTicker: "NPN.JO", name: "Naspers", country: "South Africa" },
  // Singapore
  { yahooTicker: "D05.SI", name: "DBS Group", country: "Singapore" },
  // Taiwan
  { yahooTicker: "2330.TW", name: "TSMC", country: "Taiwan" },
  // Poland
  { yahooTicker: "PKN.WA", name: "PKN Orlen", country: "Poland" },
  // Belgium
  { yahooTicker: "ABI.BR", name: "AB InBev", country: "Belgium" },

  // --- 12 more countries ---
  // Saudi Arabia
  { yahooTicker: "2222.SR", name: "Saudi Aramco", country: "Saudi Arabia" },
  // United Arab Emirates
  { yahooTicker: "EMAAR.AE", name: "Emaar Properties", country: "United Arab Emirates" },
  // Nigeria
  { yahooTicker: "DANGCEM.LG", name: "Dangote Cement", country: "Nigeria" },
  // Egypt
  { yahooTicker: "COMI.CA", name: "Commercial International Bank", country: "Egypt" },
  // Turkey
  { yahooTicker: "THYAO.IS", name: "Turkish Airlines", country: "Turkey" },
  // Vietnam
  { yahooTicker: "VIC.VN", name: "Vingroup", country: "Vietnam" },
  // Thailand
  { yahooTicker: "PTT.BK", name: "PTT", country: "Thailand" },
  // Argentina (NYSE-listed ADR)
  { yahooTicker: "YPF", name: "YPF", country: "Argentina" },
  // Ireland (NASDAQ-listed ADR)
  { yahooTicker: "RYAAY", name: "Ryanair", country: "Ireland" },
  // Israel (NASDAQ-listed)
  { yahooTicker: "CHKP", name: "Check Point Software", country: "Israel" },
  // New Zealand
  { yahooTicker: "FPH.NZ", name: "Fisher & Paykel Healthcare", country: "New Zealand" },
  // Denmark
  { yahooTicker: "NOVO-B.CO", name: "Novo Nordisk", country: "Denmark" },
];
