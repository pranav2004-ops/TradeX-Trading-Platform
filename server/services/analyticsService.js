import Holding from "../models/HoldingModel.js";
import User from "../models/user.js";
import { getStockCandles, getStockQuote, getStockOverview } from "./stockService.js";

const normalizeSector = (sector) => {
  const value = String(sector || "").toLowerCase();

  if (value.includes("technology") || value.includes("communication") || value.includes("software")) return "Technology";
  if (value.includes("financial") || value.includes("finance") || value.includes("bank")) return "Finance";
  if (value.includes("energy") || value.includes("utilities") || value.includes("oil")) return "Energy";
  if (value.includes("health") || value.includes("medical") || value.includes("pharma")) return "Healthcare";
  if (value.includes("consumer") || value.includes("retail")) return "Consumer";

  return "Other";
};

export const calculateAdvancedAnalytics = async (userId) => {
  const [user, holdings] = await Promise.all([
    User.findById(userId).select("cash"),
    Holding.find({ user: userId }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const cash = user.cash || 0;

  // 1. If portfolio is empty, return default values
  if (holdings.length === 0) {
    return {
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      riskScore: 0,
      riskClass: "Low Risk",
      riskRationale: ["Your portfolio is empty. Add assets to see risk calculations."],
      sectorConcentration: [],
      benchmarkComparison: [],
      heatmap: [],
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 30 * 24 * 60 * 60; // 30 days

  // 2. Fetch candles, quote, and overview for each stock concurrently
  const enrichedHoldings = await Promise.all(
    holdings.map(async (h) => {
      try {
        const [quoteData, overview, candlesData] = await Promise.all([
          getStockQuote(h.symbol),
          getStockOverview(h.symbol).catch(() => ({})),
          getStockCandles(h.symbol, "D", from, now).catch(() => ({ candles: [] })),
        ]);

        const currentPrice =
          quoteData?.["Global Quote"]?.["05. price"]
            ? Number(quoteData["Global Quote"]["05. price"])
            : h.averagePrice;

        const changePercentStr = quoteData?.["Global Quote"]?.["10. change percent"] || "0%";
        const changePercent = Number(changePercentStr.replace("%", "")) || 0;

        return {
          symbol: h.symbol,
          companyName: h.companyName,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          investedAmount: h.investedAmount,
          currentPrice,
          changePercent,
          sector: normalizeSector(overview.Industry || overview.Sector || ""),
          candles: candlesData.candles || [],
        };
      } catch (err) {
        console.error(`Error enriching holding ${h.symbol}:`, err.message);
        return {
          symbol: h.symbol,
          companyName: h.companyName,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          investedAmount: h.investedAmount,
          currentPrice: h.averagePrice,
          changePercent: 0,
          sector: "Other",
          candles: [],
        };
      }
    })
  );

  // 3. Fetch S&P 500 ETF (SPY) as index benchmark
  const benchmarkData = await getStockCandles("SPY", "D", from, now).catch(() => ({ candles: [] }));
  const benchmarkCandles = benchmarkData.candles || [];

  // 4. Align timestamps across all assets
  const getLocalDate = (timeMs) => new Date(timeMs).toISOString().split("T")[0];

  // Pick unique dates from SPY candles or generate a default set if empty
  let alignedDates = [...new Set(benchmarkCandles.map((c) => getLocalDate(c.time)))].sort();

  if (alignedDates.length === 0) {
    // Generate dates excluding weekends for past 30 days
    const dates = [];
    let curr = new Date();
    while (dates.length < 30) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(curr.toISOString().split("T")[0]);
      }
      curr.setDate(curr.getDate() - 1);
    }
    alignedDates = dates.reverse();
  }

  // Pre-map stock and benchmark close prices by date for fast lookup
  const stockPriceMaps = enrichedHoldings.map((eh) => {
    const map = new Map();
    eh.candles.forEach((c) => {
      map.set(getLocalDate(c.time), c.close);
    });
    return { symbol: eh.symbol, map, currentPrice: eh.currentPrice };
  });

  const benchmarkPriceMap = new Map();
  benchmarkCandles.forEach((c) => {
    benchmarkPriceMap.set(getLocalDate(c.time), c.close);
  });

  const getStockPriceForDate = (dateStr, priceMap, currentPrice) => {
    if (priceMap.has(dateStr)) return priceMap.get(dateStr);
    
    // Find nearest previous date price
    const idx = alignedDates.indexOf(dateStr);
    for (let i = idx - 1; i >= 0; i--) {
      if (priceMap.has(alignedDates[i])) return priceMap.get(alignedDates[i]);
    }
    
    // Find nearest next date price
    for (let i = idx + 1; i < alignedDates.length; i++) {
      if (priceMap.has(alignedDates[i])) return priceMap.get(alignedDates[i]);
    }
    
    return currentPrice;
  };

  let latestBenchmarkPrice = 500.0;
  if (benchmarkCandles.length > 0) {
    latestBenchmarkPrice = benchmarkCandles[benchmarkCandles.length - 1].close;
  }

  // 5. Reconstruct portfolio daily historical value
  const portfolioValues = [];
  const benchmarkValues = [];

  for (const dateStr of alignedDates) {
    let holdingsVal = 0;
    for (let i = 0; i < enrichedHoldings.length; i++) {
      const eh = enrichedHoldings[i];
      const spInfo = stockPriceMaps[i];
      const price = getStockPriceForDate(dateStr, spInfo.map, spInfo.currentPrice);
      holdingsVal += eh.quantity * price;
    }
    portfolioValues.push(cash + holdingsVal);

    const benchVal = benchmarkPriceMap.has(dateStr)
      ? benchmarkPriceMap.get(dateStr)
      : latestBenchmarkPrice;
    benchmarkValues.push(benchVal);
  }

  // 6. Calculate returns and risk statistics
  const returns = [];
  for (let i = 1; i < portfolioValues.length; i++) {
    const prev = portfolioValues[i - 1];
    const curr = portfolioValues[i];
    returns.push(prev > 0 ? (curr - prev) / prev : 0);
  }

  let volatility = 0;
  let annualizedReturn = 0;
  let sharpeRatio = 0;

  if (returns.length > 1) {
    const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) /
      (returns.length - 1);
    
    const dailyVolatility = Math.sqrt(variance);
    volatility = dailyVolatility * Math.sqrt(252); // Annualized Volatility
    annualizedReturn = averageReturn * 252; // Annualized average return

    const riskFreeRate = 0.05; // 5% risk-free rate assumption
    sharpeRatio =
      volatility > 0.0001
        ? (annualizedReturn - riskFreeRate) / volatility
        : 0;
  }

  // Calculate Max Drawdown
  let peak = portfolioValues[0] || 0;
  let maxDrawdown = 0;
  for (const val of portfolioValues) {
    if (val > peak) {
      peak = val;
    }
    const dd = peak > 0 ? (val - peak) / peak : 0;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  // 7. Calculate Benchmark Comparison (Percentage returns normalized to 0% at start)
  const benchmarkComparison = alignedDates.map((dateStr, idx) => {
    const pStart = portfolioValues[0] || 1;
    const bStart = benchmarkValues[0] || 1;

    const pChange = ((portfolioValues[idx] - pStart) / pStart) * 100;
    const bChange = ((benchmarkValues[idx] - bStart) / bStart) * 100;

    return {
      date: dateStr,
      portfolio: Number(pChange.toFixed(2)),
      benchmark: Number(bChange.toFixed(2)),
    };
  });

  // 8. Calculate Sector Allocations & Weights
  const sectorMap = {};
  let totalHoldingValue = 0;

  enrichedHoldings.forEach((eh) => {
    const val = eh.quantity * eh.currentPrice;
    sectorMap[eh.sector] = (sectorMap[eh.sector] || 0) + val;
    totalHoldingValue += val;
  });

  const totalPortfolioValue = cash + totalHoldingValue;

  const sectorConcentration = Object.entries(sectorMap).map(([name, val]) => ({
    name,
    value: Number(val.toFixed(2)),
    weight: totalPortfolioValue > 0 ? Number(((val / totalPortfolioValue) * 100).toFixed(2)) : 0,
  }));

  // Calculate weights for concentration metrics
  const maxSectorWeight =
    sectorConcentration.length > 0
      ? Math.max(...sectorConcentration.map((s) => s.weight)) / 100
      : 0;

  const maxStockWeight =
    enrichedHoldings.length > 0 && totalPortfolioValue > 0
      ? Math.max(...enrichedHoldings.map((eh) => eh.quantity * eh.currentPrice)) / totalPortfolioValue
      : 0;

  // 9. Calculate Risk Score (1-100)
  const volRisk = Math.min(volatility * 100, 35); // Max 35 points
  const sectorRisk = Math.min(maxSectorWeight * 30, 30); // Max 30 points
  const stockRisk = Math.min(maxStockWeight * 25, 25); // Max 25 points
  const cashBuffer = totalPortfolioValue > 0 ? cash / totalPortfolioValue : 0;
  const cashReduction = Math.min(cashBuffer * 20, 15); // Max 15 points reduction

  // Baseline risk score of 20
  const finalRiskScore = Math.max(
    1,
    Math.min(100, Math.round(volRisk + sectorRisk + stockRisk - cashReduction + 20))
  );

  let riskClass = "Moderate Risk";
  if (finalRiskScore <= 35) riskClass = "Low Risk";
  else if (finalRiskScore >= 66) riskClass = "High Risk";

  // Formulate risk rationale
  const riskRationale = [];
  if (maxSectorWeight > 0.5) {
    riskRationale.push(`High sector concentration in ${sectorConcentration.reduce((a, b) => a.weight > b.weight ? a : b).name} increases vulnerability to industry-specific shocks.`);
  }
  if (maxStockWeight > 0.3) {
    riskRationale.push(`Concentrated single position exposure (exceeding 30% weight) elevates stock-specific volatility risk.`);
  }
  if (volatility > 0.25) {
    riskRationale.push(`Elevated portfolio volatility (${(volatility * 100).toFixed(1)}% annualized) indicates potential for large price swings.`);
  } else {
    riskRationale.push(`Healthy, stable annualized volatility profile of ${(volatility * 100).toFixed(1)}%.`);
  }
  if (cashBuffer > 0.3) {
    riskRationale.push("Substantial cash reserve provides an excellent hedge and dry powder for down-market liquidity.");
  } else if (cashBuffer < 0.1) {
    riskRationale.push("Low cash reserves increase overall capital exposure, limiting risk buffering capacity.");
  }
  if (sharpeRatio > 1.5) {
    riskRationale.push(`Strong risk-adjusted performance (Sharpe Ratio of ${sharpeRatio.toFixed(2)}) indicates efficient portfolio returns.`);
  } else if (sharpeRatio < 0) {
    riskRationale.push("Negative Sharpe Ratio suggests portfolio underperformance relative to risk-free treasury assets.");
  }

  // 10. Generate Heatmap data
  const heatmap = enrichedHoldings.map((eh) => {
    const val = eh.quantity * eh.currentPrice;
    const weight = totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0;

    return {
      symbol: eh.symbol,
      name: eh.companyName,
      value: Number(val.toFixed(2)),
      weight: Number(weight.toFixed(2)),
      changePercent: Number(eh.changePercent.toFixed(2)),
      sector: eh.sector,
    };
  });

  return {
    volatility: Number(volatility.toFixed(4)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(4)),
    riskScore: finalRiskScore,
    riskClass,
    riskRationale,
    sectorConcentration,
    benchmarkComparison,
    heatmap,
  };
};
