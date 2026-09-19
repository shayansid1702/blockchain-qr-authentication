const ProductModel = require("../models/productModel");
const ManufacturerModel = require("../models/manufacturerModel");
const VerificationLogModel = require("../models/verificationLogModel");
const BlockchainTransactionModel = require("../models/blockchainTransactionModel");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { generateProductQrCode } = require("../utils/qrGenerator");

/**
 * POST /api/products -- manufacturer only.
 *
 * IMPORTANT: this does NOT write to the blockchain. Per the architecture,
 * the frontend calls registerProduct() directly via the manufacturer's own
 * MetaMask-signed transaction (the backend never holds a manufacturer's
 * private key). This endpoint is called AFTER that transaction confirms,
 * to cache the product in MySQL and log the transaction for the dashboard.
 */
const create = asyncHandler(async (req, res) => {
  const manufacturer = await ManufacturerModel.findByUserId(req.user.userId);
  if (!manufacturer) {
    throw new ApiError(403, "No manufacturer profile found for this account");
  }
  if (!manufacturer.is_approved) {
    throw new ApiError(403, "Your manufacturer account is not yet approved");
  }

  const {
    contractProductId,
    productName,
    brand,
    batchNumber,
    manufacturingDate,
    expiryDate,
    description,
    imageUrl,
    registrationTxHash,
  } = req.body;

  const existing = await ProductModel.findByContractId(contractProductId);
  if (existing) {
    throw new ApiError(409, "A product with this ID is already cached (already registered on-chain)");
  }

  // The QR always encodes the same public verify URL for this product, so
  // it's generated here rather than trusted from the client.
  const qrCodeUrl = await generateProductQrCode(contractProductId);

  const productDbId = await ProductModel.create({
    contractProductId,
    manufacturerId: manufacturer.manufacturer_id,
    productName,
    brand,
    batchNumber,
    manufacturingDate,
    expiryDate,
    description,
    imageUrl,
    qrCodeUrl,
    currentOwnerWallet: manufacturer.wallet_address,
    registrationTxHash,
  });

  await BlockchainTransactionModel.create({
    contractProductId,
    txHash: registrationTxHash,
    txType: "REGISTER",
    fromWallet: manufacturer.wallet_address,
  });

  res.status(201).json({ success: true, productDbId, contractProductId, qrCodeUrl });
});

/**
 * GET /api/products -- authenticated.
 * Manufacturers see only their own products; admins see all.
 */
const list = asyncHandler(async (req, res) => {
  let products;
  if (req.user.role === "ADMIN") {
    products = await ProductModel.listAll();
  } else {
    const manufacturer = await ManufacturerModel.findByUserId(req.user.userId);
    if (!manufacturer) throw new ApiError(403, "No manufacturer profile found for this account");
    products = await ProductModel.listByManufacturer(manufacturer.manufacturer_id);
  }
  res.json({ success: true, products });
});

/**
 * GET /api/products/:id -- PUBLIC. Used by the /verify/:productId page.
 * `:id` is the contract_product_id (the string used on-chain), not the
 * internal auto-increment product_db_id.
 */
const getById = asyncHandler(async (req, res) => {
  const product = await ProductModel.findByContractId(req.params.id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  res.json({ success: true, product });
});

/**
 * POST /api/products/:id/verify -- PUBLIC.
 *
 * The frontend independently verifies authenticity by calling the smart
 * contract directly (productExists/getProduct) -- that on-chain check is
 * the actual source of truth, not this endpoint. This endpoint just logs
 * the verification attempt for analytics/dashboard purposes and returns
 * the DB-cached view as a convenience for the response.
 */
const verify = asyncHandler(async (req, res) => {
  const contractProductId = req.params.id;
  const product = await ProductModel.findByContractId(contractProductId);

  let result;
  if (!product) {
    result = "INVALID";
  } else if (product.status === "REVOKED") {
    result = "REVOKED";
  } else {
    result = "AUTHENTIC";
  }

  await VerificationLogModel.create({
    contractProductId,
    result,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true, result, product: product || null });
});

/** GET /api/products/:id/history -- PUBLIC. App-level tx audit trail. */
const history = asyncHandler(async (req, res) => {
  const transactions = await BlockchainTransactionModel.listByProduct(req.params.id);
  res.json({ success: true, transactions });
});

/**
 * PATCH /api/products/:id/revoke -- manufacturer/admin.
 *
 * Same pattern as create(): the frontend calls revokeProduct() on-chain
 * directly via the caller's own MetaMask-signed transaction first. This
 * endpoint is called AFTER that transaction confirms, to sync the MySQL
 * cache and log the transaction for the dashboard/audit trail.
 */
const revoke = asyncHandler(async (req, res) => {
  const contractProductId = req.params.id;
  const { txHash } = req.body;

  const product = await ProductModel.findByContractId(contractProductId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (req.user.role === "MANUFACTURER") {
    const manufacturer = await ManufacturerModel.findByUserId(req.user.userId);
    if (!manufacturer || manufacturer.manufacturer_id !== product.manufacturer_id) {
      throw new ApiError(403, "You can only revoke products your account registered");
    }
  }

  await ProductModel.updateStatus(contractProductId, "REVOKED");

  await BlockchainTransactionModel.create({
    contractProductId,
    txHash,
    txType: "REVOKE",
    fromWallet: product.current_owner_wallet,
  });

  res.json({ success: true, message: "Product revoked" });
});

/**
 * PATCH /api/products/:id/transfer -- current owner only (checked on-chain
 * before this is called; here we just sync the cache).
 */
const transfer = asyncHandler(async (req, res) => {
  const contractProductId = req.params.id;
  const { txHash, toWallet } = req.body;

  const product = await ProductModel.findByContractId(contractProductId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const fromWallet = product.current_owner_wallet;
  await ProductModel.updateOwner(contractProductId, toWallet, "SOLD");

  await BlockchainTransactionModel.create({
    contractProductId,
    txHash,
    txType: "TRANSFER",
    fromWallet,
    toWallet,
  });

  res.json({ success: true, message: "Ownership transferred" });
});

module.exports = { create, list, getById, verify, history, revoke, transfer };
