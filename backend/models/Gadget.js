/*
 * Model for interacting with the `gadgets` table.
 *
 * Each function is async and returns a Promise that resolves with the
 * query results. The functions use the shared connection pool from
 * `config/db.js` so connections are automatically managed.
 */

const pool = require('../config/db');

/**
 * Insert a new gadget into the database.
 *
 * @param {Object} gadgetData - Data describing the gadget.
 * @param {string} imagePath - Relative path to the uploaded image.
 * @returns {Promise<number>} The ID of the newly inserted gadget.
 */
async function create(gadgetData, imagePath) {
  const {
    name,
    type,
    brand = null,
    model = null,
    cost_price,
    status = 'available',
    description = null
  } = gadgetData;

  const sql = `INSERT INTO gadgets (name, type, brand, model, cost_price, status, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [name, type, brand, model, cost_price, status, imagePath, description];
  const [result] = await pool.query(sql, values);
  return result.insertId;
}

/**
 * Retrieve all gadgets with optional filters. Joins laptop and phone specs.
 *
 * @param {Object} filters - Optional filters (type, status, search).
 * @returns {Promise<Array>} Array of gadget rows with joined specs.
 */
async function findAll(filters = {}) {
  const conditions = [];
  const values = [];

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
  const [rows] = await pool.query(sql, values);
  return rows;
}

/**
 * Find a single gadget by its ID, including spec details.
 *
 * @param {number} id - Gadget ID.
 * @returns {Promise<Object|null>} The gadget row with spec details or null if not found.
 */
async function findById(id) {
  const sql = `
    SELECT
      g.*, 
      l.processor AS laptop_processor,
      l.ram AS laptop_ram,
      l.storage AS laptop_storage,
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
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [id]);
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
async function update(id, gadgetData, imagePath = null) {
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
  const [result] = await pool.query(sql, values);
  return result.affectedRows > 0;
}

/**
 * Delete a gadget by ID. Cascading deletes will remove related specs and sales.
 *
 * @param {number} id - Gadget ID.
 * @returns {Promise<boolean>} True if a row was deleted.
 */
async function remove(id) {
  const [result] = await pool.query('DELETE FROM gadgets WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: remove
};