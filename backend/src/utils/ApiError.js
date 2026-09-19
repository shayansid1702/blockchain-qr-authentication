/**
 * A thrown error carrying an HTTP status code, so the central error handler
 * can return the right status instead of always defaulting to 500.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
