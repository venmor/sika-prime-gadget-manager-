const { hydrateSessionUser } = require('../services/sessionUserService');

/*
 * Authentication middleware to protect routes.
 *
 * Ensures that a valid session exists before allowing access to protected
 * resources. If no session user is found the middleware responds with
 * a 401 Unauthorized status. Use this middleware on API routes that
 * require authentication.
 */

async function ensureAuthenticated(req, res, next) {
  try {
    if (req.session && req.session.user) {
      await hydrateSessionUser(req);
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to verify session' });
  }
}

async function ensureAdmin(req, res, next) {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionUser = await hydrateSessionUser(req);
    if (sessionUser?.role === 'admin') {
      return next();
    }

    return res.status(403).json({ error: 'Admin access required' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to verify admin access' });
  }
}

module.exports = {
  ensureAdmin,
  ensureAuthenticated
};
