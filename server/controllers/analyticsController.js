import PortfolioSnapshot from "../models/PortfolioSnapshot.js";
import { getSummaryByUser } from "../services/tradingEngineService.js";
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
 *
 * asyncHandler forwards any thrown error or rejected promise to the global
 * error handler — no manual try/catch or inline 500 responses needed.
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
