import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
  // Trimming is done here as a defence-in-depth measure even though
  // the validation middleware already rejects empty/invalid values.
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const { password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error("User with this email already exists");
    err.statusCode = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  // Normalise email — validation middleware guarantees format is valid.
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const { password } = req.body;

  const user = await User.findOne({ email });

  // Use a single "Invalid credentials" message to avoid user enumeration.
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  res.status(200).json({
    success: true,
    user,
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // These checks are preserved as business-logic guards (beyond what the
  // validation middleware checks) so they produce meaningful domain errors.
  if (newPassword !== confirmPassword) {
    const err = new Error("New password and confirm password do not match.");
    err.statusCode = 400;
    throw err;
  }

  if (currentPassword === newPassword) {
    const err = new Error("New password must be different from your current password.");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    const err = new Error("Current password is incorrect.");
    err.statusCode = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
});

export { registerUser, loginUser, getProfile, changePassword };
