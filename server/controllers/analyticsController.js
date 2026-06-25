import PortfolioSnapshot from "../models/PortfolioSnapshot.js";
import { getSummaryByUser } from "../services/tradingEngineService.js";
import { calculateAdvancedAnalytics } from "../services/analyticsService.js";
import asyncHandler from "../middleware/asyncHandler.js";

const normalizeSnapshot = (snapshot) => ({
  _id: snapshot._id,
  portfolioValue: snapshot.portfolioValue,
  cashBalance: snapshot.cashBalance,
  investedAmount: snapshot.investedAmount,
  createdAt: snapshot.createdAt,
});

/**
 * @route  GET /api/analytics/performance
 * @access Private
 */
export const getPortfolioPerformance = asyncHandler(async (req, res) => {
  let snapshots = await PortfolioSnapshot.find({ user: req.user.id })
    .sort({ createdAt: 1 })
    .limit(120);

  if (snapshots.length === 0) {
    const summary = await getSummaryByUser(req.user.id);
    const snapshot = await PortfolioSnapshot.create({
      user: req.user.id,
      portfolioValue: summary.cash + summary.investedAmount,
      cashBalance: summary.cash,
      investedAmount: summary.investedAmount,
    });

    snapshots = [snapshot];
  }

  res.status(200).json({
    success: true,
    data: snapshots.map(normalizeSnapshot),
  });
});

/**
 * @route  GET /api/analytics/advanced
 * @access Private
 */
export const getAdvancedAnalyticsController = asyncHandler(async (req, res) => {
  const data = await calculateAdvancedAnalytics(req.user.id);

  res.status(200).json({
    success: true,
    data,
  });
});
