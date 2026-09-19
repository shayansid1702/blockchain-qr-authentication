const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const ManufacturerModel = require("../models/manufacturerModel");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * POST /api/auth/login
 * Works for both ADMIN and MANUFACTURER roles. Customers never log in --
 * the /verify/:productId flow is intentionally public.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await UserModel.findByEmail(email);
  if (!user || !user.is_active) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  const responseUser = {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
  };

  // For manufacturers, include their approval status so the frontend can
  // show a "pending approval" banner instead of letting them try to
  // register products the smart contract will reject anyway.
  if (user.role === "MANUFACTURER") {
    const manufacturer = await ManufacturerModel.findByUserId(user.user_id);
    responseUser.manufacturer = manufacturer
      ? {
          manufacturerId: manufacturer.manufacturer_id,
          companyName: manufacturer.company_name,
          walletAddress: manufacturer.wallet_address,
          isApproved: !!manufacturer.is_approved,
        }
      : null;
  }

  res.json({ success: true, token, user: responseUser });
});

module.exports = { login };
