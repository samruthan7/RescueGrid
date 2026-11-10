const repository = require('../repositories');
const { calculateDistance } = require('../services/hotspotService');

/**
 * Authority endpoint: Get all hotspot alerts (active, acknowledged, resolved)
 */
async function getAllHotspots(req, res, next) {
  try {
    const all = await repository.getAllHotspots();
    const active = all.filter(h => h.status === 'active' || h.status === 'acknowledged');

    return res.json({
      total: all.length,
      activeCount: active.length,
      hotspots: all
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Authority endpoint: Acknowledge or Resolve a hotspot alert
 */
async function updateHotspotStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'acknowledged', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const existing = await repository.getHotspotById(id);
    if (!existing) {
      return res.status(404).json({
        error: `Hotspot alert with ID '${id}' was not found.`
      });
    }

    const updated = await repository.updateHotspot(id, { status });

    return res.json({
      message: `Hotspot alert marked as ${status}.`,
      hotspot: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public endpoint: Proximity check to warn citizens if they are in/near an active hotspot
 */
async function getNearbyHotspots(req, res, next) {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Query parameters lat and lng are required.'
      });
    }

    const queryLat = parseFloat(lat);
    const queryLng = parseFloat(lng);
    const queryRadius = radius ? parseFloat(radius) : 1000; // default 1km

    if (isNaN(queryLat) || isNaN(queryLng)) {
      return res.status(400).json({
        error: 'lat and lng must be valid floating point numbers.'
      });
    }

    const activeHotspots = await repository.getActiveHotspots();

    const matching = activeHotspots.filter(h => {
      const dist = calculateDistance(queryLat, queryLng, h.centerLat, h.centerLng);
      // Considered near if user coordinate is within (hotspot.radiusM + queryRadius)
      return dist <= (h.radiusM || 1000) + queryRadius;
    });

    const inHotspot = matching.length > 0;

    return res.json({
      inHotspot,
      count: matching.length,
      hotspots: matching.map(h => ({
        id: h.id,
        category: h.category,
        severity: h.severity,
        status: h.status,
        reportCount: h.reportCount,
        radiusM: h.radiusM,
        distanceM: Math.round(calculateDistance(queryLat, queryLng, h.centerLat, h.centerLng))
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllHotspots,
  updateHotspotStatus,
  getNearbyHotspots
};
