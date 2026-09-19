/**
 * Wraps an async Express route handler so any rejected promise (thrown
 * error) is automatically forwarded to next(), instead of every controller
 * needing its own try/catch around every database or bcrypt call.
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
