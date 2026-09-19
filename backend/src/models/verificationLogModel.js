const { pool } = require("../config/db");

const VerificationLogModel = {
  async create({ contractProductId, result, ipAddress, userAgent }) {
    const [res] = await pool.query(
      `INSERT INTO verification_logs (contract_product_id, result, ip_address, user_agent)
       VALUES (?, ?, ?, ?)`,
      [contractProductId, result, ipAddress || null, userAgent || null]
    );
    return res.insertId;
  },

  async listByProduct(contractProductId) {
    const [rows] = await pool.query(
      "SELECT * FROM verification_logs WHERE contract_product_id = ? ORDER BY verified_at DESC",
      [contractProductId]
    );
    return rows;
  },

  async countAll() {
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM verification_logs"
    );
    return total;
  },
};

module.exports = VerificationLogModel;
