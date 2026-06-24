import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  changePassword,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validators/validationHelpers.js";
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
} from "../middleware/validators/authValidators.js";

const router = express.Router();

router.post("/register", validate(validateRegister), registerUser);
router.post("/login", validate(validateLogin), loginUser);
router.get("/profile", protect, getProfile);
router.put("/change-password", protect, validate(validateChangePassword), changePassword);

export default router;