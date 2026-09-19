const { pool } = require("../config/db");
const ProductModel = require("../models/productModel");
const VerificationLogModel = require("../models/verificationLogModel");
const asyncHandler = require("../utils/asyncHandler");

/** GET /api/dashboard/stats -- admin only. */
const stats = asyncHandler(async (req, res) => {
  const productStats = await ProductModel.getStats();

  const [[{ total_manufacturers }]] = await pool.query(
    "SELECT COUNT(*) AS total_manufacturers FROM manufacturers WHERE is_approved = TRUE"
  );

  const totalVerifications = await VerificationLogModel.countAll();

  res.json({
    success: true,
    stats: {
      totalProducts: Number(productStats.total_products) || 0,
      activeProducts: Number(productStats.active_products) || 0,
      revokedProducts: Number(productStats.revoked_products) || 0,
      soldProducts: Number(productStats.sold_products) || 0,
      totalManufacturers: Number(total_manufacturers) || 0,
      totalVerifications: Number(totalVerifications) || 0,
    },
  });
});

module.exports = { stats };
