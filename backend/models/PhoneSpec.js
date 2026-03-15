/*
 * Model for interacting with the `phone_specs` table.
 * Provides methods to create or update specification details associated
 * with a phone gadget. Functions leverage the shared connection pool.
 */

const { pool } = require('../config/db');

function getExecutor(executor) {
  return executor || pool;
}

/**
 * Create a new phone specification entry.
 *
 * @param {number} gadgetId - Foreign key referencing the gadget.
 * @param {Object} specData - Specification fields: os, ram, storage, screen_size, camera, battery.
 * @returns {Promise<number>} ID of the inserted row.
 */
async function create(gadgetId, specData, executor) {
  const {
    os = null,
    ram = null,
    storage = null,
    screen_size = null,
    camera = null,
    battery = null
  } = specData;
  const sql = `INSERT INTO phone_specs (gadget_id, os, ram, storage, screen_size, camera, battery) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const values = [gadgetId, os, ram, storage, screen_size, camera, battery];
  const [result] = await getExecutor(executor).query(sql, values);
  return result.insertId;
}

/**
 * Update an existing phone specification entry. Assumes one row per gadget.
 *
 * @param {number} gadgetId - Gadget ID whose specs are being updated.
 * @param {Object} specData - Specification fields to update.
 * @returns {Promise<boolean>} True if a row was updated.
 */
async function update(gadgetId, specData, executor) {
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
  const sql = `UPDATE phone_specs SET ${fields.join(', ')} WHERE gadget_id = ?`;
  const [result] = await getExecutor(executor).query(sql, values);
  return result.affectedRows > 0;
}

async function removeByGadgetId(gadgetId, executor) {
  await getExecutor(executor).query('DELETE FROM phone_specs WHERE gadget_id = ?', [gadgetId]);
}

module.exports = {
  create,
  update,
  removeByGadgetId
};
