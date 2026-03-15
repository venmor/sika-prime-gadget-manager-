const express = require('express');

const adExportController = require('../controllers/adExportController');

const router = express.Router();

router.post('/export', adExportController.exportAdPng);

module.exports = router;
