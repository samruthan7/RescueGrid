const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rescuegrid-hackathon-secret-key-2026-secure';

function authenticateAuthority(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid authorization token. Please log in as Authority.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Session expired or invalid token. Please log in again.'
    });
  }
}

module.exports = {
  authenticateAuthority,
  JWT_SECRET
};
