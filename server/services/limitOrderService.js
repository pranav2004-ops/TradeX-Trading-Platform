/**
 * limitOrderService.js
 *
 * Handles the full lifecycle of LIMIT orders:
 *   - createLimitOrder()      — place a new PENDING limit order
 *   - cancelLimitOrder()      — cancel a PENDING order, refund reserved funds
 *   - processPendingOrders()  — check price conditions and fill ready orders
 *   - startOrderProcessor()   — start 60-second polling interval
 *   - stopOrderProcessor()    — stop the polling interval (clean shutdown)
 *
 * Reuses execution helpers from tradingEngineService to avoid duplication.
 */

import mongoose from "mongoose";
import User from "../models/user.js";
import Trade from "../models/TradeModel.js";
import Holding from "../models/HoldingModel.js";
import {
  fetchAuthoritativePrice,
  normalizeOrderInput,
  runTradeTransaction,
  createPortfolioSnapshot,
  applyBuyToHoldings,
  applySellToHoldings,
} from "./tradingEngineService.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/**
 * Append a status transition to statusHistory and update the top-level status.
 * Must be called inside a session when used within a transaction.
 */
const pushStatus = (order, status, note = "") => {
  order.status = status;
  order.statusHistory.push({ status, timestamp: new Date(), note });
};

// ─────────────────────────────────────────────────────────────────────────────
// Create Limit Order
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createLimitOrder
 *
 * Places a new LIMIT order in PENDING state.
 *
 * BUY:  Reserves funds immediately (quantity × limitPrice deducted from cash).
 *       If insufficient cash → rejects with 400.
 *
 * SELL: Verifies the user holds sufficient quantity.
 *       Holdings are NOT deducted until execution.
 *       If holding insufficient → rejects with 400.
 *
 * @param {{ user, symbol, companyName, quantity, action, limitPrice }} payload
 */
