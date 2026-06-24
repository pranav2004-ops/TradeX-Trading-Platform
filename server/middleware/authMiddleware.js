import jwt from "jsonwebtoken";

/**
 * protect
 *
 * Authentication middleware — verifies the JWT from the Authorization header
 * and attaches the decoded payload to req.user.
 *
 * All errors are forwarded to next(err) so the global error handler in
 * errorHandler.js formats and returns a consistent JSON response.
 * No inline res.status() calls are made here.
 */
const protect = (req, res, next) => {
  // Expect:  Authorization: Bearer <token>
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer")
  ) {
    const err = new Error("No token provided");
    err.statusCode = 401;
    return next(err);
  }

  const token = req.headers.authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError —
    // both are already classified by the global error handler.
    // Forward the original jwt error so the handler can use its name.
    next(error);
  }
};

export default protect;