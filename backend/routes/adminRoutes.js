const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAuthority } = require('../middleware/auth');

// Public login for demo authority
router.post('/login', adminController.login);

// Protected Authority Endpoints
router.use(authenticateAuthority);

router.get('/incidents', adminController.getIncidents);
router.get('/incidents/:id', adminController.getIncidentById);
router.get('/stats', adminController.getStats);
router.patch('/incidents/:id/status', adminController.updateStatus);
router.patch('/incidents/:id/severity', adminController.overrideSeverity);
router.delete('/incidents/:id', adminController.deleteIncident);

module.exports = router;
