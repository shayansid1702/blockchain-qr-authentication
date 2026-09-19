const { pool } = require("../config/db");

const UserModel = {
  async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  },

  async findById(userId) {
    const [rows] = await pool.query(
      "SELECT user_id, full_name, email, role, is_active, created_at FROM users WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Creates a user row. Runs inside a caller-supplied connection when part
   * of a larger transaction (e.g. manufacturer self-registration, which
   * creates both a user row and a manufacturers row atomically).
   */
  async create({ fullName, email, passwordHash, role }, conn = pool) {
    const [result] = await conn.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [fullName, email, passwordHash, role]
    );
    return result.insertId;
  },
};

module.exports = UserModel;
