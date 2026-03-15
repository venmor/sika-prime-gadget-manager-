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

const User = require('../models/User');
const { getBootstrapAdminConfig, isMissingUsersTableError } = require('../services/userBootstrapService');
const { buildSessionUser } = require('../services/sessionUserService');

async function tryLegacyAdminLogin(identifier, password) {
  const config = getBootstrapAdminConfig();
  if (!config) {
    return null;
  }

  const matchesIdentifier = identifier === config.username || (config.email && identifier === config.email);
  if (!matchesIdentifier) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, config.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: null,
    email: config.email,
    username: config.username,
    full_name: 'System Administrator',
    role: 'admin',
    must_change_password: false
  };
}

/**
 * POST /api/login
 * Authenticate the user and start a session.
 */
async function login(req, res) {
  const body = req.body || {};
  const identifier = String(body.identifier || body.username || body.email || '').trim();
  const password = body.password;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Missing email/username or password' });
  }

  try {
    let user = null;

    try {
      user = await User.findByIdentifier(identifier);
    } catch (error) {
      if (!isMissingUsersTableError(error)) {
        throw error;
      }
    }

    if (!user) {
      user = await tryLegacyAdminLogin(identifier, password);
    } else {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      await User.updateLastLogin(user.id);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = buildSessionUser(user);
    return res.json({
      message: 'Login successful',
      user: req.session.user,
      mustChangePassword: req.session.user.mustChangePassword
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function getSessionUser(req, res) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ user: req.session.user });
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
  getSessionUser,
  login,
  logout
};
