import Watchlist from "../models/WatchlistModel.js";
import asyncHandler from "../middleware/asyncHandler.js";

const normalizeWatchlistInput = ({ symbol, companyName, exchange }) => {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const normalizedCompanyName = String(companyName || "").trim();
  const normalizedExchange = String(exchange || "").trim();

  if (!normalizedSymbol) {
    const err = new Error("Symbol is required");
    err.statusCode = 400;
    throw err;
  }

  if (!normalizedCompanyName) {
    const err = new Error("Company name is required");
    err.statusCode = 400;
    throw err;
  }

  if (!normalizedExchange) {
    const err = new Error("Exchange is required");
    err.statusCode = 400;
    throw err;
  }

  return {
    symbol: normalizedSymbol,
    companyName: normalizedCompanyName,
    exchange: normalizedExchange,
  };
};

const mapWatchlistItem = (item) => ({
  symbol: item.symbol,
  companyName: item.companyName,
  exchange: item.exchange,
});

// @route GET /api/watchlist
const getWatchlist = asyncHandler(async (req, res) => {
  const items = await Watchlist.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select("symbol companyName exchange");

  res.status(200).json({
    success: true,
    data: items.map(mapWatchlistItem),
  });
});

// @route POST /api/watchlist
const addToWatchlist = asyncHandler(async (req, res) => {
  const input = normalizeWatchlistInput(req.body);

  const existingItem = await Watchlist.findOne({
    user: req.user.id,
    symbol: input.symbol,
  });

  if (existingItem) {
    const err = new Error("Stock already exists in watchlist");
    err.statusCode = 409;
    throw err;
  }

  const item = await Watchlist.create({
    user: req.user.id,
    ...input,
  });

  res.status(201).json({
    success: true,
    data: mapWatchlistItem(item),
  });
});

// @route DELETE /api/watchlist/:symbol
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const symbol = String(req.params.symbol || "").trim().toUpperCase();

  await Watchlist.deleteOne({
    user: req.user.id,
    symbol,
  });

  res.status(200).json({
    success: true,
    data: { symbol },
  });
});

export {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
};
