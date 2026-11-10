const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const incidentController = require('../controllers/incidentController');
const { authenticateCitizen } = require('../middleware/citizenAuth');

// Configure multer memory storage with 50 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Rate limiting for video uploads per IP
const videoUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 video uploads per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many video uploads submitted. Please wait a few minutes before uploading again.'
  }
});

// Public Live Privacy-Safe Map endpoint
router.get('/public-map', incidentController.getPublicMapIncidents);

// Step 1: Create incident draft (protected citizen route)
router.post('/', authenticateCitizen, incidentController.createIncident);

// Step 2: Upload mandatory incident video and activate incident (protected citizen route)
router.post(
  '/:id/video',
  authenticateCitizen,
  videoUploadLimiter,
  upload.single('video'),
  incidentController.uploadVideo
);

// Public Citizen incident tracking endpoint
router.get('/:id', incidentController.getIncidentPublicStatus);

module.exports = router;
