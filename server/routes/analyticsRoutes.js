import express from "express";
import { getPortfolioPerformance } from "../controllers/analyticsController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/performance", protect, getPortfolioPerformance);

export default router;
