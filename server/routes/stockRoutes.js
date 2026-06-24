import express from "express";
 
import {
  searchStockController,
  getQuoteController,
  getBatchQuotesController,
  getBatchSectorsController,
  getSparklineController,
} from "../controllers/stockController.js";

const router = express.Router();

 

router.get("/search", searchStockController);

router.get("/batch", getBatchQuotesController);

router.get("/sectors", getBatchSectorsController);

router.get("/sparkline/:symbol", getSparklineController);

router.get("/quote/:symbol", getQuoteController);

export default router;
