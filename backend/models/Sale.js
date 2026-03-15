/*
 * Model for interacting with the `sales` table.
 * Provides functionality to record a sale and calculate profit.
 */

const { pool } = require('../config/db');

/**
 * Record a sale and calculate profit.
 *
 * The function calculates gain/loss by subtracting the gadget's recovery
 * target from the selling price. It also updates the gadget's status to 'sold'.
 *
 * @param {Object} saleData - Fields describing the sale.
 * @param {number} saleData.gadgetId - ID of the gadget being sold.
 * @param {number} saleData.selling_price - Amount the gadget was sold for.
 * @param {string|Date} saleData.sold_at - Date/time of sale (ISO string or Date).
 * @param {string|null} saleData.buyer_name - Name of the buyer.
 * @returns {Promise<Object>} An object containing the sale ID and calculated profit.
 */
async function create(saleData) {
  const { gadgetId, selling_price, sold_at, buyer_name = null } = saleData;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT cost_price, status FROM gadgets WHERE id = ? FOR UPDATE',
      [gadgetId]
    );

    if (rows.length === 0) {
      throw new Error('Gadget not found');
    }

    if (rows[0].status === 'sold') {
      throw new Error('Gadget has already been sold');
    }

    const recoveryTarget = rows[0].cost_price;
    const profit = parseFloat(selling_price) - parseFloat(recoveryTarget);

    const insertSql = `INSERT INTO sales (gadget_id, selling_price, sold_at, buyer_name, profit) VALUES (?, ?, ?, ?, ?)`;
    const insertValues = [gadgetId, selling_price, sold_at, buyer_name, profit];
    const [result] = await connection.query(insertSql, insertValues);

    await connection.query('UPDATE gadgets SET status = ? WHERE id = ?', ['sold', gadgetId]);

    await connection.commit();
    return { saleId: result.insertId, profit };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  create
};
