const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const BASE_URL = `${API_BASE_URL}/api/stocks`;

export const searchStocks = async (keyword) => {
  const response = await fetch(
    `${BASE_URL}/search?keyword=${keyword}`
  );

  if (!response.ok) {
    throw new Error("Failed to search stocks");
  }

  return response.json();
};

export const getStockQuote = async (symbol) => {
  const response = await fetch(
    `${BASE_URL}/quote/${symbol}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch stock quote");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch stock quote");
  }

  return result.data;
};

export const getBatchQuotes = async (symbols = []) => {
  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => String(symbol || "").trim().toUpperCase()).filter(Boolean)),
  ];

  if (uniqueSymbols.length === 0) {
    return [];
  }

  const response = await fetch(
    `${BASE_URL}/batch?symbols=${encodeURIComponent(uniqueSymbols.join(","))}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch batch quotes");
  }

  return Array.isArray(result) ? result : result.data || [];
};

export const getSparkline = async (symbol) => {
  const s = String(symbol || "").trim().toUpperCase();

  if (!s) return { symbol: s, prices: [] };

  const response = await fetch(`${BASE_URL}/sparkline/${encodeURIComponent(s)}`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch sparkline");
  }

  return result.data || { symbol: s, prices: [] };
};

export const getBatchSectors = async (symbols = []) => {
  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => String(symbol || "").trim().toUpperCase()).filter(Boolean)),
  ];

  if (uniqueSymbols.length === 0) {
    return [];
  }

  const response = await fetch(
    `${BASE_URL}/sectors?symbols=${encodeURIComponent(uniqueSymbols.join(","))}`
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch sector data");
  }

  return result.data;
};
