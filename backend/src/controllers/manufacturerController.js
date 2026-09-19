const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const UserModel = require("../models/userModel");
const ManufacturerModel = require("../models/manufacturerModel");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * POST /api/manufacturers
 * Public self-registration: creates a `users` row (role=MANUFACTURER) and a
 * `manufacturers` row together, atomically. The account starts UNAPPROVED --
 * an admin must approve it (see approve() below) before the manufacturer's
 * wallet is authorized on-chain and they can register products.
 */
const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    companyName,
    walletAddress,
    contactEmail,
    contactPhone,
    businessAddress,
  } = req.body;

  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }
  const existingWallet = await ManufacturerModel.findByWallet(walletAddress);
  if (existingWallet) {
    throw new ApiError(409, "This wallet address is already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Both inserts must succeed together, or neither should -- a transaction
  // prevents an orphaned user row with no matching manufacturer profile.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = await UserModel.create(
      { fullName, email, passwordHash, role: "MANUFACTURER" },
      conn
    );
    const manufacturerId = await ManufacturerModel.create(
      { userId, companyName, walletAddress, contactEmail, contactPhone, businessAddress },
      conn
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Registration submitted. An admin must approve your account before you can register products.",
      manufacturerId,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

/** GET /api/manufacturers -- admin only */
const list = asyncHandler(async (req, res) => {
  const manufacturers = await ManufacturerModel.listAll();
  res.json({ success: true, manufacturers });
});

/** PATCH /api/manufacturers/:id/approve -- admin only */
const approve = asyncHandler(async (req, res) => {
  const manufacturer = await ManufacturerModel.findById(req.params.id);
  if (!manufacturer) {
    throw new ApiError(404, "Manufacturer not found");
  }

  await ManufacturerModel.approve(req.params.id, req.user.userId);

  res.json({
    success: true,
    message: `${manufacturer.company_name} approved. Remember to also call authorizeManufacturer() on-chain with their wallet address so the smart contract accepts their registrations.`,
  });
});

module.exports = { register, list, approve };
