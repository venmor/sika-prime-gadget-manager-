const { pool } = require('../config/db');

function getExecutor(executor) {
  return executor || pool;
}

async function findByIdentifier(identifier, executor) {
  const sql = `
    SELECT *
    FROM users
    WHERE is_active = 1
      AND (
        LOWER(username) = LOWER(?)
        OR LOWER(COALESCE(email, '')) = LOWER(?)
      )
    LIMIT 1
  `;
  const [rows] = await getExecutor(executor).query(sql, [identifier, identifier]);
  return rows[0] || null;
}

async function findById(id, executor) {
  const [rows] = await getExecutor(executor).query(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function listAll(executor) {
  const sql = `
    SELECT
      id,
      email,
      username,
      full_name,
      role,
      must_change_password,
      is_active,
      last_login_at,
      created_by,
      created_at
    FROM users
    ORDER BY
      CASE role WHEN 'admin' THEN 0 ELSE 1 END,
      COALESCE(full_name, username),
      username
  `;
  const [rows] = await getExecutor(executor).query(sql);
  return rows;
}

async function create(userData, executor) {
  const {
    email,
    username,
    full_name = null,
    password_hash,
    role = 'staff',
    must_change_password = true,
    is_active = true,
    created_by = null
  } = userData;

  const sql = `
    INSERT INTO users (
      email,
      username,
      full_name,
      password_hash,
      role,
      must_change_password,
      is_active,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    email,
    username,
    full_name,
    password_hash,
    role,
    must_change_password ? 1 : 0,
    is_active ? 1 : 0,
    created_by
  ];
  const [result] = await getExecutor(executor).query(sql, values);
  return result.insertId;
}

async function updateLastLogin(id, executor) {
  await getExecutor(executor).query(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [id]
  );
}

async function update(id, fieldValues, executor) {
  const fields = [];
  const values = [];

  for (const [field, value] of Object.entries(fieldValues)) {
    fields.push(`${field} = ?`);
    values.push(value);
  }

  if (!fields.length) {
    return false;
  }

  values.push(id);
  const [result] = await getExecutor(executor).query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

async function resetPassword(id, passwordHash, { mustChangePassword = true } = {}, executor) {
  const [result] = await getExecutor(executor).query(
    'UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?',
    [passwordHash, mustChangePassword ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}

async function countUsers(executor) {
  const [rows] = await getExecutor(executor).query('SELECT COUNT(*) AS total FROM users');
  return rows[0]?.total || 0;
}

module.exports = {
  countUsers,
  create,
  findById,
  findByIdentifier,
  listAll,
  resetPassword,
  update,
  updateLastLogin
};
