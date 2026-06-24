 const getApiKey = () => {
  if (!process.env.FINNHUB_API_KEY) {
    throw new Error("Finnhub API key is missing");
  }

  return process.env.FINNHUB_API_KEY;
};

const QUOTE_CACHE_TTL_MS = 60 * 1000;
const OVERVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_CACHE_TTL_MS = 5 * 60 * 1000;

const quoteCache = new Map();
const overviewCache = new Map();
const sparklineCache = new Map();

const getCachedValue = (cache, key) => {
  const cached = cache.get(key);

  if (!cached || cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
};

const setCachedValue = (cache, key, value, ttlMs) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const normalizeSymbol = (symbol) =>
  String(symbol || "").trim().toUpperCase();

/**
 * Convert Finnhub quote response into the same shape
 * expected elsewhere in the app.
 */
const convertQuoteToAlphaShape = (symbol, quote) => ({
  "Global Quote": {
    "01. symbol": symbol,
    "05. price": String(quote.c || 0),
    "09. change": String(quote.d || 0),
    "10. change percent": `${quote.dp || 0}%`,
  },
});

const parseQuote = (symbol, data) => {
  const quote = data?.["Global Quote"] || {};

  const currentPrice = Number(quote["05. price"]);
  const change = Number(quote["09. change"]);
  const changePercent = Number(
    String(quote["10. change percent"] || "").replace("%", "")
  );

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error(`Quote unavailable for ${symbol}`);
  }

  return {
    symbol,
    currentPrice,
    change: Number.isFinite(change) ? change : 0,
    changePercent: Number.isFinite(changePercent)
      ? changePercent
      : 0,
  };
};

/**
 * STOCK SEARCH
 */
export const searchStocks = async (keyword) => {
  const API_KEY = getApiKey();

  const url =
    `https://finnhub.io/api/v1/search` +
    `?q=${encodeURIComponent(keyword)}` +
    `&token=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch stock search data");
  }

  const data = await response.json();

  return {
    bestMatches: (data.result || []).map((item) => ({
      "1. symbol": item.symbol,
      "2. name": item.description,
      "3. type": item.type,
      "4. region": "",
      "8. currency": "",
    })),
  };
};

/**
 * REAL-TIME QUOTE
 */
export const getStockQuote = async (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol);

  if (!normalizedSymbol) {
    throw new Error("Symbol is required");
  }

  const cached = getCachedValue(
    quoteCache,
    normalizedSymbol
  );

  if (cached) {
    return cached;
  }

  const API_KEY = getApiKey();

  const url =
    `https://finnhub.io/api/v1/quote` +
    `?symbol=${encodeURIComponent(normalizedSymbol)}` +
    `&token=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch stock quote");
  }

  const quote = await response.json();

  if (!quote.c || quote.c <= 0) {
    throw new Error(
      `Quote unavailable for ${normalizedSymbol}`
    );
  }

  const data = convertQuoteToAlphaShape(
    normalizedSymbol,
    quote
  );

  setCachedValue(
    quoteCache,
    normalizedSymbol,
    data,
    QUOTE_CACHE_TTL_MS
  );

  return data;
};

/**
 * MULTI-QUOTE
 */
export const getBatchStockQuotes = async (
  symbols = []
) => {
  const uniqueSymbols = [
    ...new Set(
      symbols.map(normalizeSymbol).filter(Boolean)
    ),
  ];

  const results = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        const data = await getStockQuote(symbol);
        return parseQuote(symbol, data);
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
};

/**
 * SPARKLINE — hourly closes over the last 7 days
 */
export const getSparklineData = async (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol);

  if (!normalizedSymbol) throw new Error("Symbol is required");

  const cached = getCachedValue(sparklineCache, normalizedSymbol);
  if (cached) return cached;

  const API_KEY = getApiKey();
  const now = Math.floor(Date.now() / 1000);
  const from = now - 7 * 24 * 60 * 60;

  const url =
    `https://finnhub.io/api/v1/stock/candle` +
    `?symbol=${encodeURIComponent(normalizedSymbol)}` +
    `&resolution=60` +
    `&from=${from}` +
    `&to=${now}` +
    `&token=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sparkline for ${normalizedSymbol}`);
  }

  const data = await response.json();

  const prices =
    data.s === "ok" && Array.isArray(data.c) && data.c.length > 0
      ? data.c
      : [];

  const result = { symbol: normalizedSymbol, prices };

  setCachedValue(sparklineCache, normalizedSymbol, result, SPARKLINE_CACHE_TTL_MS);

  return result;
};

/**
 * COMPANY OVERVIEW
 */
export const getStockOverview = async (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol);

  if (!normalizedSymbol) {
    throw new Error("Symbol is required");
  }

  const cached = getCachedValue(
    overviewCache,
    normalizedSymbol
  );

  if (cached) {
    return cached;
  }

  const API_KEY = getApiKey();

  const url =
    `https://finnhub.io/api/v1/stock/profile2` +
    `?symbol=${encodeURIComponent(normalizedSymbol)}` +
    `&token=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Failed to fetch company profile"
    );
  }

  const profile = await response.json();

  const overview = {
    Symbol: normalizedSymbol,
    Name: profile.name || normalizedSymbol,
    Exchange: profile.exchange || "",
    Currency: profile.currency || "",
    Country: profile.country || "",
    Industry: profile.finnhubIndustry || "",
    WebURL: profile.weburl || "",
    IPODate: profile.ipo || "",
    MarketCapitalization:
      profile.marketCapitalization || 0,
  };

  setCachedValue(
    overviewCache,
    normalizedSymbol,
    overview,
    OVERVIEW_CACHE_TTL_MS
  );

  return overview;
};