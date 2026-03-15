/*
 * Express router for gadget endpoints.
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const gadgetController = require('../controllers/gadgetController');

// GET /api/gadgets – list all gadgets with optional filters
router.get('/', gadgetController.getAllGadgets);

// GET /api/gadgets/deleted-history – list soft-deleted gadgets for history views
router.get('/deleted-history', gadgetController.getDeletedGadgets);

// GET /api/gadgets/:id – get a single gadget
router.get('/:id', gadgetController.getGadgetById);

// POST /api/gadgets/:id/restore – restore a soft-deleted gadget
router.post('/:id/restore', gadgetController.restoreGadget);

// POST /api/gadgets – create a new gadget (with image upload)
router.post('/', upload.single('image'), gadgetController.createGadget);

// PUT /api/gadgets/:id – update an existing gadget (with optional image upload)
router.put('/:id', upload.single('image'), gadgetController.updateGadget);

// DELETE /api/gadgets/:id – delete a gadget
router.delete('/:id', gadgetController.deleteGadget);

module.exports = router;
