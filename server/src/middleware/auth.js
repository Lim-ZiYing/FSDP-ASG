const jwt = require('jsonwebtoken');

// Use on any route that needs a logged-in user.
// The client sends:  Authorization: Bearer <token>
// After this runs, req.user = { userId, role }
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Log in again.' });
  }
}

// Use after requireAuth to limit a route to certain roles.
// Example:  router.get('/orders', requireAuth, requireRole('hawker'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have access to this page" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
