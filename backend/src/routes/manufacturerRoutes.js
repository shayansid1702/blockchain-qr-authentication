const express = require("express");
const { body } = require("express-validator");
const { register, list, approve } = require("../controllers/manufacturerController");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Public: manufacturer self-registration (pending admin approval)
router.post(
  "/",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("A valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("companyName").trim().notEmpty().withMessage("Company name is required"),
    body("walletAddress")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("A valid Ethereum wallet address is required"),
  ],
  validate,
  register
);

// Admin only: list all manufacturers
router.get("/", requireAuth, requireRole("ADMIN"), list);

// Admin only: approve a pending manufacturer
router.patch("/:id/approve", requireAuth, requireRole("ADMIN"), approve);

module.exports = router;
