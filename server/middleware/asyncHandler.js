/**
 * asyncHandler
 *
 * Wraps an async Express route handler so that any thrown error (or rejected
 * promise) is automatically forwarded to Express's next(err) — eliminating
 * repetitive try/catch blocks in every controller.
 *
 * Usage:
 *   router.get("/path", asyncHandler(async (req, res) => { ... }));
 *
 * @param {function} fn - async (req, res, next) => any
 * @returns {function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
