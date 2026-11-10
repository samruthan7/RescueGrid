const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rescuegrid-hackathon-secret-key-2026-secure';

function authenticateCitizen(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid citizen authorization token. Please log in as a citizen.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'citizen') {
      return res.status(403).json({
        error: 'Forbidden: Access restricted to citizen accounts.'
      });
    }
    req.citizen = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Session expired or invalid citizen token. Please log in again.'
    });
  }
}

function optionalCitizenAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.role === 'citizen') {
        req.citizen = decoded;
      }
    } catch (e) {
      // Ignored for optional
    }
  }
  next();
}

module.exports = {
  authenticateCitizen,
  optionalCitizenAuth,
  JWT_SECRET
};
