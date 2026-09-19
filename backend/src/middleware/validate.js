const { validationResult } = require("express-validator");

/**
 * Runs after an array of express-validator checks on a route. If any check
 * failed, returns a 400 with a clear list of field-level errors instead of
 * letting bad data reach the controller/database.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
