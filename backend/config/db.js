/*
 * Database configuration helpers.
 *
 * Loads environment variables, validates the required database settings,
 * creates a shared mysql2 pool, and exposes a small health check used
 * during server startup.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

function getDbEnv() {
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST,
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASS || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE
  };
}

const REQUIRED_ENV_VARS = ['host', 'user', 'database'];

function getMissingDbEnvVars() {
  const dbEnv = getDbEnv();
  return REQUIRED_ENV_VARS.filter((key) => !dbEnv[key]);
}

function createPool() {
  const dbEnv = getDbEnv();
  const missingVars = getMissingDbEnvVars();
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingVars.join(', ')}`
    );
  }

  return mysql.createPool({
    host: dbEnv.host,
    port: Number(dbEnv.port || 3306),
    user: dbEnv.user,
    password: dbEnv.password,
    database: dbEnv.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
  });
}

const pool = createPool();

async function checkDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  checkDatabaseConnection,
  getDbEnv,
  getMissingDbEnvVars
};
