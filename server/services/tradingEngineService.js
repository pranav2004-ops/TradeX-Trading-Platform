import mongoose from "mongoose";
import User from "../models/user.js";
import Trade from "../models/TradeModel.js";
import Holding from "../models/HoldingModel.js";
import PortfolioSnapshot from "../models/PortfolioSnapshot.js";
import { getStockQuote } from "./stockService.js";
import { sendSimulatedEmail } from "../utils/emailService.js";

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/**
 * Parse the authoritative price from the normalized quote response..
 * Throws if the price is missing or non-positive.
 */
const parseAuthoritativePrice = (symbol, data) => {
  const quote = data?.["Global Quote"] || {};
  const price = Number(quote["05. price"]);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(
      `Unable to fetch authoritative market price for ${symbol}. Trade rejected.`
    );
  }

  return price;
};

/**
 * Fetch the server-side authoritative price for a symbol.
 * On failure, throws — trade execution must never fall back to a client price.
 */
const fetchAuthoritativePrice = async (symbol) => {
  try {
    const data = await getStockQuote(symbol);
    return parseAuthoritativePrice(symbol, data);
  } catch (err) {
    throw new Error(
      `Quote unavailable for ${symbol}: ${err.message}. Trade rejected.`
    );
  }
};

/**
 * Normalise and validate the shared order input fields that come from
 * the client (symbol, companyName, quantity).
 * NOTE: `price` is intentionally excluded — price is always server-resolved.
 */
const normalizeOrderInput = ({ user, symbol, companyName, quantity }) => {
  const normalizedUser = user?.toString?.() || String(user || "");
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const normalizedCompanyName = String(companyName || "").trim();
  const normalizedQuantity = toNumber(quantity);

  if (!normalizedUser) throw new Error("User is required");
  if (!normalizedSymbol) throw new Error("Symbol is required");
  if (!normalizedCompanyName) throw new Error("Company name is required");

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error("Quantity must be a whole number greater than 0");
  }

  return {
    user: normalizedUser,
    symbol: normalizedSymbol,
    companyName: normalizedCompanyName,
    quantity: normalizedQuantity,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Transaction runner
// ─────────────────────────────────────────────────────────────────────────────

const runTradeTransaction = async (executor) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await executor(session);
    });

    return result;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio snapshot
// ─────────────────────────────────────────────────────────────────────────────

