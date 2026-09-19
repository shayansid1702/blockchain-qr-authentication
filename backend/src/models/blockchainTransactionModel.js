const { pool } = require("../config/db");

const BlockchainTransactionModel = {
  async create({
    contractProductId,
    txHash,
    txType,
    fromWallet,
    toWallet,
    status = "CONFIRMED",
    gasUsed = null,
    blockNumber = null,
  }) {
    const [res] = await pool.query(
      `INSERT INTO blockchain_transactions
        (contract_product_id, tx_hash, tx_type, from_wallet, to_wallet, status, gas_used, block_number, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [contractProductId, txHash, txType, fromWallet, toWallet || null, status, gasUsed, blockNumber]
    );
    return res.insertId;
  },

  async listByProduct(contractProductId) {
    const [rows] = await pool.query(
      "SELECT * FROM blockchain_transactions WHERE contract_product_id = ? ORDER BY created_at ASC",
      [contractProductId]
    );
    return rows;
  },

  async listAll(limit = 50) {
    const [rows] = await pool.query(
      "SELECT * FROM blockchain_transactions ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
    return rows;
  },
};

module.exports = BlockchainTransactionModel;
