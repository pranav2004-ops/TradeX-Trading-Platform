import {
  searchStocks,
  getStockQuote,
  getBatchStockQuotes,
  getStockOverview,
  getSparklineData,
} from "../services/stockService.js";
import asyncHandler from "../middleware/asyncHandler.js";

const normalizeSector = (sector) => {
  const value = String(sector || "").toLowerCase();

  if (value.includes("technology") || value.includes("communication")) return "Technology";
  if (value.includes("financial") || value.includes("finance")) return "Finance";
  if (value.includes("energy") || value.includes("utilities")) return "Energy";
  if (value.includes("health") || value.includes("medical")) return "Healthcare";
  if (value.includes("consumer")) return "Consumer";

  return "Other";
};

// @route GET /api/stocks/search?keyword=...
export const searchStockController = asyncHandler(async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    const err = new Error("Keyword is required");
    err.statusCode = 400;
    throw err;
  }

  const data = await searchStocks(keyword);

  res.status(200).json({
    success: true,
    data,
  });
});

// @route GET /api/stocks/quote/:symbol
export const getQuoteController = asyncHandler(async (req, res) => {
  const { symbol } = req.params;

  const data = await getStockQuote(symbol);

  res.status(200).json({
    success: true,
    data,
  });
});

// @route GET /api/stocks/batch?symbols=AAPL,MSFT,...
export const getBatchQuotesController = asyncHandler(async (req, res) => {
  const symbols = String(req.query.symbols || "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    const err = new Error("Symbols are required");
    err.statusCode = 400;
    throw err;
  }

  const data = await getBatchStockQuotes(symbols);

  res.status(200).json(data);
});

// @route GET /api/stocks/sparkline/:symbol
 export const getSparklineController = asyncHandler(async (req, res) => {
  const { symbol } = req.params;

  try {
    const data = await getSparklineData(symbol);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("SPARKLINE ERROR:", symbol, error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route GET /api/stocks/sectors?symbols=AAPL,MSFT,...
export const getBatchSectorsController = asyncHandler(async (req, res) => {
  const symbols = [
    ...new Set(
      String(req.query.symbols || "")
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];

  if (symbols.length === 0) {
    const err = new Error("Symbols are required");
    err.statusCode = 400;
    throw err;
  }

  const data = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const overview = await getStockOverview(symbol);

        return {
          symbol,
          sector: normalizeSector(overview.Sector),
        };
      } catch {
        return {
          symbol,
          sector: "Other",
        };
      }
    })
  );

  res.status(200).json({
    success: true,
    data,
  });
});
