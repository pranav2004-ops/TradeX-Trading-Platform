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

  const wsRef = useRef(null);
  const prevSymbolsRef = useRef([]);
  const activeSymbolsRef = useRef([]);

  // Sync activeSymbolsRef to avoid stale enclosure in websocket callbacks
  useEffect(() => {
    activeSymbolsRef.current = symbols;
  }, [symbols]);

    // Connect WebSocket
  useEffect(() => {
    const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    // If API_BASE_URL is custom, replace http protocol with ws. Otherwise fallback to local.
    const wsHost = API_BASE_URL
      ? API_BASE_URL.replace(/^http/, "ws")
      : `${wsScheme}//${window.location.host}`;
    
    // Strip trailing slash if present
    const cleanHost = wsHost.endsWith("/") ? wsHost.slice(0, -1) : wsHost;
    const WS_URL = `${cleanHost}/ws`;

    let socket = null;
    let connectTimeout = null;

    const connect = () => {
      if (socket) return;
      console.info("[WS] Connecting to:", WS_URL);
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.info("[WS] Live price ticks socket active.");
        if (activeSymbolsRef.current.length > 0) {
          socket.send(JSON.stringify({ action: "subscribe", symbols: activeSymbolsRef.current }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "price_update" && data.symbol) {
            setQuoteMap((current) => ({
              ...current,
              [data.symbol.toUpperCase()]: {
                symbol: data.symbol,
                currentPrice: data.currentPrice,
                change: data.change,
                changePercent: data.changePercent,
                previousClose: data.previousClose,
              },
            }));
            setLastUpdatedAt(Date.now());
          }
        } catch (err) {
          console.error("[WS] Error parsing tick update:", err);
        }
      };

      socket.onclose = () => {
        console.warn("[WS] Connection closed. Reconnecting in 5s...");
        socket = null;
        wsRef.current = null;
        connectTimeout = setTimeout(connect, 5000);
      };

      socket.onerror = (err) => {
        console.error("[WS] Connection error:", err);
      };

      wsRef.current = socket;
    };

    connect();

    return () => {
      if (connectTimeout) clearTimeout(connectTimeout);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Sync subscriptions on symbol changes
  useEffect(() => {
    const prev = prevSymbolsRef.current;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const added = symbols.filter((s) => !prev.includes(s));
      const removed = prev.filter((s) => !symbols.includes(s));

      if (added.length > 0) {
        wsRef.current.send(JSON.stringify({ action: "subscribe", symbols: added }));
      }
      if (removed.length > 0) {
        wsRef.current.send(JSON.stringify({ action: "unsubscribe", symbols: removed }));
      }
    }
    prevSymbolsRef.current = symbols;
  }, [symbols]);

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

    // Skip HTTP polling fetch if WebSocket is alive and active
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
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