const createPortfolioSnapshot = async (userId, cashBalance, session) => {
  const holdings = await Holding.find({ user: userId }).session(session);
  const investedAmount = holdings.reduce(
    (total, holding) => total + holding.investedAmount,
    0
  );

  const snapshots = await PortfolioSnapshot.create(
    [
      {
        user: userId,
        portfolioValue: cashBalance + investedAmount,
        cashBalance,
        investedAmount,
      },
    ],
    { session }
  );

  return snapshots[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared holding mutation helpers (reused by both market and limit execution)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a holding after a BUY fill.
 * Called inside an active Mongoose session/transaction.
 */
const round2 = (n) => Math.round(n * 100) / 100;

export const applyBuyToHoldings = async (session, input, executedPrice) => {
  const totalAmount = round2(input.quantity * executedPrice);

  const existingHolding = await Holding.findOne({
    user: input.user,
    symbol: input.symbol,
  }).session(session);

  if (!existingHolding) {
    const created = await Holding.create(
      [
        {
          user: input.user,
          symbol: input.symbol,
          companyName: input.companyName,
          quantity: input.quantity,
          averagePrice: round2(executedPrice),
          investedAmount: totalAmount,
        },
      ],
      { session }
    );
    return created[0];
  }

  const newQuantity = existingHolding.quantity + input.quantity;
  const newInvestedAmount = round2(existingHolding.investedAmount + totalAmount);
  const newAveragePrice = round2(newInvestedAmount / newQuantity);

  existingHolding.companyName = input.companyName;
  existingHolding.quantity = newQuantity;
  existingHolding.averagePrice = newAveragePrice;
  existingHolding.investedAmount = newInvestedAmount;
  await existingHolding.save({ session });

  return existingHolding;
};

/**
 * Decrement a holding after a SELL fill.
 * Called inside an active Mongoose session/transaction.
 * Returns the remaining holding (or null if fully sold) along with the originalAveragePrice.
 */
export const applySellToHoldings = async (session, input) => {
  const holding = await Holding.findOne({
    user: input.user,
    symbol: input.symbol,
  }).session(session);

  if (!holding) throw new Error("Holding not found");
  if (holding.quantity < input.quantity) {
    throw new Error("Insufficient quantity to sell");
  }

  const originalAveragePrice = holding.averagePrice;
  const remainingQuantity = holding.quantity - input.quantity;

  if (remainingQuantity === 0) {
    await Holding.deleteOne({ _id: holding._id }).session(session);
    return { remainingHolding: null, originalAveragePrice };
  }

  holding.quantity = remainingQuantity;
  holding.investedAmount = round2(holding.averagePrice * remainingQuantity);
  await holding.save({ session });

  return { remainingHolding: holding, originalAveragePrice };
};

// ─────────────────────────────────────────────────────────────────────────────
// Market order execution (unchanged public API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute a MARKET BUY trade immediately.
 *
 * @param {object} payload - { user, symbol, companyName, quantity, clientDisplayPrice? }
 */
const buyTrade = async (payload) => {
  const input = normalizeOrderInput(payload);

  if (payload.clientDisplayPrice !== undefined) {
    console.info(
      `[AUDIT] BUY ${input.symbol} — client display price: ${payload.clientDisplayPrice}, user: ${input.user}`
    );
  }

  const authoritativePrice = await fetchAuthoritativePrice(input.symbol);

  console.info(
    `[TRADE] BUY ${input.symbol} — server-resolved price: ${authoritativePrice}, qty: ${input.quantity}, user: ${input.user}`
  );

  const totalAmount = input.quantity * authoritativePrice;
  const now = new Date();

  return runTradeTransaction(async (session) => {
    const user = await User.findById(input.user).session(session);

    if (!user) throw new Error("User not found");
    if (user.cash < totalAmount) throw new Error("Insufficient cash balance");

    const trade = await Trade.create(
      [
        {
          user: input.user,
          symbol: input.symbol,
          companyName: input.companyName,
          action: "BUY",
          quantity: input.quantity,
          orderType: "MARKET",
          status: "EXECUTED",
          price: authoritativePrice,
          executedPrice: authoritativePrice,
          totalAmount,
          executedAt: now,
          statusHistory: [{ status: "EXECUTED", timestamp: now, note: "Market order filled immediately" }],
        },
      ],
      { session }
    );

    const holding = await applyBuyToHoldings(session, input, authoritativePrice);

    user.cash = Math.round((user.cash - totalAmount) * 100) / 100;
    await user.save({ session });
    await createPortfolioSnapshot(input.user, user.cash, session);

    return {
      trade: trade[0],
      holding,
      cash: user.cash,
      totalAmount,
    };
  });

  // Send simulated email asynchronously outside transaction
  User.findById(payload.user).select("email").then((u) => {
    if (u && u.email) {
      sendSimulatedEmail(
        u.email,
        `Order Filled: BUY ${res.trade.symbol}`,
        `Your BUY Market Order was executed!`,
        {
          "Symbol": res.trade.symbol,
          "Company": res.trade.companyName,
          "Action": "BUY",
          "Quantity": res.trade.quantity,
          "Execution Price": `₹${res.trade.executedPrice.toFixed(2)}`,
          "Total Cost": `₹${res.trade.totalAmount.toFixed(2)}`,
          "Status": "EXECUTED",
          "Executed At": new Date(res.trade.executedAt).toLocaleString("en-IN"),
        }
      ).catch((err) => console.error("Email simulation failed:", err));
    }
  });

  return res;
};

/**
 * Execute a MARKET SELL trade immediately.
 *
 * @param {object} payload - { user, symbol, companyName, quantity, clientDisplayPrice? }
 */
const sellTrade = async (payload) => {
  const input = normalizeOrderInput(payload);

  if (payload.clientDisplayPrice !== undefined) {
    console.info(
      `[AUDIT] SELL ${input.symbol} — client display price: ${payload.clientDisplayPrice}, user: ${input.user}`
    );
  }

  const authoritativePrice = await fetchAuthoritativePrice(input.symbol);

  console.info(
    `[TRADE] SELL ${input.symbol} — server-resolved price: ${authoritativePrice}, qty: ${input.quantity}, user: ${input.user}`
  );

  const totalAmount = input.quantity * authoritativePrice;
  const now = new Date();

  return runTradeTransaction(async (session) => {
    const user = await User.findById(input.user).session(session);
    if (!user) throw new Error("User not found");

    const { remainingHolding, originalAveragePrice } = await applySellToHoldings(session, input);
    const realizedPnL = Math.round(input.quantity * (authoritativePrice - originalAveragePrice) * 100) / 100;

    const trade = await Trade.create(
      [
        {
          user: input.user,
          symbol: input.symbol,
          companyName: input.companyName,
          action: "SELL",
          quantity: input.quantity,
          orderType: "MARKET",
          status: "EXECUTED",
          price: authoritativePrice,
          executedPrice: authoritativePrice,
          totalAmount,
          realizedPnL,
          executedAt: now,
          statusHistory: [{ status: "EXECUTED", timestamp: now, note: `Market order filled immediately. Realised P&L: ₹${realizedPnL.toFixed(2)}.` }],
        },
      ],
      { session }
    );

    user.cash = Math.round((user.cash + totalAmount) * 100) / 100;
    await user.save({ session });
    await createPortfolioSnapshot(input.user, user.cash, session);

    return {
      trade: trade[0],
      holding: remainingHolding,
      cash: user.cash,
      totalAmount,
    };
  });

  // Send simulated email asynchronously outside transaction
  User.findById(payload.user).select("email").then((u) => {
    if (u && u.email) {
      sendSimulatedEmail(
        u.email,
        `Order Filled: SELL ${res.trade.symbol}`,
        `Your SELL Market Order was executed!`,
        {
          "Symbol": res.trade.symbol,
          "Company": res.trade.companyName,
          "Action": "SELL",
          "Quantity": res.trade.quantity,
          "Execution Price": `₹${res.trade.executedPrice.toFixed(2)}`,
          "Total Credit": `₹${res.trade.totalAmount.toFixed(2)}`,
          "Realised P&L": `₹${res.trade.realizedPnL.toFixed(2)}`,
          "Status": "EXECUTED",
          "Executed At": new Date(res.trade.executedAt).toLocaleString("en-IN"),
        }
      ).catch((err) => console.error("Email simulation failed:", err));
    }
  });

  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio query helpers (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const getHoldingsByUser = async (userId) => {
  return Holding.find({ user: userId }).sort({ updatedAt: -1 });
};

const getSummaryByUser = async (userId) => {
  const [user, holdings] = await Promise.all([
    User.findById(userId).select("cash"),
    Holding.find({ user: userId }),
  ]);

  if (!user) throw new Error("User not found");

  const investedAmount = holdings.reduce(
    (total, holding) => total + holding.investedAmount,
    0
  );

  const totalPositions = holdings.reduce(
    (total, holding) => total + holding.quantity,
    0
  );

  return {
    cash: user.cash,
    investedAmount,
    totalPositions,
    holdingsCount: holdings.length,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  buyTrade,
  sellTrade,
  getHoldingsByUser,
  getSummaryByUser,
  // Internal helpers also exported for limitOrderService
  fetchAuthoritativePrice,
  normalizeOrderInput,
  runTradeTransaction,
  createPortfolioSnapshot,
};
