const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

/**
 * Verifies the Bearer JWT on protected routes and attaches the decoded
 * payload ({ userId, role }) to req.user for downstream handlers.
 * Public routes (e.g. the customer verification endpoints) never use this.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Missing or malformed Authorization header"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, role }
    next();
  } catch (err) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

/**
 * Role-based authorization. Use AFTER requireAuth.
 * Example: router.post('/products', requireAuth, requireRole('MANUFACTURER'), ...)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
