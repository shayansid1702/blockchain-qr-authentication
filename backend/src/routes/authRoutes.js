const express = require("express");
const { body } = require("express-validator");
const { login } = require("../controllers/authController");
const validate = require("../middleware/validate");

const router = express.Router();

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

module.exports = router;
