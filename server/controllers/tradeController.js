import Trade from "../models/TradeModel.js";
import {
  buyTrade,
  sellTrade,
  getHoldingsByUser,
  getSummaryByUser,
} from "../services/tradingEngineService.js";
import {
  createLimitOrder,
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

// Cancel Limit Order
// @route POST /api/trades/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const result = await cancelLimitOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

// Get Pending Limit Orders
// @route GET /api/trades/pending
const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await Trade.find({
    user: req.user.id,
    status: "PENDING",
    orderType: "LIMIT",
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

// Get Portfolio Summary
// @route GET /api/trades/summary
const getSummary = asyncHandler(async (req, res) => {
  const summary = await getSummaryByUser(req.user.id);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

export {
  buyStock,
  sellStock,
  placeLimitOrder,
  cancelOrder,
  getPendingOrders,
  getTradeHistory,
  getHoldings,
  getSummary,
};
