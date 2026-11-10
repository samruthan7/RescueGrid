const repository = require('../repositories');

const HOTSPOT_RADIUS_METERS = parseInt(process.env.HOTSPOT_RADIUS_METERS || '1000', 10);
const HOTSPOT_WINDOW_MINUTES = parseInt(process.env.HOTSPOT_WINDOW_MINUTES || '60', 10);
const HOTSPOT_MIN_REPORTS = parseInt(process.env.HOTSPOT_MIN_REPORTS || '3', 10);

const SEVERITY_RANKS = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
};

const RANK_TO_SEVERITY = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical'
};

/**
 * Calculates great-circle distance between two coordinates in meters (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates geographic center as arithmetic mean of coordinates
 */
function calculateClusterCenter(incidents) {
  if (!incidents || incidents.length === 0) return { lat: 0, lng: 0 };
  let sumLat = 0;
  let sumLng = 0;
  let validCount = 0;

  for (const inc of incidents) {
    const lat = inc.latitude !== undefined && inc.latitude !== null ? Number(inc.latitude) : (inc.lat !== undefined ? Number(inc.lat) : null);
    const lng = inc.longitude !== undefined && inc.longitude !== null ? Number(inc.longitude) : (inc.lng !== undefined ? Number(inc.lng) : null);
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      sumLat += lat;
      sumLng += lng;
      validCount++;
    }
  }

  if (validCount === 0) return { lat: 0, lng: 0 };
  return {
    lat: Number((sumLat / validCount).toFixed(6)),
    lng: Number((sumLng / validCount).toFixed(6))
  };
}

/**
 * Determines cluster severity:
 * - Max severity among member incidents
 * - Escalates one level (capped at Critical) if report count >= 2 * minReports
 */
function determineClusterSeverity(memberSeverities = [], count = 0, minReports = HOTSPOT_MIN_REPORTS) {
  let maxRank = 1;
  for (const sev of memberSeverities) {
    const rank = SEVERITY_RANKS[sev] || 1;
    if (rank > maxRank) maxRank = rank;
  }

  // Escalation rule: 2x threshold escalates 1 level
  if (count >= minReports * 2) {
    maxRank = Math.min(maxRank + 1, 4);
  }

  return RANK_TO_SEVERITY[maxRank] || 'High';
}

/**
 * Identifies the dominant or shared emergency category in the cluster
 */
function determineDominantCategory(categories = []) {
  if (!categories || categories.length === 0) return 'General Emergency';
  const counts = {};
  for (const cat of categories) {
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
  }

  let topCat = 'General Emergency';
  let maxCount = 0;
  for (const [cat, cnt] of Object.entries(counts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      topCat = cat;
    }
  }
  return topCat;
}

/**
 * Filter incidents within the time window
 */
function filterIncidentsInWindow(incidents = [], windowMinutes = HOTSPOT_WINDOW_MINUTES, now = Date.now()) {
  const windowMs = windowMinutes * 60 * 1000;
  return incidents.filter(inc => {
    const time = new Date(inc.createdAt || inc.created_at || now).getTime();
    return now - time <= windowMs;
  });
}

/**
 * Main Hotspot Detection Engine:
 * - Checks if new incident triggers or updates a spatial cluster
 * - Upserts active hotspot alert
 * - Resolves expired hotspot alerts
 */
