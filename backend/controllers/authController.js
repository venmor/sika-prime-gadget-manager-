/*
 * Controller functions for handling authentication.
 *
 * Provides login and logout endpoints using session‑based authentication. The
 * login endpoint validates the provided username and password against
 * environment variables (`ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`). The
 * password should be stored as a bcrypt hash in the environment for
 * security. Upon successful login a session is created. The logout
 * endpoint destroys the session.
 */

const bcrypt = require('bcryptjs');

/**
 * POST /api/login
 * Authenticate the user and start a session.
 */
async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminUser || !adminHash) {
    console.error('Admin credentials are not configured in environment');
    return res.status(500).json({ error: 'Authentication not configured' });
  }
  if (username !== adminUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  try {
    const match = await bcrypt.compare(password, adminHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Set session user
    req.session.user = { username };
    return res.json({ message: 'Login successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * POST /api/logout
 * Destroy the current session.
 */
function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out' });
  });
}

module.exports = {
  login,
  logout
};