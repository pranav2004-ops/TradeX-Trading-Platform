import mongoose from "mongoose";
import Trade from "../models/TradeModel.js";

import {
  buyTrade,
  sellTrade,
  getHoldingsByUser,
  getSummaryByUser,
} from "../services/tradingEngineService.js";
import {
  createPendingOrder,
  createLimitOrder,
  modifyPendingOrder,
  cancelLimitOrder,
} from "../services/limitOrderService.js";
import asyncHandler from "../middleware/asyncHandler.js";

// Buy Stock
// @route POST /api/trades/buy
const buyStock = asyncHandler(async (req, res) => {
  const { symbol, companyName, quantity, price: clientDisplayPrice } = req.body;

  const result = await buyTrade({
    user: req.user.id,
    symbol,
    companyName,
    quantity,
    ...(clientDisplayPrice !== undefined && { clientDisplayPrice }),
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

// Sell Stock
// @route POST /api/trades/sell
const sellStock = asyncHandler(async (req, res) => {
  const { symbol, companyName, quantity, price: clientDisplayPrice } = req.body;

  const result = await sellTrade({
    user: req.user.id,
    symbol,
    companyName,
    quantity,
    ...(clientDisplayPrice !== undefined && { clientDisplayPrice }),
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

// Place Limit Order
// @route POST /api/trades/limit
const placeLimitOrder = asyncHandler(async (req, res) => {
  const { symbol, companyName, quantity, action, limitPrice } = req.body;

  const result = await createLimitOrder({
    user: req.user.id,
    symbol,
    companyName,
    quantity,
    action,
    limitPrice,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

// Place Pending Order (LIMIT, SL, SL-M, GTT)
// @route POST /api/trades/order
const placePendingOrder = asyncHandler(async (req, res) => {
  const { symbol, companyName, quantity, action, orderType, limitPrice, triggerPrice } = req.body;

  const result = await createPendingOrder({
    user: req.user.id,
    symbol,
    companyName,
    quantity,
    action,
    orderType,
    limitPrice,
    triggerPrice,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

// Modify Pending Order
// @route PUT /api/trades/:id/modify
const modifyOrder = asyncHandler(async (req, res) => {
  const { quantity, limitPrice, triggerPrice } = req.body;

  const result = await modifyPendingOrder(req.params.id, req.user.id, {
    quantity,
    limitPrice,
    triggerPrice,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

// Cancel Pending Order
// @route POST /api/trades/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const result = await cancelLimitOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

// Get Pending Orders
// @route GET /api/trades/pending
const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await Trade.find({
    user: req.user.id,
    status: "PENDING",
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: orders,
  });
});

// Get User Trade History
// @route GET /api/trades/history
const getTradeHistory = asyncHandler(async (req, res) => {
  const trades = await Trade.find({
    user: req.user.id,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: trades,
  });
});

// Get User Holdings
// @route GET /api/trades/holdings
const getHoldings = asyncHandler(async (req, res) => {
  const holdings = await getHoldingsByUser(req.user.id);

  res.status(200).json({
    success: true,
    data: holdings,
  });
});

const getSummary = asyncHandler(async (req, res) => {
  const summary = await getSummaryByUser(req.user.id);

  // Sum up realizedPnL from executed SELL orders
  const realizedPnLData = await Trade.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user.id),
        action: "SELL",
        status: "EXECUTED",
        realizedPnL: { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        totalRealizedPnL: { $sum: "$realizedPnL" }
      }
    }
  ]);

  const realizedPnL = realizedPnLData.length > 0 ? Math.round(realizedPnLData[0].totalRealizedPnL * 100) / 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      ...summary,
      realizedPnL,
    },
  });
});

export {
  buyStock,
  sellStock,
  placeLimitOrder,
  placePendingOrder,
  modifyOrder,
  cancelOrder,
  getPendingOrders,
  getTradeHistory,
  getHoldings,
  getSummary,
};