async function checkHotspots(newIncident) {
  const lat = newIncident.latitude !== undefined && newIncident.latitude !== null ? Number(newIncident.latitude) : (newIncident.lat !== undefined ? Number(newIncident.lat) : null);
  const lng = newIncident.longitude !== undefined && newIncident.longitude !== null ? Number(newIncident.longitude) : (newIncident.lng !== undefined ? Number(newIncident.lng) : null);

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  const now = Date.now();
  const since = new Date(now - HOTSPOT_WINDOW_MINUTES * 60 * 1000).toISOString();

  // 1. Query incidents in radius & time window
  let nearby = [];
  try {
    nearby = await repository.getIncidentsWithin({
      lat,
      lng,
      radiusM: HOTSPOT_RADIUS_METERS,
      since
    });
  } catch (err) {
    console.warn('[HotspotService] getIncidentsWithin error, fallback to manual scan:', err.message);
    const all = await repository.getAll();
    nearby = all.filter(inc => {
      if (inc.latitude === null || inc.longitude === null) return false;
      const inWindow = new Date(inc.createdAt).getTime() >= new Date(since).getTime();
      if (!inWindow) return false;
      const dist = calculateDistance(lat, lng, inc.latitude, inc.longitude);
      return dist <= HOTSPOT_RADIUS_METERS;
    });
  }

  // Ensure new incident is included in the cluster calculation
  const foundInNearby = nearby.some(i => i.id === newIncident.id);
  if (!foundInNearby) {
    nearby.push(newIncident);
  }

  // Filter out any duplicates
  const uniqueMap = new Map();
  for (const inc of nearby) {
    if (inc.id) uniqueMap.set(inc.id, inc);
  }
  const clusterIncidents = Array.from(uniqueMap.values());

  let triggeredHotspot = null;

  // 2. Check if cluster threshold is met
  if (clusterIncidents.length >= HOTSPOT_MIN_REPORTS) {
    const center = calculateClusterCenter(clusterIncidents);
    const severities = clusterIncidents.map(i => i.severityOverride || i.finalSeverity || i.severity || 'Low');
    const categories = clusterIncidents.map(i => i.category);

    const severity = determineClusterSeverity(severities, clusterIncidents.length, HOTSPOT_MIN_REPORTS);
    const category = determineDominantCategory(categories);
    const incidentIds = clusterIncidents.map(i => i.id);

    // 3. Check for existing active or acknowledged hotspot to update
    const activeHotspots = await repository.getActiveHotspots();
    let existingAlert = null;

    for (const h of activeHotspots) {
      // Overlaps if incident IDs intersect or centers are within HOTSPOT_RADIUS_METERS
      const sharesIncident = h.incidentIds && h.incidentIds.some(id => incidentIds.includes(id));
      const dist = calculateDistance(center.lat, center.lng, h.centerLat, h.centerLng);
      if (sharesIncident || dist <= HOTSPOT_RADIUS_METERS) {
        existingAlert = h;
        break;
      }
    }

    if (existingAlert) {
      const mergedIds = Array.from(new Set([...(existingAlert.incidentIds || []), ...incidentIds]));
      triggeredHotspot = await repository.updateHotspot(existingAlert.id, {
        centerLat: center.lat,
        centerLng: center.lng,
        radiusM: HOTSPOT_RADIUS_METERS,
        incidentIds: mergedIds,
        reportCount: mergedIds.length,
        category,
        severity,
        status: existingAlert.status // maintain active/acknowledged
      });
      console.log(`[HotspotService] Updated existing hotspot ${existingAlert.id}: ${mergedIds.length} incidents, severity ${severity}`);
    } else {
      triggeredHotspot = await repository.createHotspot({
        centerLat: center.lat,
        centerLng: center.lng,
        radiusM: HOTSPOT_RADIUS_METERS,
        incidentIds,
        reportCount: incidentIds.length,
        category,
        severity,
        status: 'active'
      });
      console.log(`[HotspotService] Triggered NEW hotspot alert ${triggeredHotspot.id}: ${incidentIds.length} reports in ${category}`);
    }
  }

  // 4. Resolve outdated hotspots whose reports are now outside the window
  try {
    const allActive = await repository.getActiveHotspots();
    for (const h of allActive) {
      // Check if alert was updated or created within window
      const alertAgeMs = now - new Date(h.updatedAt || h.createdAt).getTime();
      if (alertAgeMs > HOTSPOT_WINDOW_MINUTES * 60 * 1000) {
        await repository.updateHotspot(h.id, { status: 'resolved' });
        console.log(`[HotspotService] Auto-resolved outdated hotspot ${h.id}`);
      }
    }
  } catch (resErr) {
    console.warn('[HotspotService] Hotspot expiration cleanup non-critical error:', resErr.message);
  }

  return triggeredHotspot;
}

module.exports = {
  calculateDistance,
  calculateClusterCenter,
  determineClusterSeverity,
  determineDominantCategory,
  filterIncidentsInWindow,
  checkHotspots,
  HOTSPOT_RADIUS_METERS,
  HOTSPOT_WINDOW_MINUTES,
  HOTSPOT_MIN_REPORTS
};
