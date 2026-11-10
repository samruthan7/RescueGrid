const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const assistantController = require('../controllers/assistantController');
const { authenticateCitizen } = require('../middleware/citizenAuth');

const chatRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Too many messages sent. Please wait a moment before sending another message.' }
});

// Citizen assistant route
router.post('/chat', authenticateCitizen, chatRateLimiter, assistantController.chatCitizen);

module.exports = router;
