/*
 * Authentication middleware to protect routes.
 *
 * Ensures that a valid session exists before allowing access to protected
 * resources. If no session user is found the middleware responds with
 * a 401 Unauthorized status. Use this middleware on API routes that
 * require authentication.
 */

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = {
  ensureAuthenticated
};