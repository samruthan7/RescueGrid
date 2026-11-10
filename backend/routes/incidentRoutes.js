const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

// Public Citizen routes
router.post('/', incidentController.createIncident);
router.get('/:id', incidentController.getIncidentPublicStatus);

module.exports = router;
