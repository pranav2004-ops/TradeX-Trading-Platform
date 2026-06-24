import { Router } from "express";
import {
  getAlerts,
  createAlert,
  markAlertTriggered,
  deleteAlert,
} from "../controllers/alertController.js";
import protect from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getAlerts);
router.post("/", createAlert);
router.patch("/:id/trigger", markAlertTriggered);
router.delete("/:id", deleteAlert);

export default router;
