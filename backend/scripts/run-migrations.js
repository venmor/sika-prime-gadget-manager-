const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'database', 'migrations');

function getDbEnv() {
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST,
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASS || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE
  };
}

function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'));

  return files.sort((left, right) => {
    if (left === 'create_tables.sql') return -1;
    if (right === 'create_tables.sql') return 1;
    return left.localeCompare(right);
  });
}

async function waitForDatabase(config, retries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true
      });
      await connection.ping();
      await connection.end();
      return;
    } catch (error) {
      if (connection) {
        await connection.end().catch(() => {});
      }

      if (attempt === retries) {
        throw error;
      }

      console.log(`Waiting for database (${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function runMigrations() {
  const config = getDbEnv();
  const missing = ['host', 'user', 'database']
    .filter((key) => config[key] == null || config[key] === '');

  if (missing.length > 0) {
    throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  }

  await waitForDatabase(config);

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true
  });

  try {
    const files = getMigrationFiles();

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8').trim();

      if (!sql) {
        continue;
      }

      console.log(`Applying migration: ${file}`);
      await connection.query(sql);
    }

    console.log('Migrations complete.');
  } finally {
    await connection.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed.');
  console.error(error.message);
  process.exit(1);
});
