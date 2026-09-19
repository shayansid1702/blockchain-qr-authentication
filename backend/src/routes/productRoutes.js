const express = require("express");
const { body } = require("express-validator");
const { create, list, getById, verify, history, revoke, transfer } = require("../controllers/productController");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Public routes -- used by the customer-facing /verify/:productId page.
// No auth: a customer scanning a QR code never logs in.
router.get("/:id", getById);
router.post("/:id/verify", verify);
router.get("/:id/history", history);

// Manufacturer/Admin routes
router.get("/", requireAuth, requireRole("MANUFACTURER", "ADMIN"), list);

router.post(
  "/",
  requireAuth,
  requireRole("MANUFACTURER"),
  [
    body("contractProductId").trim().notEmpty().withMessage("contractProductId is required"),
    body("productName").trim().notEmpty().withMessage("productName is required"),
    body("brand").trim().notEmpty().withMessage("brand is required"),
    body("batchNumber").trim().notEmpty().withMessage("batchNumber is required"),
    body("manufacturingDate").isISO8601().withMessage("manufacturingDate must be a valid date"),
    body("expiryDate").optional({ nullable: true }).isISO8601(),
    body("registrationTxHash")
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage("registrationTxHash must be a valid transaction hash"),
  ],
  validate,
  create
);

router.patch(
  "/:id/revoke",
  requireAuth,
  requireRole("MANUFACTURER", "ADMIN"),
  [
    body("txHash")
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage("txHash must be a valid transaction hash"),
  ],
  validate,
  revoke
);

router.patch(
  "/:id/transfer",
  requireAuth,
  requireRole("MANUFACTURER", "ADMIN"),
  [
    body("txHash")
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage("txHash must be a valid transaction hash"),
    body("toWallet")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("toWallet must be a valid wallet address"),
  ],
  validate,
  transfer
);

module.exports = router;
