/*
 * Model for interacting with the `gadgets` table.
 *
 * Each function is async and returns a Promise that resolves with the
 * query results. The functions use the shared connection pool from
 * `config/db.js` so connections are automatically managed.
 */

const { pool } = require('../config/db');

function getExecutor(executor) {
  return executor || pool;
}

/**
 * Insert a new gadget into the database.
 *
 * @param {Object} gadgetData - Data describing the gadget.
 * @param {string} imagePath - Relative path to the uploaded image.
 * @returns {Promise<number>} The ID of the newly inserted gadget.
 */
async function create(gadgetData, imagePath, executor) {
  const {
    name,
    type,
    brand = null,
    model = null,
    cost_price,
    list_price = null,
    status = 'available',
    description = null,
    other_specs = null
  } = gadgetData;

  const sql = `INSERT INTO gadgets (name, type, brand, model, cost_price, list_price, status, image_path, description, other_specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [name, type, brand, model, cost_price, list_price, status, imagePath, description, other_specs];
  const [result] = await getExecutor(executor).query(sql, values);
  return result.insertId;
}

/**
 * Retrieve all gadgets with optional filters. Joins laptop and phone specs.
 *
 * @param {Object} filters - Optional filters (type, status, search).
 * @returns {Promise<Array>} Array of gadget rows with joined specs.
 */
async function findAll(filters = {}, executor) {
  const conditions = [];
  const values = [];

  if (!filters.includeDeleted) {
    conditions.push('g.deleted_at IS NULL');
  }

  if (filters.type) {
    conditions.push('g.type = ?');
    values.push(filters.type);
  }
  if (filters.status) {
    conditions.push('g.status = ?');
    values.push(filters.status);
  }
  if (filters.search) {
    // Simple search by name or brand
    conditions.push('(g.name LIKE ? OR g.brand LIKE ? OR g.model LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    values.push(searchTerm, searchTerm, searchTerm);
  }

  let whereClause = '';
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  const sql = `
    SELECT
      g.*, 
      l.processor AS laptop_processor,
      l.ram AS laptop_ram,
      l.storage AS laptop_storage,
      l.battery_hours AS laptop_battery_hours,
      l.screen_size AS laptop_screen_size,
      l.graphics AS laptop_graphics,
      p.os AS phone_os,
      p.ram AS phone_ram,
      p.storage AS phone_storage,
      p.screen_size AS phone_screen_size,
      p.camera AS phone_camera,
      p.battery AS phone_battery
    FROM gadgets g
    LEFT JOIN laptop_specs l ON g.id = l.gadget_id
    LEFT JOIN phone_specs p ON g.id = p.gadget_id
    ${whereClause}
    ORDER BY g.created_at DESC
  `;
  const [rows] = await getExecutor(executor).query(sql, values);
  return rows;
}

/**
 * Find a single gadget by its ID, including spec details.
 *
 * @param {number} id - Gadget ID.
 * @returns {Promise<Object|null>} The gadget row with spec details or null if not found.
 */
async function findById(id, executor, options = {}) {
  const includeDeleted = options.includeDeleted === true;
  const sql = `
    SELECT
      g.*, 
      l.processor AS laptop_processor,
      l.ram AS laptop_ram,
      l.storage AS laptop_storage,
      l.battery_hours AS laptop_battery_hours,
      l.screen_size AS laptop_screen_size,
      l.graphics AS laptop_graphics,
      p.os AS phone_os,
      p.ram AS phone_ram,
      p.storage AS phone_storage,
      p.screen_size AS phone_screen_size,
      p.camera AS phone_camera,
      p.battery AS phone_battery
    FROM gadgets g
    LEFT JOIN laptop_specs l ON g.id = l.gadget_id
    LEFT JOIN phone_specs p ON g.id = p.gadget_id
    WHERE g.id = ?
      ${includeDeleted ? '' : 'AND g.deleted_at IS NULL'}
    LIMIT 1
  `;
  const [rows] = await getExecutor(executor).query(sql, [id]);
  return rows[0] || null;
}

/**
 * Update a gadget's core information.
 *
 * Note: This function only updates the `gadgets` table. It does not modify
 * related specification tables; those should be handled via LaptopSpec or
 * PhoneSpec models.
 *
 * @param {number} id - Gadget ID.
 * @param {Object} gadgetData - Fields to update.
 * @param {string|null} imagePath - New image path if provided.
 * @returns {Promise<boolean>} True if any rows were updated.
 */
async function update(id, gadgetData, imagePath = null, executor) {
  // Build dynamic SET clause based on provided fields
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(gadgetData)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (imagePath) {
    fields.push('image_path = ?');
    values.push(imagePath);
  }

  if (fields.length === 0) {
    return false; // nothing to update
  }

  values.push(id);
  const sql = `UPDATE gadgets SET ${fields.join(', ')} WHERE id = ?`;
  await getExecutor(executor).query(sql, values);
  return true;
}

/**
 * Delete a gadget by ID. Cascading deletes will remove related specs and sales.
 *
 * @param {number} id - Gadget ID.
 * @returns {Promise<boolean>} True if a row was deleted.
 */
async function remove(id, deletedBy = null, executor) {
  const [result] = await getExecutor(executor).query(
    'UPDATE gadgets SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
    [deletedBy, id]
  );
  return result.affectedRows > 0;
}

async function restore(id, executor) {
  const [result] = await getExecutor(executor).query(
    'UPDATE gadgets SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL',
    [id]
  );
  return result.affectedRows > 0;
}

async function findDeleted(executor) {
  const sql = `
    SELECT
      g.id,
      g.name,
      g.type,
      g.brand,
      g.model,
      g.status,
      g.deleted_at,
      g.deleted_by,
      g.cost_price,
      g.list_price
    FROM gadgets g
    WHERE g.deleted_at IS NOT NULL
    ORDER BY g.deleted_at DESC
  `;
  const [rows] = await getExecutor(executor).query(sql);
  return rows;
}

module.exports = {
  create,
  findAll,
  findById,
  findDeleted,
  restore,
  update,
  delete: remove
};
