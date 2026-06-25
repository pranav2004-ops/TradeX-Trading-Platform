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
import { sendSimulatedEmail } from "../utils/emailService.js";
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
// Create Pending Order (LIMIT, SL, SL-M, GTT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createPendingOrder
 *
 * Places a new pending order (LIMIT, SL, SL-M, GTT) in PENDING state.
 *
 * BUY:  Reserves funds immediately (except GTT which does not block cash).
 *       If insufficient cash → rejects with 400.
 *
 * SELL: Verifies the user holds sufficient quantity (warns for GTT, rejects for others).
 *
 * @param {{ user, symbol, companyName, quantity, action, orderType, limitPrice?, triggerPrice? }} payload
 */
const createPendingOrder = async (payload) => {
  const input = normalizeOrderInput(payload);
  const { action, orderType } = payload;
  const normalizedAction = String(action || "").trim().toUpperCase();
  const normalizedOrderType = String(orderType || "LIMIT").trim().toUpperCase();

  if (normalizedAction !== "BUY" && normalizedAction !== "SELL") {
    const err = new Error("Action must be BUY or SELL.");
    err.statusCode = 400;
    throw err;
  }

  if (!["LIMIT", "SL", "SL-M", "GTT"].includes(normalizedOrderType)) {
    const err = new Error("Invalid order type for pending order.");
    err.statusCode = 400;
    throw err;
  }

  const limitPrice = payload.limitPrice !== undefined && payload.limitPrice !== null ? toNumber(payload.limitPrice) : undefined;
  const triggerPrice = payload.triggerPrice !== undefined && payload.triggerPrice !== null ? toNumber(payload.triggerPrice) : undefined;

  // Validation
  if (normalizedOrderType === "LIMIT") {
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
      const err = new Error("Limit price must be a positive number.");
      err.statusCode = 400;
      throw err;
    }
  } else if (normalizedOrderType === "SL") {
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
      const err = new Error("Limit price must be a positive number.");
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) {
      const err = new Error("Trigger price must be a positive number.");
      err.statusCode = 400;
      throw err;
    }
  } else if (normalizedOrderType === "SL-M") {
    if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) {
      const err = new Error("Trigger price must be a positive number.");
      err.statusCode = 400;
      throw err;
    }
  } else if (normalizedOrderType === "GTT") {
    if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) {
      const err = new Error("Trigger price must be a positive number.");
      err.statusCode = 400;
      throw err;
    }
    if (limitPrice !== undefined && limitPrice !== null && (Number.isNaN(limitPrice) || limitPrice <= 0)) {
      const err = new Error("GTT limit price must be a positive number.");
      err.statusCode = 400;
      throw err;
    }
  }

  // Calculate reserved amount for BUY orders
  let reservedAmount = 0;
  if (normalizedAction === "BUY") {
    if (normalizedOrderType === "LIMIT" || normalizedOrderType === "SL") {
      reservedAmount = input.quantity * limitPrice;
    } else if (normalizedOrderType === "SL-M") {
      reservedAmount = input.quantity * triggerPrice;
    } else if (normalizedOrderType === "GTT") {
      reservedAmount = 0; // GTT does not block cash
    }
  }

  const now = new Date();

  // Handle BUY order
  if (normalizedAction === "BUY") {
    return runTradeTransaction(async (session) => {
      const user = await User.findById(input.user).session(session);
      if (!user) throw new Error("User not found");

      if (reservedAmount > 0) {
        if (user.cash < reservedAmount) {
          const err = new Error(
            `Insufficient cash balance. Required: ₹${reservedAmount.toFixed(2)}, Available: ₹${user.cash.toFixed(2)}`
          );
          err.statusCode = 400;
          throw err;
        }
        // Deduct/reserve the cash
        user.cash = Math.round((user.cash - reservedAmount) * 100) / 100;
        await user.save({ session });
      }

      const orderData = {
        user: input.user,
        symbol: input.symbol,
        companyName: input.companyName,
        action: "BUY",
        quantity: input.quantity,
        orderType: normalizedOrderType,
        status: "PENDING",
        reservedAmount,
        statusHistory: [
          {
            status: "PENDING",
            timestamp: now,
            note: `${normalizedOrderType} buy placed. Trigger: ${triggerPrice ? '₹' + triggerPrice : 'N/A'}, Limit: ${limitPrice ? '₹' + limitPrice : 'N/A'}. Reserved ₹${reservedAmount.toFixed(2)}.`,
          },
        ],
      };

      if (limitPrice !== undefined) orderData.limitPrice = limitPrice;
      if (triggerPrice !== undefined) orderData.triggerPrice = triggerPrice;

      const order = await Trade.create([orderData], { session });

      console.info(
        `[ORDER] BUY ${normalizedOrderType} created — ${input.symbol}, qty: ${input.quantity}, user: ${input.user}`
      );

      return { order: order[0], reservedAmount, cash: user.cash };
    });
  }

  // Handle SELL order
  return runTradeTransaction(async (session) => {
    const user = await User.findById(input.user).session(session);
    if (!user) throw new Error("User not found");

    // Soft ownership check at placement
    const holding = await Holding.findOne({
      user: input.user,
      symbol: input.symbol,
    }).session(session);

    if (normalizedOrderType !== "GTT") {
      // SL/SL-M/LIMIT SELL must block holdings (soft check, verified on exec)
      if (!holding) {
        const err = new Error(`You do not hold any shares of ${input.symbol}.`);
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
    } else {
      // GTT SELL soft check only
      if (!holding || holding.quantity < input.quantity) {
        console.warn(`[GTT WARNING] Placing GTT Sell order for ${input.symbol} but user currently holds insufficient quantity.`);
      }
    }

    const orderData = {
      user: input.user,
      symbol: input.symbol,
      companyName: input.companyName,
      action: "SELL",
      quantity: input.quantity,
      orderType: normalizedOrderType,
      status: "PENDING",
      reservedAmount: 0,
      statusHistory: [
        {
          status: "PENDING",
          timestamp: now,
          note: `${normalizedOrderType} sell placed. Trigger: ${triggerPrice ? '₹' + triggerPrice : 'N/A'}, Limit: ${limitPrice ? '₹' + limitPrice : 'N/A'}.`,
        },
      ],
    };

    if (limitPrice !== undefined) orderData.limitPrice = limitPrice;
    if (triggerPrice !== undefined) orderData.triggerPrice = triggerPrice;

    const order = await Trade.create([orderData], { session });

    console.info(
      `[ORDER] SELL ${normalizedOrderType} created — ${input.symbol}, qty: ${input.quantity}, user: ${input.user}`
    );

    return { order: order[0], reservedAmount: 0, cash: user.cash };
  });
};

