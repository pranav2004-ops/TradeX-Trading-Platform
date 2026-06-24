/**
 * Rate limiters for TradeX API endpoints.
 *
 * Uses express-rate-limit (in-memory store, suitable for single-process deployments).
 * All limiters share a consistent error response shape matching the global error format.
 *
 * Limits are intentionally conservative enough to protect against brute-force
 * and abuse without impacting legitimate users on a normal trading session.
 */

import rateLimit from "express-rate-limit";

/**
 * Common handler used across all limiters for consistent error format.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please slow down and try again later.",
    errors: [],
  });
};

/**
 * Auth limiter — applied to /api/auth/login and /api/auth/register.
 *
 * 10 attempts per 15-minute window per IP.
 * Protects against credential brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
});

/**
 * Trade limiter — applied to /api/trades/buy and /api/trades/sell.
 *
 * 60 trade submissions per 15-minute window per IP.
 * A legitimate active trader making several trades per minute is well within this.
 * Prevents automated trading-engine abuse.
 */
export const tradeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Watchlist limiter — applied to watchlist mutation endpoints.
 *
 * 60 mutations per 15-minute window per IP.
 */
export const watchlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * General API limiter — applied globally to all /api/* routes.
 *
 * 200 requests per minute per IP — a safety net for any endpoint
 * not covered by a specific limiter above.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
