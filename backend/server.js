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

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors()); // enable CORS for all routes
app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse URL‑encoded bodies

// Serve static files from the frontend/public directory
const publicPath = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(publicPath));

// Basic route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Import and mount API routes (gadgets, sales) here in later sections

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});