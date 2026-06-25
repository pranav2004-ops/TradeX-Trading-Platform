import express from "express";
import {
  getPortfolioPerformance,
  getAdvancedAnalyticsController,
} from "../controllers/analyticsController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/performance", protect, getPortfolioPerformance);
router.get("/advanced", protect, getAdvancedAnalyticsController);

export default router;
