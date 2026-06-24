/**
 * Validation rules for trade endpoints.
 *
 * Each exported function receives `req` and returns an array of error strings.
 * An empty array means all rules passed.
 *
 * NOTE: The server always resolves the authoritative price — `price` is never
 * validated here because it must never influence server-side execution.
 */
import {
  required,
  isString,
  isValidSymbol,
  isInteger,
  greaterThan,
  atMost,
  maxLength,
} from "./validationHelpers.js";

// A single order must not exceed this quantity.
// This is a sanity guard, not a business rule — adjust as needed.
const MAX_QUANTITY = 100_000;
const COMPANY_NAME_MAX = 200;

/**
 * Shared validation for both BUY and SELL orders.
 * Fields: symbol, companyName, quantity
 */
const validateTradePayload = (req) => {
  const errors = [];
  const { symbol, companyName, quantity } = req.body ?? {};

  // symbol
  errors.push(required(symbol, "Symbol"));
  if (symbol !== undefined && symbol !== null) {
    errors.push(isString(symbol, "Symbol"));
    errors.push(isValidSymbol(symbol, "Symbol"));
  }

  // companyName
  errors.push(required(companyName, "Company name"));
  if (companyName !== undefined) {
    errors.push(isString(companyName, "Company name"));
    errors.push(maxLength(companyName, "Company name", COMPANY_NAME_MAX));
  }

  // quantity — must be present, a whole number, > 0, and within bounds
  errors.push(required(quantity, "Quantity"));
  if (quantity !== undefined && quantity !== null) {
    const qErr = isInteger(quantity, "Quantity");
    errors.push(qErr);
    if (!qErr) {
      errors.push(greaterThan(quantity, "Quantity", 0));
      errors.push(atMost(quantity, "Quantity", MAX_QUANTITY));
    }
  }

  return errors.filter(Boolean);
};

/**
 * Validate POST /api/trades/buy
 */
export const validateBuyOrder = validateTradePayload;

/**
 * Validate POST /api/trades/sell
 */
export const validateSellOrder = validateTradePayload;
