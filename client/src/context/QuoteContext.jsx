/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getBatchQuotes } from "../api/stockApi";

const REFRESH_INTERVAL_MS = 20000;

export const QuoteContext = createContext(null);

const normalizeSymbols = (symbols = []) => [
  ...new Set(
    symbols
      .map((symbol) => String(symbol || "").trim().toUpperCase())
      .filter(Boolean)
  ),
];

export const QuoteProvider = ({ children }) => {
  const [symbols, setSymbols] = useState([]);
  const [quoteMap, setQuoteMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const subscribersRef = useRef(new Map());
  const requestIdRef = useRef(0);

  const rebuildSymbols = useCallback(() => {
    const nextSymbols = normalizeSymbols(
      Array.from(subscribersRef.current.values()).flat()
    );

    setSymbols((current) => {
      if (
        current.length === nextSymbols.length &&
        current.every((symbol, index) => symbol === nextSymbols[index])
      ) {
        return current;
      }

      if (nextSymbols.length === 0) {
        setQuoteMap({});
        setLoading(false);
        setError("");
        setLastUpdatedAt(null);
      }

      return nextSymbols;
    });
  }, []);

  const registerSymbols = useCallback((sourceId, nextSymbols = []) => {
    subscribersRef.current.set(sourceId, normalizeSymbols(nextSymbols));
    rebuildSymbols();

    return () => {
      subscribersRef.current.delete(sourceId);
      rebuildSymbols();
    };
  }, [rebuildSymbols]);

  const refreshQuotes = useCallback(async () => {
    const activeSymbols = symbols;

    if (activeSymbols.length === 0) {
      setQuoteMap({});
      setLoading(false);
      setError("");
      setLastUpdatedAt(null);
      return [];
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setLoading(true);
      setError("");

      const quotes = await getBatchQuotes(activeSymbols);

      if (requestIdRef.current !== requestId) {
        return quotes;
      }

      const nextQuoteMap = quotes.reduce((map, quote) => {
        if (!quote?.symbol) return map;

        return {
          ...map,
          [String(quote.symbol).toUpperCase()]: quote,
        };
      }, {});

      setQuoteMap(nextQuoteMap);
      setLastUpdatedAt(Date.now());

      return quotes;
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err.message || "Failed to refresh quotes.");
      }

      return [];
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [symbols]);

  useEffect(() => {
    if (symbols.length === 0) {
      return undefined;
    }

    const initialRefreshId = window.setTimeout(refreshQuotes, 0);

    const intervalId = window.setInterval(refreshQuotes, REFRESH_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
    };
  }, [refreshQuotes, symbols.length]);

  const value = useMemo(() => ({
    quoteMap,
    loading,
    error,
    lastUpdatedAt,
    refreshQuotes,
    registerSymbols,
  }), [error, lastUpdatedAt, loading, quoteMap, refreshQuotes, registerSymbols]);

  return (
    <QuoteContext.Provider value={value}>
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuotes = () => {
  const context = useContext(QuoteContext);

  if (!context) {
    throw new Error("useQuotes must be used within QuoteProvider.");
  }

  return context;
};

export const useQuoteSubscription = (sourceId, symbols = []) => {
  const context = useQuotes();
  const { registerSymbols } = context;
  const normalizedSymbolsKey = useMemo(
    () => normalizeSymbols(symbols).join(","),
    [symbols]
  );

  useEffect(() => {
    if (!sourceId) return undefined;

    return registerSymbols(
      sourceId,
      normalizedSymbolsKey ? normalizedSymbolsKey.split(",") : []
    );
  }, [normalizedSymbolsKey, registerSymbols, sourceId]);

  return context;
};
