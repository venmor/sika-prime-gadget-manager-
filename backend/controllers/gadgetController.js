/*
 * Controller functions for gadget routes.
 *
 * These handlers orchestrate operations across the gadget and spec models
 * and return JSON responses. Each function is async and handles
 * potential errors by sending appropriate HTTP status codes and messages.
 */

const Gadget = require('../models/Gadget');
const LaptopSpec = require('../models/LaptopSpec');
const PhoneSpec = require('../models/PhoneSpec');

/**
 * GET /api/gadgets
 * Retrieve all gadgets with optional query filters (type, status, search).
 */
async function getAllGadgets(req, res) {
  try {
    const gadgets = await Gadget.findAll(req.query);
    res.json(gadgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gadgets' });
  }
}

/**
 * GET /api/gadgets/:id
 * Retrieve a single gadget by ID.
 */
async function getGadgetById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const gadget = await Gadget.findById(id);
    if (!gadget) {
      return res.status(404).json({ error: 'Gadget not found' });
    }
    res.json(gadget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gadget' });
  }
}

/**
 * POST /api/gadgets
 * Create a new gadget with optional specifications. Uses the upload middleware
 * to handle image uploads. The uploaded file is available as `req.file`.
 */
async function createGadget(req, res) {
  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const gadgetData = {
      name: req.body.name,
      type: req.body.type,
      brand: req.body.brand,
      model: req.body.model,
      cost_price: req.body.cost_price,
      status: req.body.status || 'available',
      description: req.body.description
    };
    const gadgetId = await Gadget.create(gadgetData, imagePath);

    // Handle specifications based on type
    if (req.body.type === 'laptop') {
      const specData = {
        processor: req.body.processor,
        ram: req.body.ram,
        storage: req.body.storage,
        screen_size: req.body.screen_size,
        graphics: req.body.graphics
      };
      await LaptopSpec.create(gadgetId, specData);
    } else if (req.body.type === 'phone') {
      const specData = {
        os: req.body.os,
        ram: req.body.ram,
        storage: req.body.storage,
        screen_size: req.body.screen_size,
        camera: req.body.camera,
        battery: req.body.battery
      };
      await PhoneSpec.create(gadgetId, specData);
    }
    const created = await Gadget.findById(gadgetId);
    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create gadget' });
  }
}

/**
 * PUT /api/gadgets/:id
 * Update an existing gadget and its specifications. Accepts optional
 * image upload. Uses upsert semantics for specs: attempts update,
 * inserts if no row exists.
 */
async function updateGadget(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const gadgetData = {
      name: req.body.name,
      type: req.body.type,
      brand: req.body.brand,
      model: req.body.model,
      cost_price: req.body.cost_price,
      status: req.body.status,
      description: req.body.description
    };
    // Remove undefined keys
    Object.keys(gadgetData).forEach(key => gadgetData[key] === undefined && delete gadgetData[key]);

    const updated = await Gadget.update(id, gadgetData, imagePath);

    // Update specification if provided
    if (req.body.type === 'laptop') {
      const specData = {
        processor: req.body.processor,
        ram: req.body.ram,
        storage: req.body.storage,
        screen_size: req.body.screen_size,
        graphics: req.body.graphics
      };
      // Attempt update; if no rows affected, create
      const updatedSpec = await LaptopSpec.update(id, specData);
      if (!updatedSpec) {
        await LaptopSpec.create(id, specData);
      }
    } else if (req.body.type === 'phone') {
      const specData = {
        os: req.body.os,
        ram: req.body.ram,
        storage: req.body.storage,
        screen_size: req.body.screen_size,
        camera: req.body.camera,
        battery: req.body.battery
      };
      const updatedSpec = await PhoneSpec.update(id, specData);
      if (!updatedSpec) {
        await PhoneSpec.create(id, specData);
      }
    }
    const gadget = await Gadget.findById(id);
    res.json(gadget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update gadget' });
  }
}

/**
 * DELETE /api/gadgets/:id
 * Remove a gadget and its dependent records.
 */
async function deleteGadget(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await Gadget.delete(id);
    if (!success) {
      return res.status(404).json({ error: 'Gadget not found' });
    }
    res.json({ message: 'Gadget deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete gadget' });
  }
}

module.exports = {
  getAllGadgets,
  getGadgetById,
  createGadget,
  updateGadget,
  deleteGadget
};