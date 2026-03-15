async function run() {
  let pool;
  try {
    const db = require('../config/db');
    pool = db.pool;
    const { checkDatabaseConnection } = db;
    await checkDatabaseConnection();
    console.log('Database connection successful.');
  } catch (error) {
    console.error('Database connection failed.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

run();
