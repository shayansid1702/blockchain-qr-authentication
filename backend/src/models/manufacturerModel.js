const { pool } = require("../config/db");

const ManufacturerModel = {
  async create(
    { userId, companyName, walletAddress, contactEmail, contactPhone, businessAddress },
    conn = pool
  ) {
    const [result] = await conn.query(
      `INSERT INTO manufacturers
        (user_id, company_name, wallet_address, contact_email, contact_phone, business_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, companyName, walletAddress, contactEmail, contactPhone, businessAddress]
    );
    return result.insertId;
  },

  async findById(manufacturerId) {
    const [rows] = await pool.query(
      `SELECT m.*, u.full_name, u.email
       FROM manufacturers m
       JOIN users u ON u.user_id = m.user_id
       WHERE m.manufacturer_id = ? LIMIT 1`,
      [manufacturerId]
    );
    return rows[0] || null;
  },

  async findByUserId(userId) {
    const [rows] = await pool.query(
      "SELECT * FROM manufacturers WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return rows[0] || null;
  },

  async findByWallet(walletAddress) {
    const [rows] = await pool.query(
      "SELECT * FROM manufacturers WHERE wallet_address = ? LIMIT 1",
      [walletAddress]
    );
    return rows[0] || null;
  },

  async listAll() {
    const [rows] = await pool.query(
      `SELECT m.manufacturer_id, m.company_name, m.wallet_address, m.contact_email,
              m.contact_phone, m.is_approved, m.created_at, u.full_name, u.email
       FROM manufacturers m
       JOIN users u ON u.user_id = m.user_id
       ORDER BY m.created_at DESC`
    );
    return rows;
  },

  async approve(manufacturerId, approvedByUserId) {
    await pool.query(
      `UPDATE manufacturers
       SET is_approved = TRUE, approved_by = ?, approved_at = NOW()
       WHERE manufacturer_id = ?`,
      [approvedByUserId, manufacturerId]
    );
  },
};

module.exports = ManufacturerModel;
