/**
 * Validation rules for authentication endpoints.
 *
 * Each exported function receives `req` and returns an array of error strings.
 * An empty array means all rules passed.
 */
import {
  required,
  isString,
  isEmail,
  minLength,
  maxLength,
} from "./validationHelpers.js";

// Shared constants
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt silently truncates beyond 72 bytes — cap here to prevent DoS
const NAME_MAX = 100;
const EMAIL_MAX = 254; // RFC 5321 maximum

/**
 * Validate POST /api/auth/register
 * Fields: name, email, password
 */
export const validateRegister = (req) => {
  const errors = [];
  const { name, email, password } = req.body ?? {};

  // name
  errors.push(required(name, "Name"));
  if (name !== undefined) {
    errors.push(isString(name, "Name"));
    errors.push(maxLength(name, "Name", NAME_MAX));
  }

  // email
  errors.push(required(email, "Email"));
  if (email !== undefined) {
    errors.push(isEmail(email, "Email"));
    errors.push(maxLength(email, "Email", EMAIL_MAX));
  }

  // password
  errors.push(required(password, "Password"));
  if (password !== undefined) {
    errors.push(isString(password, "Password"));
    errors.push(minLength(password, "Password", PASSWORD_MIN));
    errors.push(maxLength(password, "Password", PASSWORD_MAX));
  }

  return errors.filter(Boolean);
};

/**
 * Validate POST /api/auth/login
 * Fields: email, password
 */
export const validateLogin = (req) => {
  const errors = [];
  const { email, password } = req.body ?? {};

  // email
  errors.push(required(email, "Email"));
  if (email !== undefined) {
    errors.push(isEmail(email, "Email"));
    errors.push(maxLength(email, "Email", EMAIL_MAX));
  }

  // password — at login we only enforce presence and max length
  // (min-length check is not appropriate: wrong-password errors should not be
  //  disambiguated by validation, for security)
  errors.push(required(password, "Password"));
  if (password !== undefined) {
    errors.push(isString(password, "Password"));
    errors.push(maxLength(password, "Password", PASSWORD_MAX));
  }

  return errors.filter(Boolean);
};

/**
 * Validate PUT /api/auth/change-password
 * Fields: currentPassword, newPassword, confirmPassword
 */
export const validateChangePassword = (req) => {
  const errors = [];
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  // currentPassword — presence + max (prevents bcrypt DoS)
  errors.push(required(currentPassword, "Current password"));
  if (currentPassword !== undefined) {
    errors.push(isString(currentPassword, "Current password"));
    errors.push(maxLength(currentPassword, "Current password", PASSWORD_MAX));
  }

  // newPassword — presence, min, max
  errors.push(required(newPassword, "New password"));
  if (newPassword !== undefined) {
    errors.push(isString(newPassword, "New password"));
    errors.push(minLength(newPassword, "New password", PASSWORD_MIN));
    errors.push(maxLength(newPassword, "New password", PASSWORD_MAX));
  }

  // confirmPassword — presence + max
  errors.push(required(confirmPassword, "Confirm password"));
  if (confirmPassword !== undefined) {
    errors.push(isString(confirmPassword, "Confirm password"));
    errors.push(maxLength(confirmPassword, "Confirm password", PASSWORD_MAX));
  }

  return errors.filter(Boolean);
};
