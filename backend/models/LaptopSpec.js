/*
 * Model for interacting with the `laptop_specs` table.
 * Provides methods to create or update specification details associated
 * with a laptop gadget. The functions rely on the shared connection
 * pool exported from `config/db.js`.
 */

const pool = require('../config/db');

/**
 * Create a new laptop specification entry.
 *
 * @param {number} gadgetId - Foreign key referencing the gadget.
 * @param {Object} specData - Specification fields: processor, ram, storage, screen_size, graphics.
 * @returns {Promise<number>} ID of the inserted row.
 */
async function create(gadgetId, specData) {
  const { processor = null, ram = null, storage = null, screen_size = null, graphics = null } = specData;
  const sql = `INSERT INTO laptop_specs (gadget_id, processor, ram, storage, screen_size, graphics) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [gadgetId, processor, ram, storage, screen_size, graphics];
  const [result] = await pool.query(sql, values);
  return result.insertId;
}

/**
 * Update an existing laptop specification entry. Assumes one row per gadget.
 *
 * @param {number} gadgetId - Gadget ID whose specs are being updated.
 * @param {Object} specData - Specification fields to update.
 * @returns {Promise<boolean>} True if a row was updated.
 */
async function update(gadgetId, specData) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(specData)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) {
    return false;
  }
  values.push(gadgetId);
  const sql = `UPDATE laptop_specs SET ${fields.join(', ')} WHERE gadget_id = ?`;
  const [result] = await pool.query(sql, values);
  return result.affectedRows > 0;
}

module.exports = {
  create,
  update
};