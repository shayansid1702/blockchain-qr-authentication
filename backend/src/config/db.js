const mysql = require("mysql2/promise");
require("dotenv").config();

// A connection pool is used instead of a single connection so the API can
// safely handle many concurrent requests without exhausting MySQL's
// connection limit or blocking on a single in-flight query.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "blockchain_qr_auth",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as strings instead of JS Date objects
});

/**
 * Quick startup check so a misconfigured .env fails loudly and immediately,
 * rather than as a confusing error on the first API request.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("✅ MySQL connected:", process.env.DB_NAME);
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error(
      "   Check backend/.env DB_HOST/DB_USER/DB_PASSWORD/DB_NAME and that MySQL is running."
    );
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
