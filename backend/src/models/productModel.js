const { pool } = require("../config/db");

const ProductModel = {
  async create({
    contractProductId,
    manufacturerId,
    productName,
    brand,
    batchNumber,
    manufacturingDate,
    expiryDate,
    description,
    imageUrl,
    qrCodeUrl,
    currentOwnerWallet,
    registrationTxHash,
  }) {
    const [result] = await pool.query(
      `INSERT INTO products
        (contract_product_id, manufacturer_id, product_name, brand, batch_number,
         manufacturing_date, expiry_date, description, image_url, qr_code_url,
         current_owner_wallet, registration_tx_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        contractProductId,
        manufacturerId,
        productName,
        brand,
        batchNumber,
        manufacturingDate,
        expiryDate || null,
        description || null,
        imageUrl || null,
        qrCodeUrl || null,
        currentOwnerWallet,
        registrationTxHash,
      ]
    );
    return result.insertId;
  },

  async findByContractId(contractProductId) {
    const [rows] = await pool.query(
      `SELECT p.*, m.company_name AS manufacturer_name
       FROM products p
       JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
       WHERE p.contract_product_id = ? LIMIT 1`,
      [contractProductId]
    );
    return rows[0] || null;
  },

  async listByManufacturer(manufacturerId) {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE manufacturer_id = ? ORDER BY created_at DESC",
      [manufacturerId]
    );
    return rows;
  },

  async listAll() {
    const [rows] = await pool.query(
      `SELECT p.*, m.company_name AS manufacturer_name
       FROM products p
       JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
       ORDER BY p.created_at DESC`
    );
    return rows;
  },

  async updateStatus(contractProductId, status) {
    await pool.query(
      "UPDATE products SET status = ? WHERE contract_product_id = ?",
      [status, contractProductId]
    );
  },

  async updateOwner(contractProductId, newOwnerWallet, status = "SOLD") {
    await pool.query(
      "UPDATE products SET current_owner_wallet = ?, status = ? WHERE contract_product_id = ?",
      [newOwnerWallet, status, contractProductId]
    );
  },

  async getStats() {
    const [[totals]] = await pool.query(
      `SELECT
         COUNT(*) AS total_products,
         SUM(status = 'ACTIVE') AS active_products,
         SUM(status = 'REVOKED') AS revoked_products,
         SUM(status = 'SOLD') AS sold_products
       FROM products`
    );
    return totals;
  },
};

module.exports = ProductModel;
