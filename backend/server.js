/*
 * Entry point for the backend server.
 *
 * This file sets up an Express application with common middleware,
 * configures CORS, serves static files from the frontend's `public` folder,
 * and defines a basic health check route. Additional API routes will be
 * registered in later sections.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors()); // enable CORS for all routes
app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse URL‑encoded bodies

// Session middleware – required for authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sika-prime-secret',
    resave: false,
    saveUninitialized: false,
    // cookie settings can be customized; secure: true should be set when using HTTPS
    cookie: {
      // In production set secure: true and sameSite appropriately
      secure: false,
      httpOnly: true
    }
  })
);

// Serve static files from the frontend/public directory
const publicPath = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(publicPath));

// Basic route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import routes and auth utilities
const gadgetRoutes = require('./routes/gadgetRoutes');
const salesRoutes = require('./routes/salesRoutes');
const authController = require('./controllers/authController');
const { ensureAuthenticated } = require('./middleware/auth');

// Authentication endpoints
app.post('/api/login', authController.login);
app.post('/api/logout', authController.logout);

// Protect API routes with authentication middleware
app.use('/api/gadgets', ensureAuthenticated, gadgetRoutes);
app.use('/api/sales', ensureAuthenticated, salesRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});