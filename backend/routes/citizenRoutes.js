const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const citizenController = require('../controllers/citizenController');
const { authenticateCitizen } = require('../middleware/citizenAuth');

// Rate limiting for citizen auth to prevent automated abuse
const citizenLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please wait a few minutes before trying again.'
  }
});

// Citizen Auth routes
router.post('/login', citizenLoginLimiter, citizenController.login);
router.get('/me', authenticateCitizen, citizenController.getMe);
router.get('/incidents', authenticateCitizen, citizenController.getMyIncidents);

module.exports = router;
