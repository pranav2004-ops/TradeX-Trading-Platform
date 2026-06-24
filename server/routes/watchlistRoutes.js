import express from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlistController.js";
import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validators/validationHelpers.js";
import {
  validateAddToWatchlist,
  validateRemoveFromWatchlist,
} from "../middleware/validators/watchlistValidators.js";

const router = express.Router();

router.get("/", protect, getWatchlist);

router.post("/", protect, validate(validateAddToWatchlist), addToWatchlist);

router.delete("/:symbol", protect, validate(validateRemoveFromWatchlist), removeFromWatchlist);

export default router;
