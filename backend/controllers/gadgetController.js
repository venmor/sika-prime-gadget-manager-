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
const { pool } = require('../config/db');

const ALLOWED_TYPES = new Set(['laptop', 'phone', 'other']);

function buildValidationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function parsePrice(value, fieldName, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw buildValidationError(`${fieldName} is required`);
    }
    return null;
  }

  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    throw buildValidationError(`${fieldName} must be a valid non-negative number`);
  }

  return parsedValue;
}

function validateSpecData(type, body) {
  if (type === 'laptop') {
    return {
      processor: normalizeText(body.processor),
      ram: normalizeText(body.ram),
      storage: normalizeText(body.storage),
      battery_hours: normalizeText(body.battery_hours),
      screen_size: normalizeText(body.screen_size),
      graphics: normalizeText(body.graphics)
    };
  }

  if (type === 'phone') {
    return {
      os: normalizeText(body.os),
      ram: normalizeText(body.ram),
      storage: normalizeText(body.storage),
      screen_size: normalizeText(body.screen_size),
      camera: normalizeText(body.camera),
      battery: normalizeText(body.battery)
    };
  }

  return {
    other_specs: normalizeText(body.other_specs)
  };
}

function validateGadgetPayload(body) {
  const name = normalizeText(body.name);
  const type = normalizeText(body.type);

  if (!name) {
    throw buildValidationError('Name is required');
  }

  if (!type || !ALLOWED_TYPES.has(type)) {
    throw buildValidationError('Type must be laptop, phone, or other');
  }

  const specData = validateSpecData(type, body);

  return {
    gadgetData: {
      name,
      type,
      brand: normalizeText(body.brand),
      model: normalizeText(body.model),
      cost_price: parsePrice(body.cost_price, 'Recovery target', { required: true }),
      list_price: parsePrice(body.list_price, 'List price'),
      description: normalizeText(body.description),
      other_specs: type === 'other' ? specData.other_specs : null
    },
    specData
  };
}

async function saveSpecs(connection, gadgetId, type, specData) {
  if (type === 'laptop') {
    await PhoneSpec.removeByGadgetId(gadgetId, connection);
    const updated = await LaptopSpec.update(gadgetId, specData, connection);
    if (!updated) {
      await LaptopSpec.create(gadgetId, specData, connection);
    }
    return;
  }

  if (type === 'phone') {
    await LaptopSpec.removeByGadgetId(gadgetId, connection);
    const updated = await PhoneSpec.update(gadgetId, specData, connection);
    if (!updated) {
      await PhoneSpec.create(gadgetId, specData, connection);
    }
    return;
  }

  await LaptopSpec.removeByGadgetId(gadgetId, connection);
  await PhoneSpec.removeByGadgetId(gadgetId, connection);
}

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
 * GET /api/gadgets/deleted-history
 * Retrieve gadgets that have been removed from inventory but kept for history.
 */
async function getDeletedGadgets(req, res) {
  try {
    const gadgets = await Gadget.findDeleted();
    res.json(gadgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch deleted gadget history' });
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
  let connection;
  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const { gadgetData, specData } = validateGadgetPayload(req.body);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const gadgetId = await Gadget.create(gadgetData, imagePath, connection);
    await saveSpecs(connection, gadgetId, gadgetData.type, specData);
    await connection.commit();
    const created = await Gadget.findById(gadgetId);
    res.status(201).json(created);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create gadget' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * PUT /api/gadgets/:id
 * Update an existing gadget and its specifications. Accepts optional
 * image upload. Uses upsert semantics for specs: attempts update,
 * inserts if no row exists.
 */
async function updateGadget(req, res) {
  let connection;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      throw buildValidationError('Invalid gadget id');
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const { gadgetData, specData } = validateGadgetPayload(req.body);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existingGadget = await Gadget.findById(id, connection);
    if (!existingGadget) {
      throw buildValidationError('Gadget not found', 404);
    }

    gadgetData.status = existingGadget.status;
    const updated = await Gadget.update(id, gadgetData, imagePath, connection);
    if (!updated) {
      throw buildValidationError('Failed to update gadget');
    }

    await saveSpecs(connection, id, gadgetData.type, specData);
    await connection.commit();
    const gadget = await Gadget.findById(id);
    res.json(gadget);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update gadget' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * DELETE /api/gadgets/:id
 * Remove a gadget and its dependent records.
 */
async function deleteGadget(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      throw buildValidationError('Invalid gadget id');
    }
    const deletedBy = req.session?.user?.username || 'system';
    const success = await Gadget.delete(id, deletedBy);
    if (!success) {
      return res.status(404).json({ error: 'Gadget not found' });
    }
    res.json({ message: 'Gadget deleted', deletedBy });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to delete gadget' });
  }
}

/**
 * POST /api/gadgets/:id/restore
 * Restore a previously deleted gadget back into inventory visibility.
 */
async function restoreGadget(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      throw buildValidationError('Invalid gadget id');
    }

    const restored = await Gadget.restore(id);
    if (!restored) {
      return res.status(404).json({ error: 'Deleted gadget not found' });
    }

    const gadget = await Gadget.findById(id);
    res.json({
      message: 'Gadget restored',
      gadget
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to restore gadget' });
  }
}

module.exports = {
  getAllGadgets,
  getDeletedGadgets,
  getGadgetById,
  createGadget,
  updateGadget,
  deleteGadget,
  restoreGadget
};
