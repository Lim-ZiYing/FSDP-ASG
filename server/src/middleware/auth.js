const jwt = require('jsonwebtoken');

// Use on any route that needs a logged-in user.
// The client sends:  Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { userId, role }
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

module.exports = { requireAuth };
