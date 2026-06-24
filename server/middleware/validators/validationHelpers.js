/**
 * Shared validation primitives used across all domain validators.
 *
 * All rules return either a string (the error message) or null (pass).
 * Validators compose these rules and collect errors into an array.
 */

// ---------------------------------------------------------------------------
// Individual rule functions
// ---------------------------------------------------------------------------

/** Field must be a non-empty string after trimming. */
export const required = (value, label) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return `${label} is required.`;
  }
  return null;
};

/** Field must be a string type (after coercion check). */
export const isString = (value, label) => {
  if (typeof value !== "string") {
    return `${label} must be a string.`;
  }
  return null;
};

/** Field must be at most `max` characters. */
export const maxLength = (value, label, max) => {
  if (typeof value === "string" && value.length > max) {
    return `${label} must be at most ${max} characters.`;
  }
  return null;
};

/** Field must be at least `min` characters. */
export const minLength = (value, label, min) => {
  if (typeof value === "string" && value.trim().length < min) {
    return `${label} must be at least ${min} characters.`;
  }
  return null;
};

/**
 * Basic RFC-5322-inspired email validation.
 * Accepts: local@domain.tld  (does not allow IP literals or comments).
 * Rejects obvious non-emails without relying on a library.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (value, label) => {
  if (typeof value !== "string" || !EMAIL_RE.test(value.trim())) {
    return `${label} must be a valid email address.`;
  }
  return null;
};

/**
 * Stock symbol: 1–10 uppercase letters, digits, dots, or hyphens.
 * Rejects whitespace, scripts, and obviously invalid tokens.
 */
const SYMBOL_RE = /^[A-Z0-9.\-]{1,10}$/;
export const isValidSymbol = (value, label) => {
  const normalised = String(value || "").trim().toUpperCase();
  if (!SYMBOL_RE.test(normalised)) {
    return `${label} must be a valid stock ticker (1–10 alphanumeric characters).`;
  }
  return null;
};

/** Value must be a finite number. */
export const isFiniteNumber = (value, label) => {
  if (!Number.isFinite(Number(value))) {
    return `${label} must be a number.`;
  }
  return null;
};

/** Value must be a whole (integer) number. */
export const isInteger = (value, label) => {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    return `${label} must be a whole number.`;
  }
  return null;
};

/** Value must be strictly greater than `min`. */
export const greaterThan = (value, label, min) => {
  if (Number(value) <= min) {
    return `${label} must be greater than ${min}.`;
  }
  return null;
};

/** Value must be at most `max`. */
export const atMost = (value, label, max) => {
  if (Number(value) > max) {
    return `${label} must be at most ${max}.`;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Response helper
// ---------------------------------------------------------------------------

/**
 * Build a standard 400 validation-error response.
 *
 * Shape:
 *   { success: false, message: "Validation failed.", errors: ["...", "..."] }
 */
export const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors,
  });
};

/**
 * Middleware factory — runs a validation function against req, collects errors,
 * and either calls next() or returns a 400 response.
 *
 * Usage:
 *   router.post("/buy", protect, validate(tradeValidator), buyStock);
 *
 * @param {function(req): string[]} validateFn - receives req, returns array of error strings
 */
export const validate = (validateFn) => (req, res, next) => {
  const errors = validateFn(req);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};
