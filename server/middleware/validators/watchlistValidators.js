/**
 * Validation rules for watchlist endpoints.
 *
 * Each exported function receives `req` and returns an array of error strings.
 * An empty array means all rules passed.
 */
import {
  required,
  isString,
  isValidSymbol,
  maxLength,
} from "./validationHelpers.js";

const COMPANY_NAME_MAX = 200;
const EXCHANGE_MAX = 50;

/**
 * Validate POST /api/watchlist
 * Fields: symbol, companyName, exchange
 */
export const validateAddToWatchlist = (req) => {
  const errors = [];
  const { symbol, companyName, exchange } = req.body ?? {};

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

  // exchange
  errors.push(required(exchange, "Exchange"));
  if (exchange !== undefined) {
    errors.push(isString(exchange, "Exchange"));
    errors.push(maxLength(exchange, "Exchange", EXCHANGE_MAX));
  }

  return errors.filter(Boolean);
};

/**
 * Validate DELETE /api/watchlist/:symbol
 * Validates the URL parameter, not a body.
 */
export const validateRemoveFromWatchlist = (req) => {
  const errors = [];
  const { symbol } = req.params ?? {};

  errors.push(required(symbol, "Symbol"));
  if (symbol !== undefined && symbol !== null) {
    errors.push(isValidSymbol(symbol, "Symbol"));
  }

  return errors.filter(Boolean);
};
