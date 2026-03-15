const dotenv = require('dotenv');

dotenv.config();

const { pool, checkDatabaseConnection } = require('./config/db');
const { createApp } = require('./app');
const { ensureBootstrapAdminUser } = require('./services/userBootstrapService');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await checkDatabaseConnection();
    await ensureBootstrapAdminUser();
    const app = createApp();
    return app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server.');
    console.error(error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

startServer();
