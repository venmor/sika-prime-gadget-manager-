/*
 * Controller functions for sales routes.
 */

const Sale = require('../models/Sale');
const pool = require('../config/db');

/**
 * POST /api/sales
 * Record a sale and return the calculated profit.
 */
async function recordSale(req, res) {
  try {
    const saleData = {
      gadgetId: parseInt(req.body.gadgetId, 10),
      selling_price: parseFloat(req.body.selling_price),
      sold_at: req.body.sold_at || new Date(),
      buyer_name: req.body.buyer_name || null
    };
    const { saleId, profit } = await Sale.create(saleData);
    res.status(201).json({ saleId, profit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record sale' });
  }
}

/**
 * GET /api/sales
 * Optionally returns a sales report with gadget information and profit.
 */
async function getSalesReport(req, res) {
  try {
    const sql = `
      SELECT s.*, g.name AS gadget_name, g.type AS gadget_type, g.brand, g.model
      FROM sales s
      JOIN gadgets g ON s.gadget_id = g.id
      ORDER BY s.sold_at DESC
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
}

module.exports = {
  recordSale,
  getSalesReport
};