const createLimitOrder = async (payload) => {
  const input = normalizeOrderInput(payload);
  const { action } = payload;
  const normalizedAction = String(action || "").trim().toUpperCase();

  if (normalizedAction !== "BUY" && normalizedAction !== "SELL") {
    const err = new Error("Action must be BUY or SELL.");
    err.statusCode = 400;
    throw err;
  }

  const limitPrice = toNumber(payload.limitPrice);
  if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
    const err = new Error("Limit price must be a positive number.");
    err.statusCode = 400;
    throw err;
  }

  const reservedAmount = input.quantity * limitPrice;
  const now = new Date();

  if (normalizedAction === "BUY") {
    return runTradeTransaction(async (session) => {
      const user = await User.findById(input.user).session(session);
      if (!user) throw new Error("User not found");

      if (user.cash < reservedAmount) {
        const err = new Error(
          `Insufficient cash balance. Required: ₹${reservedAmount.toFixed(2)}, Available: ₹${user.cash.toFixed(2)}`
        );
        err.statusCode = 400;
        throw err;
      }

      // Reserve the funds
      user.cash -= reservedAmount;
      await user.save({ session });

      const order = await Trade.create(
        [
          {
            user: input.user,
            symbol: input.symbol,
            companyName: input.companyName,
            action: "BUY",
            quantity: input.quantity,
            orderType: "LIMIT",
            status: "PENDING",
            limitPrice,
            reservedAmount,
            statusHistory: [
              {
                status: "PENDING",
                timestamp: now,
                note: `Limit buy placed @ ₹${limitPrice}. Reserved ₹${reservedAmount.toFixed(2)}.`,
              },
            ],
          },
        ],
        { session }
      );

      console.info(
        `[LIMIT] BUY order created — ${input.symbol} @ ₹${limitPrice}, qty: ${input.quantity}, user: ${input.user}`
      );

      return { order: order[0], reservedAmount, cash: user.cash };
    });
  }

  // ── LIMIT SELL ─────────────────────────────────────────────────────────────
  return runTradeTransaction(async (session) => {
    const user = await User.findById(input.user).session(session);
    if (!user) throw new Error("User not found");

    // Verify ownership at placement time (re-verified at execution)
    const holding = await Holding.findOne({
      user: input.user,
      symbol: input.symbol,
    }).session(session);

    if (!holding) {
      const err = new Error(
        `You do not hold any shares of ${input.symbol}.`
      );
      err.statusCode = 400;
      throw err;
    }

    if (holding.quantity < input.quantity) {
      const err = new Error(
        `Insufficient quantity. You hold ${holding.quantity} share(s) of ${input.symbol}, requested ${input.quantity}.`
      );
      err.statusCode = 400;
      throw err;
    }

    const order = await Trade.create(
      [
        {
          user: input.user,
          symbol: input.symbol,
          companyName: input.companyName,
          action: "SELL",
          quantity: input.quantity,
          orderType: "LIMIT",
          status: "PENDING",
          limitPrice,
          reservedAmount: 0,
          statusHistory: [
            {
              status: "PENDING",
              timestamp: now,
              note: `Limit sell placed @ ₹${limitPrice}.`,
            },
          ],
        },
      ],
      { session }
    );

    console.info(
      `[LIMIT] SELL order created — ${input.symbol} @ ₹${limitPrice}, qty: ${input.quantity}, user: ${input.user}`
    );

    return { order: order[0], reservedAmount: 0, cash: user.cash };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Limit Order
// ─────────────────────────────────────────────────────────────────────────────

/**
 * cancelLimitOrder
 *
 * Cancels a PENDING limit order and refunds reserved cash for BUY orders.
 *
 * @param {string} orderId  — Trade._id
 * @param {string} userId   — requesting user's id
 */
const cancelLimitOrder = async (orderId, userId) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const order = await Trade.findById(orderId).session(session);

      if (!order) {
        const err = new Error("Order not found.");
        err.statusCode = 404;
        throw err;
      }

      // Ownership check
      if (order.user.toString() !== String(userId)) {
        const err = new Error("You are not authorised to cancel this order.");
        err.statusCode = 403;
        throw err;
      }

      // Only PENDING orders can be cancelled
      if (order.status !== "PENDING") {
        const err = new Error(
          `Cannot cancel an order with status "${order.status}". Only PENDING orders can be cancelled.`
        );
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();
      pushStatus(order, "CANCELLED", "Cancelled by user.");
      order.cancelledAt = now;

      let cashAfter = null;

      // Refund reserved funds for BUY orders
      if (order.action === "BUY" && order.reservedAmount > 0) {
        const user = await User.findById(userId).session(session);
        if (user) {
          user.cash += order.reservedAmount;
          await user.save({ session });
          cashAfter = user.cash;

          order.statusHistory[order.statusHistory.length - 1].note +=
            ` Refunded ₹${order.reservedAmount.toFixed(2)}.`;
        }
      }

      await order.save({ session });

      console.info(
        `[LIMIT] Order cancelled — ${order.symbol} ${order.action} @ ₹${order.limitPrice}, user: ${userId}`
      );

      result = { order, cashAfter };
    });

    return result;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Execute a single filled order (called by processor)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * executeFilledOrder
 *
 * Executes a limit order whose price condition has been met.
 * Runs inside a MongoDB transaction for atomicity.
 *
 * BUY execution:
 *   - executedPrice is the current market price (≤ limitPrice)
 *   - totalAmount = quantity × executedPrice
 *   - Difference (reservedAmount - totalAmount) is refunded to user.cash
 *   - Holdings are upserted
 *   - Portfolio snapshot created
 *
 * SELL execution:
 *   - executedPrice is the current market price (≥ limitPrice)
 *   - totalAmount = quantity × executedPrice
 *   - Proceeds credited to user.cash
 *   - Holdings decremented
 *   - Portfolio snapshot created
 *
 * @param {mongoose.Document} order         — the Trade document (PENDING)
 * @param {number}            executedPrice — the server-resolved authoritative price
 */
const executeFilledOrder = async (order, executedPrice) => {
  return runTradeTransaction(async (session) => {
    // Re-fetch the order inside the transaction to prevent race conditions
    const lockedOrder = await Trade.findById(order._id).session(session);

    if (!lockedOrder || lockedOrder.status !== "PENDING") {
      // Already executed or cancelled by a concurrent run — skip
      return null;
    }

    const user = await User.findById(lockedOrder.user).session(session);
    if (!user) throw new Error("User not found during limit order execution");

    const input = {
      user: lockedOrder.user.toString(),
      symbol: lockedOrder.symbol,
      companyName: lockedOrder.companyName,
      quantity: lockedOrder.quantity,
    };

    const totalAmount = lockedOrder.quantity * executedPrice;
    const now = new Date();

    if (lockedOrder.action === "BUY") {
      // Refund difference between reserved amount and actual cost
      const refund = lockedOrder.reservedAmount - totalAmount;
      if (refund > 0) {
        user.cash += refund;
      }

      await applyBuyToHoldings(session, input, executedPrice);
    } else {
      // SELL — verify holdings still sufficient (user may have sold manually)
      const holding = await Holding.findOne({
        user: lockedOrder.user,
        symbol: lockedOrder.symbol,
      }).session(session);

      if (!holding || holding.quantity < lockedOrder.quantity) {
        // Reject — not enough shares to sell
        pushStatus(lockedOrder, "REJECTED", "Insufficient holdings at execution time.");
        lockedOrder.rejectionReason = "Insufficient holdings at execution time.";
        await lockedOrder.save({ session });

        console.warn(
          `[LIMIT] SELL order REJECTED — ${lockedOrder.symbol}, insufficient holdings, user: ${lockedOrder.user}`
        );
        return null;
      }

      await applySellToHoldings(session, input);
      user.cash += totalAmount;
    }

    await user.save({ session });

    // Update the order record
    pushStatus(lockedOrder, "EXECUTED", `Filled @ ₹${executedPrice}. Total: ₹${totalAmount.toFixed(2)}.`);
    lockedOrder.price = executedPrice;
    lockedOrder.executedPrice = executedPrice;
    lockedOrder.totalAmount = totalAmount;
    lockedOrder.executedAt = now;
    await lockedOrder.save({ session });

    await createPortfolioSnapshot(lockedOrder.user.toString(), user.cash, session);

    console.info(
      `[LIMIT] ${lockedOrder.action} order EXECUTED — ${lockedOrder.symbol} @ ₹${executedPrice}, qty: ${lockedOrder.quantity}, user: ${lockedOrder.user}`
    );

    return lockedOrder;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Order Processor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * processPendingOrders
 *
 * Fetches all PENDING LIMIT orders, resolves current market prices,
 * and executes any orders whose price condition is satisfied.
 *
 * Limit BUY rule:  execute when marketPrice <= limitPrice
 * Limit SELL rule: execute when marketPrice >= limitPrice
 *
 * Each order is processed independently — a failure on one does not
 * block others.
 */
const processPendingOrders = async () => {
  try {
    const pendingOrders = await Trade.find({
      status: "PENDING",
      orderType: "LIMIT",
    });

    if (pendingOrders.length === 0) return;

    console.info(`[PROCESSOR] Checking ${pendingOrders.length} pending limit order(s)...`);

    // Group by symbol to minimise API calls
    const symbolSet = [...new Set(pendingOrders.map((o) => o.symbol))];

    // Fetch prices in parallel — skip symbols where quote fails
    const priceMap = {};
    await Promise.all(
      symbolSet.map(async (symbol) => {
        try {
          const price = await fetchAuthoritativePrice(symbol);
          priceMap[symbol] = price;
        } catch (err) {
          console.warn(`[PROCESSOR] Could not fetch price for ${symbol}: ${err.message}`);
        }
      })
    );

    // Evaluate each order
    for (const order of pendingOrders) {
      const marketPrice = priceMap[order.symbol];

      if (marketPrice === undefined) continue; // quote unavailable, skip

      const shouldExecute =
        order.action === "BUY"
          ? marketPrice <= order.limitPrice  // BUY: execute when market drops to/below limit
          : marketPrice >= order.limitPrice; // SELL: execute when market rises to/above limit

      if (!shouldExecute) continue;

      console.info(
        `[PROCESSOR] Condition met — ${order.action} ${order.symbol}: market ₹${marketPrice} vs limit ₹${order.limitPrice}`
      );

      try {
        await executeFilledOrder(order, marketPrice);
      } catch (err) {
        console.error(
          `[PROCESSOR] Failed to execute order ${order._id} (${order.symbol}): ${err.message}`
        );
      }
    }
  } catch (err) {
    console.error(`[PROCESSOR] Unexpected error during pending order processing: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Interval management
// ─────────────────────────────────────────────────────────────────────────────

const PROCESSOR_INTERVAL_MS = 60 * 1000; // 60 seconds
let processorTimer = null;

/**
 * Start the order processor polling loop.
 * Should be called once after the database connection is established.
 */
const startOrderProcessor = () => {
  if (processorTimer) return; // already running

  console.info(`[PROCESSOR] Order processor started — checking every ${PROCESSOR_INTERVAL_MS / 1000}s`);

  // Run immediately on start, then on interval
  processPendingOrders();
  processorTimer = setInterval(processPendingOrders, PROCESSOR_INTERVAL_MS);
};

/**
 * Stop the order processor polling loop.
 * Called during graceful shutdown.
 */
const stopOrderProcessor = () => {
  if (processorTimer) {
    clearInterval(processorTimer);
    processorTimer = null;
    console.info("[PROCESSOR] Order processor stopped.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  createLimitOrder,
  cancelLimitOrder,
  processPendingOrders,
  startOrderProcessor,
  stopOrderProcessor,
};
