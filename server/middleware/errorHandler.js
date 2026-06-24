/**
 * Centralized Express error handler.
 *
 * Must be registered LAST in server.js (after all routes).
 * Express identifies it as an error handler because it has 4 parameters: (err, req, res, next).
 *
 * Response shape (always JSON, never HTML):
 * {
 *   success: false,
 *   message: "Human-readable description",
 *   errors: []           // present on validation failures, empty otherwise
 * }
 *
 * Stack traces are only logged/included in NODE_ENV !== "production".
 */

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Classify an error and return { statusCode, message, errors }.
 */
const classifyError = (err) => {
  // -------------------------------------------------------------------
  // Validation errors from our own middleware (already have errors array)
  // -------------------------------------------------------------------
  if (err.statusCode === 400 && Array.isArray(err.errors)) {
    return {
      statusCode: 400,
      message: err.message || "Validation failed.",
      errors: err.errors,
    };
  }

  // -------------------------------------------------------------------
  // MongoDB duplicate key (e.g. unique email or watchlist symbol)
  // -------------------------------------------------------------------
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return {
      statusCode: 409,
      message: `A record with this ${field} already exists.`,
      errors: [],
    };
  }

  // -------------------------------------------------------------------
  // Mongoose validation error (schema-level)
  // -------------------------------------------------------------------
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return {
      statusCode: 400,
      message: "Validation failed.",
      errors,
    };
  }

  // -------------------------------------------------------------------
  // Mongoose CastError (invalid ObjectId etc.)
  // -------------------------------------------------------------------
  if (err.name === "CastError") {
    return {
      statusCode: 400,
      message: `Invalid value for field: ${err.path}.`,
      errors: [],
    };
  }

  // -------------------------------------------------------------------
  // JWT errors
  // -------------------------------------------------------------------
  if (err.name === "JsonWebTokenError") {
    return {
      statusCode: 401,
      message: "Invalid authentication token.",
      errors: [],
    };
  }

  if (err.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      message: "Authentication token has expired. Please log in again.",
      errors: [],
    };
  }

  // -------------------------------------------------------------------
  // Domain errors from trading engine / services
  // -------------------------------------------------------------------
  const msg = String(err.message || "");

  if (msg.includes("User not found") || msg.includes("Holding not found")) {
    return { statusCode: 404, message: msg, errors: [] };
  }

  if (
    msg.includes("Insufficient cash balance") ||
    msg.includes("Insufficient quantity to sell")
  ) {
    return { statusCode: 400, message: msg, errors: [] };
  }

  if (msg.includes("Quote unavailable") || msg.includes("Trade rejected")) {
    return {
      statusCode: 503,
      message: msg,
      errors: [],
    };
  }

  // -------------------------------------------------------------------
  // Known 4xx errors forwarded from controllers via next(err)
  // -------------------------------------------------------------------
  if (err.statusCode >= 400 && err.statusCode < 500) {
    return {
      statusCode: err.statusCode,
      message: err.message || "Bad request.",
      errors: [],
    };
  }

  // -------------------------------------------------------------------
  // Fallback: generic server error — never expose internals in production
  // -------------------------------------------------------------------
  return {
    statusCode: err.statusCode || 500,
    message: IS_PROD ? "An unexpected error occurred. Please try again." : (err.message || "Server error"),
    errors: [],
  };
};

/**
 * Global Express error middleware — 4-argument signature required by Express.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const { statusCode, message, errors } = classifyError(err);

  // Always log server errors (5xx) with full detail
  if (statusCode >= 500) {
    console.error(
      `[ERROR] ${req.method} ${req.originalUrl} → ${statusCode}`,
      IS_PROD ? err.message : err.stack
    );
  } else if (!IS_PROD) {
    // Log 4xx in dev for easier debugging
    console.warn(
      `[WARN] ${req.method} ${req.originalUrl} → ${statusCode}: ${message}`
    );
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export default errorHandler;
