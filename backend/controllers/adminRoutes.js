const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

// Works whether auth.js exports a function directly or an object
const authModule = require('../middleware/auth');
const requireAuth =
  typeof authModule === 'function'
    ? authModule
    : authModule.authenticate ||
      authModule.verifyToken ||
      authModule.requireAuth ||
      authModule.auth;

// ---------- Public routes (no token needed) ----------
router.post('/login', authController.login);
router.post('/register', authController.register);

// ---------- Protected routes (token required) ----------
router.use(requireAuth);

router.get('/stats', adminController.getStats);
router.get('/incidents', adminController.getIncidents);
router.get('/incidents/:id', adminController.getIncidentById);

// accepts both PATCH and PUT, since I don't know which your frontend uses
router.route('/incidents/:id/status')
  .patch(adminController.updateStatus)
  .put(adminController.updateStatus);

router.route('/incidents/:id/severity')
  .patch(adminController.overrideSeverity)
  .put(adminController.overrideSeverity);

router.delete('/incidents/:id', adminController.deleteIncident);

module.exports = router;