/*
 * Express router for sales endpoints.
 */

const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// POST /api/sales – record a sale
router.post('/', salesController.recordSale);

// GET /api/sales – retrieve sales report
router.get('/', salesController.getSalesReport);

module.exports = router;