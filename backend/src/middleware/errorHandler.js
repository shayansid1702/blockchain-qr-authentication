/**
 * Central error handler. Every controller uses asyncHandler(), so any
 * thrown error (ApiError or otherwise) ends up here instead of crashing
 * the process or leaking a raw stack trace to the client.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // MySQL duplicate-entry errors (e.g. unique contract_product_id or email)
  // are translated into a friendly 409 instead of a raw 500.
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
  }

  // Always log server-side so production errors are visible in host logs --
  // only the client-facing message below is sanitized for 500s.
  console.error(err);

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
}

module.exports = errorHandler;
