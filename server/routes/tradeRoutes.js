import express from "express";
import {
  buyStock,
  sellStock,
  placeLimitOrder,
  cancelOrder,
  getPendingOrders,
  getTradeHistory,
  getHoldings,
  getSummary,
} from "../controllers/tradeController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/buy", protect, buyStock);

router.post("/sell", protect, sellStock);

router.post("/limit", protect, placeLimitOrder);

router.post("/:id/cancel", protect, cancelOrder);

router.get("/pending", protect, getPendingOrders);

router.get("/history", protect, getTradeHistory);

router.get("/holdings", protect, getHoldings);

router.get("/summary", protect, getSummary);

export default router;
