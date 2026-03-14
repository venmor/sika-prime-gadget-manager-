/*
 * Database configuration.
 *
 * This module exports a MySQL connection pool using mysql2/promise.
 * The pool uses environment variables defined in the `.env` file to
 * configure the database host, user, password and database name.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a connection pool for re‑use across the application
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sikaprime',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;