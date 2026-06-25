 const getApiKey = () => {
  if (!process.env.FINNHUB_API_KEY) {
    throw new Error("Finnhub API key is missing");
  }

  return process.env.FINNHUB_API_KEY;
};

const QUOTE_CACHE_TTL_MS = 60 * 1000;
const OVERVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_CACHE_TTL_MS = 5 * 60 * 1000;
const CANDLES_CACHE_TTL_MS = 2 * 60 * 1000;

const quoteCache = new Map();
const overviewCache = new Map();
const sparklineCache = new Map();
const candlesCache = new Map();

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
    "08. previous close": String(quote.pc || 0),
    "09. change": String(quote.d || 0),
    "10. change percent": `${quote.dp || 0}%`,
  },
});

const parseQuote = (symbol, data) => {
  const quote = data?.["Global Quote"] || {};

  const currentPrice = Number(quote["05. price"]);
  const previousClose = Number(quote["08. previous close"]);
  const change = Number(quote["09. change"]);
  const changePercent = Number(
    String(quote["10. change percent"] || "").replace("%", "")
  );

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error(`Quote unavailable for ${symbol}`);
  }

  const fallbackPrevClose = Number.isFinite(previousClose) && previousClose > 0 
    ? previousClose 
    : currentPrice - (Number.isFinite(change) ? change : 0);

  return {
    symbol,
    currentPrice,
    change: Number.isFinite(change) ? change : 0,
    changePercent: Number.isFinite(changePercent)
      ? changePercent
      : 0,
    previousClose: fallbackPrevClose,
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
 * Helpers for simulated historical candles fallback
 */
const getStepSeconds = (resolution) => {
  switch (String(resolution)) {
    case "15":
      return 15 * 60;
    case "30":
      return 30 * 60;
    case "60":
      return 60 * 60;
    case "D":
    case "1D":
      return 24 * 60 * 60;
    case "W":
      return 7 * 24 * 60 * 60;
    case "M":
      return 30 * 24 * 60 * 60;
    default:
      return 24 * 60 * 60;
  }
};

const generateSimulatedCandles = (symbol, resolution, from, to, currentPrice) => {
  const stepSeconds = getStepSeconds(resolution);
  const timestamps = [];
  let currentT = Math.floor(to);

  const isWeekend = (epochSeconds) => {
    const date = new Date(epochSeconds * 1000);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  while (currentT >= from) {
    if (resolution !== "D" || !isWeekend(currentT)) {
      timestamps.push(currentT);
    }
    currentT -= stepSeconds;
  }

  timestamps.reverse();

  if (timestamps.length === 0) {
    timestamps.push(Math.floor(to));
  }

  let maxChange = 0.015; // 1.5% daily
  if (resolution === "15") maxChange = 0.002; // 0.2% for 15min
  if (resolution === "60") maxChange = 0.004; // 0.4% for 1hr

  let currentVal = currentPrice || 150.0;
  const candles = [];

  for (let i = timestamps.length - 1; i >= 0; i--) {
    const t = timestamps[i];
    const change = (Math.random() - 0.5) * 2 * maxChange;
    const open = currentVal * (1 - change);
    const close = currentVal;
    const high = Math.max(open, close) * (1 + Math.random() * (maxChange * 0.5));
    const low = Math.min(open, close) * (1 - Math.random() * (maxChange * 0.5));
    const volume = Math.floor(50000 + Math.random() * 500000);

    candles.push({
      time: t * 1000,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(volume),
    });

    currentVal = open;
  }

  candles.reverse();
  return candles;
};

/**
 * HISTORICAL CANDLES
 */
export const getStockCandles = async (symbol, resolution, from, to) => {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) throw new Error("Symbol is required");

  const cacheKey = `${normalizedSymbol}_${resolution}_${from}_${to}`;
  const cached = getCachedValue(candlesCache, cacheKey);
  if (cached) return cached;

  const API_KEY = getApiKey();
  const url =
    `https://finnhub.io/api/v1/stock/candle` +
    `?symbol=${encodeURIComponent(normalizedSymbol)}` +
    `&resolution=${resolution}` +
    `&from=${from}` +
    `&to=${to}` +
    `&token=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub HTTP error status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error || data.s !== "ok") {
      throw new Error(data.error || `Finnhub returned status ${data.s}`);
    }

    const candles = data.t.map((timestamp, index) => ({
      time: timestamp * 1000,
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: data.c[index],
      volume: data.v[index],
    }));

    const result = { symbol: normalizedSymbol, candles, status: "ok" };
    setCachedValue(candlesCache, cacheKey, result, CANDLES_CACHE_TTL_MS);

    return result;
  } catch (error) {
    console.warn(`[CANDLES FALLBACK] Fetching real-time quote for simulated candles: ${normalizedSymbol} (Reason: ${error.message})`);
    
    let currentPrice = 150.0;
    try {
      const quoteData = await getStockQuote(normalizedSymbol);
      const parsed = parseQuote(normalizedSymbol, quoteData);
      if (parsed && parsed.currentPrice) {
        currentPrice = parsed.currentPrice;
      }
    } catch (quoteErr) {
      console.error(`[CANDLES FALLBACK] Failed to fetch live quote for ${normalizedSymbol}:`, quoteErr.message);
    }

    const candles = generateSimulatedCandles(normalizedSymbol, resolution, from, to, currentPrice);
    const result = { symbol: normalizedSymbol, candles, status: "ok", simulated: true };
    setCachedValue(candlesCache, cacheKey, result, CANDLES_CACHE_TTL_MS);
    return result;
  }
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

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub HTTP error status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error || data.s !== "ok") {
      throw new Error(data.error || `Finnhub returned status ${data.s}`);
    }

    const prices =
      Array.isArray(data.c) && data.c.length > 0
        ? data.c
        : [];

    const result = { symbol: normalizedSymbol, prices };

    setCachedValue(sparklineCache, normalizedSymbol, result, SPARKLINE_CACHE_TTL_MS);

    return result;
  } catch (error) {
    console.warn(`[SPARKLINE FALLBACK] Fetching real-time quote for simulated sparkline: ${normalizedSymbol} (Reason: ${error.message})`);

    let currentPrice = 150.0;
    try {
      const quoteData = await getStockQuote(normalizedSymbol);
      const parsed = parseQuote(normalizedSymbol, quoteData);
      if (parsed && parsed.currentPrice) {
        currentPrice = parsed.currentPrice;
      }
    } catch (quoteErr) {
      console.error(`[SPARKLINE FALLBACK] Failed to fetch live quote for ${normalizedSymbol}:`, quoteErr.message);
    }

    const candles = generateSimulatedCandles(normalizedSymbol, "60", from, now, currentPrice);
    const prices = candles.map((c) => c.close);
    const result = { symbol: normalizedSymbol, prices, simulated: true };
    setCachedValue(sparklineCache, normalizedSymbol, result, SPARKLINE_CACHE_TTL_MS);
    return result;
  }
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

/**
 * Manually update the quote cache with simulated live ticks.
 */
export const updateStockCache = (symbol, price, change, changePercent, previousClose) => {
  const normalizedSymbol = normalizeSymbol(symbol);
  const data = {
    "Global Quote": {
      "01. symbol": normalizedSymbol,
      "05. price": String(price),
      "08. previous close": String(previousClose),
      "09. change": String(change),
      "10. change percent": `${changePercent}%`,
    },
  };
  setCachedValue(quoteCache, normalizedSymbol, data, 120 * 1000); // 2 minute cache
};