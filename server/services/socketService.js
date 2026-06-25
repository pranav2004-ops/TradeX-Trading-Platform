import { WebSocketServer } from "ws";
import { fetchAuthoritativePrice } from "./tradingEngineService.js";
import { processPendingOrders } from "./limitOrderService.js";
import { updateStockCache } from "./stockService.js";

let wss = null;
let tickInterval = null;

// Map<symbol, Set<WebSocket>>
const subscriptions = new Map();

// Map<symbol, { symbol, currentPrice, change, changePercent, previousClose }>
const livePrices = new Map();

/**
 * Initialize the WebSocket Server.
 * Attached to the same HTTP server instance to share ports.
 *
 * @param {import("http").Server} server
 */
export const startWebSocketServer = (server) => {
  if (wss) return;

  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    console.info("[WS] Client connected.");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);

        if (data.action === "subscribe") {
          const symbols = data.symbols || [];
          for (const s of symbols) {
            const sym = String(s).trim().toUpperCase();
            if (!sym) continue;

            if (!subscriptions.has(sym)) {
              subscriptions.set(sym, new Set());
            }
            subscriptions.get(sym).add(ws);

            // If we have live quote cached, send immediately
            if (livePrices.has(sym)) {
              ws.send(
                JSON.stringify({
                  type: "price_update",
                  ...livePrices.get(sym),
                })
              );
            } else {
              // Lazy-initialize symbol price in background
              initializeSymbolPrice(sym);
            }
          }
        } else if (data.action === "unsubscribe") {
          const symbols = data.symbols || [];
          for (const s of symbols) {
            const sym = String(s).trim().toUpperCase();
            if (!sym) continue;

            if (subscriptions.has(sym)) {
              subscriptions.get(sym).delete(ws);
              if (subscriptions.get(sym).size === 0) {
                subscriptions.delete(sym);
                livePrices.delete(sym);
              }
            }
          }
        }
      } catch (err) {
        console.error("[WS] Error parsing message:", err.message);
      }
    });

    ws.on("close", () => {
      console.info("[WS] Client disconnected.");
      // Clean up subscriptions from this socket
      for (const [sym, clients] of subscriptions.entries()) {
        clients.delete(ws);
        if (clients.size === 0) {
          subscriptions.delete(sym);
          livePrices.delete(sym);
        }
      }
    });
  });

  // Start ticker simulation loop
  startSimulationTicker();
  console.info("[WS] WebSocket Server started on /ws path.");
};

/**
 * Gracefully shut down the WebSocket server and ticker.
 */
export const stopWebSocketServer = () => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (wss) {
    wss.close();
    wss = null;
    console.info("[WS] WebSocket Server stopped.");
  }
};

/**
 * Initialize symbol price by fetching the latest authoritative market quote.
 */
const initializeSymbolPrice = async (symbol) => {
  try {
    const basePrice = await fetchAuthoritativePrice(symbol);
    if (livePrices.has(symbol)) return; // double-check race condition

    // Fallback previous close estimation: 1.5% off
    const change = Math.round(basePrice * 0.015 * (Math.random() > 0.5 ? 1 : -1) * 100) / 100;
    const previousClose = Math.round((basePrice - change) * 100) / 100;
    const changePercent = Math.round((change / previousClose) * 100 * 100) / 100;

    const initialQuote = {
      symbol,
      currentPrice: basePrice,
      change,
      changePercent,
      previousClose,
    };

    livePrices.set(symbol, initialQuote);
    updateStockCache(symbol, basePrice, change, changePercent, previousClose);
    broadcastQuote(symbol, initialQuote);
  } catch (err) {
    console.error(`[WS] Failed to initialize price for ${symbol}:`, err.message);
  }
};

/**
 * Start the ticker generator to simulate real-time price ticks
 * and trigger instant order checks.
 */
const startSimulationTicker = () => {
  if (tickInterval) return;

  tickInterval = setInterval(async () => {
    if (subscriptions.size === 0) return;

    for (const [symbol, quote] of livePrices.entries()) {
      if (!subscriptions.has(symbol) || subscriptions.get(symbol).size === 0) {
        continue;
      }

      // Fluctuates by up to +/- 0.08%
      const tickPct = (Math.random() - 0.5) * 0.0016;
      const currentPrice = Math.round(quote.currentPrice * (1 + tickPct) * 100) / 100;
      const change = Math.round((currentPrice - quote.previousClose) * 100) / 100;
      const changePercent = Math.round((change / quote.previousClose) * 100 * 100) / 100;

      const updatedQuote = {
        symbol,
        currentPrice,
        change,
        changePercent,
        previousClose: quote.previousClose,
      };

      livePrices.set(symbol, updatedQuote);

      // 1. Update memory cache so REST API and watchers are in-sync
      updateStockCache(symbol, currentPrice, change, changePercent, quote.previousClose);

      // 2. Broadcast updated price to all websocket clients subscribed
      broadcastQuote(symbol, updatedQuote);
    }

    // 3. Trigger pending order evaluations immediately against the new ticking prices
    try {
      await processPendingOrders();
    } catch (err) {
      console.error("[PROCESSOR] Error processing pending orders in live tick:", err.message);
    }
  }, 1500);
};

/**
 * Broadcast symbol quote update to all subscribed clients.
 */
const broadcastQuote = (symbol, quote) => {
  const clients = subscriptions.get(symbol);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    type: "price_update",
    ...quote,
  });

  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  }
};
