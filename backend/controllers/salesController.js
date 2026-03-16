/*
 * Controller functions for sales routes.
 */

const Sale = require('../models/Sale');
const { pool } = require('../config/db');
const { sendErrorResponse } = require('../utils/controllerHelpers');

/**
 * POST /api/sales
 * Record a sale and return the calculated profit.
 */
async function recordSale(req, res) {
  try {
    const parsedDate = req.body.sold_at ? new Date(req.body.sold_at) : new Date();
    const saleData = {
      gadgetId: parseInt(req.body.gadgetId, 10),
      selling_price: parseFloat(req.body.selling_price),
      sold_at: parsedDate,
      buyer_name: req.body.buyer_name || null
    };

    if (
      !Number.isInteger(saleData.gadgetId) ||
      Number.isNaN(saleData.selling_price) ||
      Number.isNaN(parsedDate.getTime())
    ) {
      return res.status(400).json({ error: 'Invalid sale payload' });
    }

    const { saleId, profit } = await Sale.create(saleData);
    res.status(201).json({ saleId, profit });
  } catch (error) {
    if (error.message === 'Gadget not found') {
      error.statusCode = 404;
      return sendErrorResponse(res, error, 'Failed to record sale');
    }
    if (error.message === 'Gadget has already been sold') {
      error.statusCode = 409;
      return sendErrorResponse(res, error, 'Failed to record sale');
    }
    return sendErrorResponse(res, error, 'Failed to record sale');
  }
}

/**
 * GET /api/sales
 * Optionally returns a sales report with gadget information and profit.
 */
async function getSalesReport(req, res) {
  try {
    const sql = `
      SELECT
        s.*,
        g.name AS gadget_name,
        g.type AS gadget_type,
        g.brand,
        g.model,
        g.cost_price AS recovery_target,
        g.deleted_at,
        g.deleted_by
      FROM sales s
      JOIN gadgets g ON s.gadget_id = g.id
      ORDER BY s.sold_at DESC
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch sales report');
  }
}

module.exports = {
  recordSale,
  getSalesReport
};
