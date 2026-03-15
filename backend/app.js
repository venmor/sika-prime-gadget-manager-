const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const createFileStore = require('session-file-store');

const gadgetRoutes = require('./routes/gadgetRoutes');
const salesRoutes = require('./routes/salesRoutes');
const adExportRoutes = require('./routes/adExportRoutes');
const userRoutes = require('./routes/userRoutes');
const authController = require('./controllers/authController');
const { ensureAuthenticated } = require('./middleware/auth');
const { checkDatabaseConnection, getDbEnv } = require('./config/db');

function requireSessionSecret() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be configured before starting the server');
  }
}

function resolveSessionsPath() {
  return process.env.SESSIONS_DIR?.trim() || path.join(__dirname, '.sessions');
}

function resolveUploadsPath() {
  return process.env.UPLOADS_DIR?.trim() || path.join(__dirname, '..', 'frontend', 'public', 'uploads');
}

function buildSessionStore(sessionModule, options = {}) {
  if (options.sessionStore) {
    return options.sessionStore;
  }

  const FileStore = createFileStore(sessionModule);
  const sessionsPath = resolveSessionsPath();
  fs.mkdirSync(sessionsPath, { recursive: true });
  return new FileStore({
    path: sessionsPath,
    retries: 0
  });
}

function createApp(options = {}) {
  requireSessionSecret();

  const app = express();
  const uploadsPath = resolveUploadsPath();
  const publicPath = path.join(__dirname, '..', 'frontend', 'public');
  const viewsPath = path.join(__dirname, '..', 'frontend', 'views');
  const sessionStore = buildSessionStore(session, options);
  const isProduction = process.env.NODE_ENV === 'production';

  fs.mkdirSync(uploadsPath, { recursive: true });

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(cors());
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));
  app.use(
    session({
      name: 'sika.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      unset: 'destroy',
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    })
  );

  app.use('/uploads', express.static(uploadsPath));
  app.use(express.static(publicPath));

  function sendView(viewName) {
    return (req, res) => {
      res.sendFile(path.join(viewsPath, viewName));
    };
  }

  app.get('/', sendView('login.html'));
  app.get('/login.html', sendView('login.html'));
  app.get('/index.html', sendView('index.html'));
  app.get('/add-gadget.html', sendView('add-gadget.html'));
  app.get('/gadget-detail.html', sendView('gadget-detail.html'));
  app.get('/sales-report.html', sendView('sales-report.html'));
  app.get('/users.html', sendView('users.html'));

  app.get('/api/health', (req, res) => {
    const dbEnv = getDbEnv();
    const dbConfigured = Boolean(dbEnv.host && dbEnv.user && dbEnv.database);
    res.json({ status: 'ok', databaseConfigured: dbConfigured });
  });

  app.post('/api/login', authController.login);
  app.post('/api/logout', authController.logout);
  app.get('/api/session', ensureAuthenticated, authController.getSessionUser);

  app.use('/api/gadgets', ensureAuthenticated, gadgetRoutes);
  app.use('/api/sales', ensureAuthenticated, salesRoutes);
  app.use('/api/ads', ensureAuthenticated, adExportRoutes);
  app.use('/api/users', ensureAuthenticated, userRoutes);

  app.get('/api/health/db', async (req, res) => {
    try {
      await checkDatabaseConnection();
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      console.error('Database health check failed:', error.message);
      res.status(503).json({ status: 'error', database: 'unavailable', error: error.message });
    }
  });

  return app;
}

module.exports = {
  createApp
};