const createLimitOrder = async (payload) => {
  return createPendingOrder({ ...payload, orderType: "LIMIT" });
};

// ─────────────────────────────────────────────────────────────────────────────
// Modify Pending Order
// ─────────────────────────────────────────────────────────────────────────────

/**
 * modifyPendingOrder
 *
 * Modifies an existing PENDING order.
 * Adjusts reserved cash if it is a BUY order and price/quantity changes.
 *
 * @param {string} orderId
 * @param {string} userId
 * @param {{ quantity, limitPrice, triggerPrice }} updates
 */
const modifyPendingOrder = async (orderId, userId, updates) => {
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

      if (order.user.toString() !== String(userId)) {
        const err = new Error("You are not authorised to modify this order.");
        err.statusCode = 403;
        throw err;
      }

      if (order.status !== "PENDING") {
        const err = new Error(`Cannot modify order with status "${order.status}".`);
        err.statusCode = 400;
        throw err;
      }

      const oldQuantity = order.quantity;
      const oldLimitPrice = order.limitPrice;
      const oldTriggerPrice = order.triggerPrice;

      const newQuantity = updates.quantity !== undefined && updates.quantity !== null ? toNumber(updates.quantity) : oldQuantity;
      const newLimitPrice = updates.limitPrice !== undefined && updates.limitPrice !== null ? toNumber(updates.limitPrice) : oldLimitPrice;
      const newTriggerPrice = updates.triggerPrice !== undefined && updates.triggerPrice !== null ? toNumber(updates.triggerPrice) : oldTriggerPrice;

      if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
        const err = new Error("Quantity must be a whole number greater than 0.");
        err.statusCode = 400;
        throw err;
      }

      // Type-specific validations
      if (order.orderType === "LIMIT") {
        if (!Number.isFinite(newLimitPrice) || newLimitPrice <= 0) {
          const err = new Error("Limit price must be a positive number.");
          err.statusCode = 400;
          throw err;
        }
      } else if (order.orderType === "SL") {
        if (!Number.isFinite(newLimitPrice) || newLimitPrice <= 0) {
          const err = new Error("Limit price must be a positive number.");
          err.statusCode = 400;
          throw err;
        }
        if (!Number.isFinite(newTriggerPrice) || newTriggerPrice <= 0) {
          const err = new Error("Trigger price must be a positive number.");
          err.statusCode = 400;
          throw err;
        }
      } else if (order.orderType === "SL-M") {
        if (!Number.isFinite(newTriggerPrice) || newTriggerPrice <= 0) {
          const err = new Error("Trigger price must be a positive number.");
          err.statusCode = 400;
          throw err;
        }
      } else if (order.orderType === "GTT") {
        if (!Number.isFinite(newTriggerPrice) || newTriggerPrice <= 0) {
          const err = new Error("Trigger price must be a positive number.");
          err.statusCode = 400;
          throw err;
        }
        if (newLimitPrice !== undefined && newLimitPrice !== null && (Number.isNaN(newLimitPrice) || newLimitPrice <= 0)) {
          const err = new Error("Limit price must be a positive number.");
          err.statusCode = 400;
          throw err;
        }
      }

      let cashAfter = null;

      // BUY order: recalculate cash reservation
      if (order.action === "BUY") {
        let newReservedAmount = 0;
        if (order.orderType === "LIMIT" || order.orderType === "SL") {
          newReservedAmount = newQuantity * newLimitPrice;
        } else if (order.orderType === "SL-M") {
          newReservedAmount = newQuantity * newTriggerPrice;
        } else if (order.orderType === "GTT") {
          newReservedAmount = 0;
        }

        const oldReservedAmount = order.reservedAmount || 0;

        if (newReservedAmount !== oldReservedAmount) {
          const user = await User.findById(userId).session(session);
          if (!user) throw new Error("User not found");

          const additionalCashRequired = newReservedAmount - oldReservedAmount;
          if (user.cash < additionalCashRequired) {
            const err = new Error(
              `Insufficient cash balance to modify order. Required additional: ₹${additionalCashRequired.toFixed(2)}, Available: ₹${user.cash.toFixed(2)}`
            );
            err.statusCode = 400;
            throw err;
          }

          user.cash = Math.round((user.cash - additionalCashRequired) * 100) / 100;
          await user.save({ session });
          cashAfter = user.cash;

          order.reservedAmount = newReservedAmount;
        }
      }

      // SELL order: verify holdings if quantity increased
      if (order.action === "SELL" && order.orderType !== "GTT" && newQuantity > oldQuantity) {
        const holding = await Holding.findOne({ user: userId, symbol: order.symbol }).session(session);
        if (!holding || holding.quantity < newQuantity) {
          const err = new Error(`Insufficient holding quantity. You hold ${holding?.quantity || 0} shares, requested ${newQuantity}.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Apply modifications
      order.quantity = newQuantity;
      if (newLimitPrice !== undefined) order.limitPrice = newLimitPrice;
      if (newTriggerPrice !== undefined) order.triggerPrice = newTriggerPrice;

      const note = `Order modified. Qty: ${oldQuantity} -> ${newQuantity}, Limit: ${oldLimitPrice ? '₹' + oldLimitPrice : 'N/A'} -> ${newLimitPrice ? '₹' + newLimitPrice : 'N/A'}, Trigger: ${oldTriggerPrice ? '₹' + oldTriggerPrice : 'N/A'} -> ${newTriggerPrice ? '₹' + newTriggerPrice : 'N/A'}`;
      order.statusHistory.push({ status: "PENDING", timestamp: new Date(), note });

      await order.save({ session });

      result = { order, cashAfter };
    });

    return result;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Pending Order
// ─────────────────────────────────────────────────────────────────────────────

/**
 * cancelLimitOrder
 *
 * Cancels a PENDING order and refunds reserved cash for BUY orders.
 * Keeps limit in name for backward compatibility.
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

      // Refund reserved funds for BUY orders (applies to LIMIT, SL, SL-M)
      if (order.action === "BUY" && order.reservedAmount > 0) {
        const user = await User.findById(userId).session(session);
        if (user) {
          user.cash = Math.round((user.cash + order.reservedAmount) * 100) / 100;
          await user.save({ session });
          cashAfter = user.cash;

          order.statusHistory[order.statusHistory.length - 1].note +=
            ` Refunded ₹${order.reservedAmount.toFixed(2)}.`;
        }
      }

      await order.save({ session });

      console.info(
        `[ORDER] Order cancelled — ${order.symbol} ${order.action} @ ₹${order.limitPrice || order.triggerPrice}, user: ${userId}`
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
 * Executes a limit/stop loss/GTT order whose price condition has been met.
 * Runs inside a MongoDB transaction for atomicity.
 *
 * @param {mongoose.Document} order         — the Trade document (PENDING)
 * @param {number}            executedPrice — the server-resolved authoritative price
 */
const executeFilledOrder = async (order, executedPrice) => {
  const res = await runTradeTransaction(async (session) => {
    // Re-fetch the order inside the transaction to prevent race conditions
    const lockedOrder = await Trade.findById(order._id).session(session);

    if (!lockedOrder || lockedOrder.status !== "PENDING") {
      // Already executed or cancelled by a concurrent run — skip
      return null;
    }

    const user = await User.findById(lockedOrder.user).session(session);
    if (!user) throw new Error("User not found during order execution");

    const input = {
      user: lockedOrder.user.toString(),
      symbol: lockedOrder.symbol,
      companyName: lockedOrder.companyName,
      quantity: lockedOrder.quantity,
    };

    const totalAmount = lockedOrder.quantity * executedPrice;
    const now = new Date();

    if (lockedOrder.action === "BUY") {
      // Refund difference between reserved amount and actual cost (can be negative for GTT/slippage)
      const refund = lockedOrder.reservedAmount - totalAmount;
      user.cash = Math.round((user.cash + refund) * 100) / 100;

      await applyBuyToHoldings(session, input, executedPrice);
    } else {
      // SELL — verify holdings still sufficient
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
          `[ORDER] SELL order REJECTED — ${lockedOrder.symbol}, insufficient holdings, user: ${lockedOrder.user}`
        );
        return null;
      }

      const { remainingHolding, originalAveragePrice } = await applySellToHoldings(session, input);
      const realizedPnL = Math.round(lockedOrder.quantity * (executedPrice - originalAveragePrice) * 100) / 100;
      lockedOrder.realizedPnL = realizedPnL;
      user.cash = Math.round((user.cash + totalAmount) * 100) / 100;
    }

    await user.save({ session });

    // Update the order record
    const note = `Filled @ ₹${executedPrice}. Total: ₹${totalAmount.toFixed(2)}.${lockedOrder.realizedPnL !== undefined ? ' Realised P&L: ₹' + lockedOrder.realizedPnL.toFixed(2) + '.' : ''}`;
    pushStatus(lockedOrder, "EXECUTED", note);
    lockedOrder.price = executedPrice;
    lockedOrder.executedPrice = executedPrice;
    lockedOrder.totalAmount = totalAmount;
    lockedOrder.executedAt = now;
    await lockedOrder.save({ session });

    await createPortfolioSnapshot(lockedOrder.user.toString(), user.cash, session);

    console.info(
      `[ORDER] ${lockedOrder.action} order EXECUTED — ${lockedOrder.symbol} @ ₹${executedPrice}, qty: ${lockedOrder.quantity}, user: ${lockedOrder.user}`
    );

    return lockedOrder;
  });

  if (res) {
    // Send simulated email asynchronously outside transaction
    User.findById(res.user).select("email").then((u) => {
      if (u && u.email) {
        sendSimulatedEmail(
          u.email,
          `Order Executed: ${res.orderType} ${res.action} ${res.symbol}`,
          `Your pending ${res.orderType} ${res.action} order was executed!`,
          {
            "Symbol": res.symbol,
            "Company": res.companyName,
            "Order Type": res.orderType,
            "Action": res.action,
            "Quantity": res.quantity,
            "Execution Price": `₹${res.executedPrice.toFixed(2)}`,
            "Total Amount": `₹${res.totalAmount.toFixed(2)}`,
            "Status": "EXECUTED",
            "Executed At": new Date(res.executedAt).toLocaleString("en-IN"),
          }
        ).catch((err) => console.error("Email simulation failed:", err));
      }
    });
  }

  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// Order Processor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * processPendingOrders
 *
 * Fetches all PENDING orders, resolves current market prices,
 * and executes any orders whose trigger or execution condition is satisfied.
 */
const processPendingOrders = async () => {
  try {
    const pendingOrders = await Trade.find({ status: "PENDING" });

    if (pendingOrders.length === 0) return;

    console.info(`[PROCESSOR] Checking ${pendingOrders.length} pending order(s)...`);

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

      let shouldTrigger = false;
      let shouldExecute = false;

      const orderType = order.orderType || "LIMIT";
      const isBuy = order.action === "BUY";

      if (orderType === "LIMIT") {
        shouldExecute = isBuy ? marketPrice <= order.limitPrice : marketPrice >= order.limitPrice;
      } else if (orderType === "SL" || orderType === "SL-M") {
        if (!order.isTriggered) {
          // Check trigger condition
          // SL BUY triggers when price rises to/above trigger price
          // SL SELL triggers when price falls to/below trigger price
          shouldTrigger = isBuy ? marketPrice >= order.triggerPrice : marketPrice <= order.triggerPrice;

          if (shouldTrigger) {
            console.info(`[PROCESSOR] Trigger hit for ${orderType} ${order.symbol} @ trigger ₹${order.triggerPrice} (market ₹${marketPrice})`);

            // Mark as triggered.
            // For SL-M, trigger means immediate execution.
            // For SL, check if limit condition also matches.
            if (orderType === "SL-M") {
              shouldExecute = true;
            } else {
              shouldExecute = isBuy ? marketPrice <= order.limitPrice : marketPrice >= order.limitPrice;
            }
          }
        } else {
          // Already triggered SL order acts as a normal limit order
          shouldExecute = isBuy ? marketPrice <= order.limitPrice : marketPrice >= order.limitPrice;
        }
      } else if (orderType === "GTT") {
        if (!order.isTriggered) {
          // GTT triggers:
          // BUY: price drops to/below trigger
          // SELL: price rises to/above trigger
          shouldTrigger = isBuy ? marketPrice <= order.triggerPrice : marketPrice >= order.triggerPrice;

          if (shouldTrigger) {
            console.info(`[PROCESSOR] Trigger hit for GTT ${order.symbol} @ trigger ₹${order.triggerPrice} (market ₹${marketPrice})`);

            const session = await mongoose.startSession();
            try {
              let executionAllowed = false;
              let rejectionReason = "";

              await session.withTransaction(async () => {
                const user = await User.findById(order.user).session(session);
                if (!user) throw new Error("User not found");

                if (isBuy) {
                  const targetPrice = order.limitPrice || marketPrice;
                  const reqAmount = order.quantity * targetPrice;

                  if (user.cash < reqAmount) {
                    rejectionReason = `Insufficient cash balance at GTT trigger execution. Required: ₹${reqAmount.toFixed(2)}, Available: ₹${user.cash.toFixed(2)}`;
                  } else {
                    executionAllowed = true;
                  }
                } else {
                  const holding = await Holding.findOne({ user: order.user, symbol: order.symbol }).session(session);
                  if (!holding || holding.quantity < order.quantity) {
                    rejectionReason = `Insufficient holding quantity at GTT trigger execution. Required: ${order.quantity}, Available: ${holding?.quantity || 0}`;
                  } else {
                    executionAllowed = true;
                  }
                }

                if (!executionAllowed) {
                  order.status = "REJECTED";
                  order.rejectionReason = rejectionReason;
                  order.isTriggered = true;
                  order.triggeredAt = new Date();
                  order.statusHistory.push({
                    status: "REJECTED",
                    timestamp: new Date(),
                    note: `GTT triggered at ₹${marketPrice} but rejected: ${rejectionReason}`,
                  });
                  await order.save({ session });
                  console.warn(`[PROCESSOR] GTT order ${order._id} rejected: ${rejectionReason}`);
                } else {
                  order.isTriggered = true;
                  order.triggeredAt = new Date();
                  order.statusHistory.push({
                    status: "PENDING",
                    timestamp: new Date(),
                    note: `GTT trigger hit @ ₹${marketPrice}. Order triggered.`,
                  });
                  await order.save({ session });

                  if (order.limitPrice === undefined || order.limitPrice === null) {
                    shouldExecute = true;
                  } else {
                    shouldExecute = isBuy ? marketPrice <= order.limitPrice : marketPrice >= order.limitPrice;

                    if (!shouldExecute) {
                      // GTT triggered but limit price not met. Convert to a standard LIMIT order.
                      // Lock the cash now.
                      if (isBuy) {
                        const targetPrice = order.limitPrice;
                        const reqAmount = order.quantity * targetPrice;
                        user.cash = Math.round((user.cash - reqAmount) * 100) / 100;
                        await user.save({ session });
                        order.reservedAmount = reqAmount;
                      }
                      order.orderType = "LIMIT";
                      order.statusHistory.push({
                        status: "PENDING",
                        timestamp: new Date(),
                        note: `GTT limit condition not met immediately. Converted to pending LIMIT order. Reserved ₹${order.reservedAmount.toFixed(2)}.`,
                      });
                      await order.save({ session });
                    }
                  }
                }
              });
            } catch (err) {
              console.error(`[PROCESSOR] Error processing GTT trigger checks for ${order._id}: ${err.message}`);
              continue;
            } finally {
              session.endSession();
            }
          }
        }
      }

      if (!shouldExecute) {
        // If trigger hit but not executing yet (e.g. SL or GTT triggered but limit condition not met),
        // update database triggered state.
        if (shouldTrigger && (orderType === "SL" || orderType === "GTT") && !shouldExecute) {
          await runTradeTransaction(async (session) => {
            const lockedOrder = await Trade.findById(order._id).session(session);
            if (lockedOrder && lockedOrder.status === "PENDING" && !lockedOrder.isTriggered) {
              lockedOrder.isTriggered = true;
              lockedOrder.triggeredAt = new Date();
              lockedOrder.statusHistory.push({
                status: "PENDING",
                timestamp: new Date(),
                note: `${orderType} triggered @ ₹${marketPrice}. Limit order active @ ₹${order.limitPrice}.`,
              });
              await lockedOrder.save({ session });
            }
          });
        }
        continue;
      }

      console.info(
        `[PROCESSOR] Condition met — Executing ${order.action} ${order.symbol}: market ₹${marketPrice} vs limit/trigger ₹${order.limitPrice || order.triggerPrice}`
      );

      try {
        // If triggering now and executing immediately, make sure triggered state is flagged
        if ((orderType === "SL" || orderType === "SL-M" || orderType === "GTT") && !order.isTriggered) {
          await runTradeTransaction(async (session) => {
            const lockedOrder = await Trade.findById(order._id).session(session);
            if (lockedOrder && lockedOrder.status === "PENDING") {
              lockedOrder.isTriggered = true;
              lockedOrder.triggeredAt = new Date();
              await lockedOrder.save({ session });
            }
          });
        }

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
  createPendingOrder,
  createLimitOrder,
  modifyPendingOrder,
  cancelLimitOrder,
  processPendingOrders,
  startOrderProcessor,
  stopOrderProcessor,
};
