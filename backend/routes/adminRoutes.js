const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const hotspotController = require('../controllers/hotspotController');
const incidentController = require('../controllers/incidentController');
const analyticsController = require('../controllers/analyticsController');
const assistantController = require('../controllers/assistantController');
const { authenticateAuthority } = require('../middleware/auth');
const teamController = require('../controllers/teamController');
const rateLimit = require('express-rate-limit');
const routeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// Public login for demo authority
router.post('/login', adminController.login);

// Local streaming route (accessible by video player)
router.get('/incidents/:id/video-stream', incidentController.streamVideoLocal);

// Protected Authority Endpoints
router.use(authenticateAuthority);

router.get('/incidents', adminController.getIncidents);
router.get('/incidents/:id', adminController.getIncidentById);
router.get('/stats', adminController.getStats);
router.patch('/incidents/:id/status', adminController.updateStatus);
router.patch('/incidents/:id/severity', adminController.overrideSeverity);
router.patch('/incidents/:id/assignment', teamController.assign);
router.get('/incidents/:id/recommended-teams', teamController.recommend);
router.post('/incidents/:id/assign', teamController.assign);
router.post('/incidents/:id/unassign', teamController.unassign);
router.get('/incidents/:id/assignment-history', teamController.history);
router.post('/dispatch/auto', teamController.autoDispatch);
router.get('/route', routeLimiter, teamController.route);
router.get('/teams', teamController.list);
router.get('/teams/:id', teamController.get);
router.post('/teams', teamController.create);
router.patch('/teams/:id', teamController.update);
router.delete('/teams/:id', teamController.remove);
router.delete('/incidents/:id', adminController.deleteIncident);

// Video Evidence Signed URL
router.get('/incidents/:id/video-url', incidentController.getVideoPlaybackUrl);

// Hotspot Alert Operations
router.get('/hotspots', hotspotController.getAllHotspots);
router.patch('/hotspots/:id', hotspotController.updateHotspotStatus);

// Analytics & Reports
router.get('/analytics', analyticsController.getAnalytics);
router.get('/export/csv', analyticsController.exportIncidentsCsv);

// Operations Assistant
router.post('/assistant/chat', assistantController.chatAuthority);

module.exports = router;
