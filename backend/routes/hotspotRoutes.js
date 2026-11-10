const express = require('express');
const router = express.Router();
const hotspotController = require('../controllers/hotspotController');

// Public proximity endpoint for citizen warning banner
router.get('/nearby', hotspotController.getNearbyHotspots);

module.exports = router;
