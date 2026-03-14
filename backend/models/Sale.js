/*
 * Model for interacting with the `sales` table.
 * Provides functionality to record a sale and calculate profit.
 */

const pool = require('../config/db');

/**
 * Record a sale and calculate profit.
 *
 * The function calculates profit by subtracting the gadget's cost price
 * from the selling price. It also updates the gadget's status to 'sold'.
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
  // Retrieve the gadget's cost price
  const [rows] = await pool.query('SELECT cost_price FROM gadgets WHERE id = ?', [gadgetId]);
  if (rows.length === 0) {
    throw new Error('Gadget not found');
  }
  const costPrice = rows[0].cost_price;
  const profit = parseFloat(selling_price) - parseFloat(costPrice);

  // Insert the sale record
  const insertSql = `INSERT INTO sales (gadget_id, selling_price, sold_at, buyer_name, profit) VALUES (?, ?, ?, ?, ?)`;
  const insertValues = [gadgetId, selling_price, sold_at, buyer_name, profit];
  const [result] = await pool.query(insertSql, insertValues);

  // Update gadget status to 'sold'
  await pool.query('UPDATE gadgets SET status = ? WHERE id = ?', ['sold', gadgetId]);

  return { saleId: result.insertId, profit };
}

module.exports = {
  create
};