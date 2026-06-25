import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import {
  authLimiter,
  tradeLimiter,
  watchlistLimiter,
  generalLimiter,
} from "./middleware/rateLimiter.js";
import {
  startOrderProcessor,
  stopOrderProcessor,
} from "./services/limitOrderService.js";
import {
  startWebSocketServer,
  stopWebSocketServer as stopWSServer,
} from "./services/socketService.js";

// ---------------------------------------------------------------------------
// Process-level safety — must be registered before anything else so that
// uncaught errors during startup are also captured.
// ---------------------------------------------------------------------------

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception — shutting down.", err);
  // Allow in-flight I/O to flush, then exit with a non-zero code so the
  // process manager (PM2, systemd, Docker) will restart the service.
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[FATAL] Unhandled Promise Rejection — shutting down.",
    promise,
    "Reason:",
    reason
  );
  // Shut down gracefully — throw so the uncaughtException handler above
  // takes over for uniform exit-code handling.
  throw reason;
});

// ---------------------------------------------------------------------------
// App bootstrap
// ---------------------------------------------------------------------------

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
const clientDist = path.join(__dirname, "..", "client", "dist");

const app = express();

// Trust the first proxy hop (Replit / Render load balancer) so that
// req.ip reflects the real client IP, making rate limiting effective.
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Security headers — helmet sets X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security, X-DNS-Prefetch-Control, and more.
// Must be applied before routes so every response is covered.
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? [process.env.CLIENT_ORIGIN]
  : [
      "http://localhost:5000",
      "http://localhost:5173",
      /\.replit\.dev$/,
      /\.repl\.co$/,
      /\.replit\.app$/,
    ];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Body parsers
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// General safety-net limiter — applied first so ALL /api/* routes inherit it.
// Specific tighter limiters are applied per-route below and take precedence
// because express-rate-limit tracks windows per-instance (not globally).
// ---------------------------------------------------------------------------
app.use("/api", generalLimiter);

// ---------------------------------------------------------------------------
// Routes — specific limiters are mounted inline before the route handlers.
// ---------------------------------------------------------------------------

// Health check — dev only; in production the root serves the React app.
// Load balancers should target /api/health instead.
if (!isProduction) {
  app.get("/", (req, res) => {
    res.status(200).json({ success: true, message: "TradeX API Running" });
  });
}

// Dedicated health check always available regardless of environment
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "TradeX API Running" });
});

// Auth — tightest limits (brute-force protection)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRoutes);

// Stocks — covered by generalLimiter (read-only, no financial impact)
app.use("/api/stocks", stockRoutes);

// Trades — dedicated limiter for financial mutation endpoints
app.use("/api/trades", tradeLimiter, tradeRoutes);

// Watchlist — dedicated limiter for mutation endpoints
app.use("/api/watchlist", watchlistLimiter, watchlistRoutes);

// Analytics — covered by generalLimiter
app.use("/api/analytics", analyticsRoutes);

// Alerts — covered by generalLimiter
app.use("/api/alerts", alertRoutes);

// ---------------------------------------------------------------------------
// Static files + SPA catch-all (production only)
// In development the Vite dev server handles the frontend; Express only
// handles /api/* routes, so this block is skipped entirely.
// ---------------------------------------------------------------------------
if (isProduction) {
  // Serve built React assets (JS, CSS, images, etc.)
  app.use(express.static(clientDist));

  // Any non-/api route returns index.html so React Router works correctly
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// 404 — only reached by unmatched /api/* routes.
// Returns JSON so clients always get a parseable body.
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errors: [],
  });
});

// ---------------------------------------------------------------------------
// Global error handler — MUST be last (4-argument signature required by Express).
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    startOrderProcessor();
    startWebSocketServer(server);

    const shutdown = () => {
      stopOrderProcessor();
      stopWSServer();
      server.close(() => process.exit(0));
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("❌ Server failed to start due to database connection error.");
    process.exit(1);
  }
};

startServer();
