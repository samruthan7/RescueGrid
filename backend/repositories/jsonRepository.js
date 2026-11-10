const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { calculatePriority } = require('../priority');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'incidents.json');
const CITIZENS_FILE = path.join(DATA_DIR, 'citizens.json');
const HOTSPOTS_FILE = path.join(DATA_DIR, 'hotspots.json');
const MEDIA_FILE = path.join(DATA_DIR, 'media.json');

function normalizeLegacyStatus(incident) {
  return { ...incident, status: incident.status === 'Pending' ? 'Reported' : incident.status,
    statusHistory: (incident.statusHistory || []).map(h => h.status === 'Pending' ? { ...h, status: 'Reported' } : h) };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class JsonIncidentRepository {
  constructor() {
    this._ensureFileExists();
    this._ensureCitizensFileExists();
    this._ensureHotspotsFileExists();
    this._ensureMediaFileExists();
  }

  _ensureFileExists() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[JsonRepository] Error ensuring data file exists:', err);
    }
  }

  _ensureCitizensFileExists() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(CITIZENS_FILE)) {
        fs.writeFileSync(CITIZENS_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[JsonRepository] Error ensuring citizens file exists:', err);
    }
  }

  _ensureHotspotsFileExists() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(HOTSPOTS_FILE)) {
        fs.writeFileSync(HOTSPOTS_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[JsonRepository] Error ensuring hotspots file exists:', err);
    }
  }

  _ensureMediaFileExists() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(MEDIA_FILE)) {
        fs.writeFileSync(MEDIA_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[JsonRepository] Error ensuring media file exists:', err);
    }
  }

  _readMedia() {
    this._ensureMediaFileExists();
    try {
      const data = fs.readFileSync(MEDIA_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[JsonRepository] Error reading media.json:', err);
      return [];
    }
  }

  _writeMedia(mediaItems) {
    this._ensureMediaFileExists();
    const tempFile = `${MEDIA_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(mediaItems, null, 2), 'utf-8');
      fs.renameSync(tempFile, MEDIA_FILE);
      return true;
    } catch (err) {
      console.error('[JsonRepository] Error saving media:', err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw new Error('Failed to persist media data to JSON repository');
    }
  }

  _readAll() {
    this._ensureFileExists();
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[JsonRepository] Error reading incidents.json, returning empty array:', err);
      return [];
    }
  }

  _writeAll(incidents) {
    this._ensureFileExists();
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(incidents, null, 2), 'utf-8');
      fs.renameSync(tempFile, DATA_FILE);
      return true;
    } catch (err) {
      console.error('[JsonRepository] Error saving incidents:', err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw new Error('Failed to persist incident data to JSON repository');
    }
  }

  _readCitizens() {
    this._ensureCitizensFileExists();
    try {
      const data = fs.readFileSync(CITIZENS_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[JsonRepository] Error reading citizens.json:', err);
      return [];
    }
  }

  _writeCitizens(citizens) {
    this._ensureCitizensFileExists();
    const tempFile = `${CITIZENS_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(citizens, null, 2), 'utf-8');
      fs.renameSync(tempFile, CITIZENS_FILE);
      return true;
    } catch (err) {
      console.error('[JsonRepository] Error saving citizens:', err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw new Error('Failed to persist citizens data to JSON repository');
    }
  }

  _readHotspots() {
    this._ensureHotspotsFileExists();
    try {
      const data = fs.readFileSync(HOTSPOTS_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[JsonRepository] Error reading hotspots.json:', err);
      return [];
    }
  }

  _writeHotspots(hotspots) {
    this._ensureHotspotsFileExists();
    const tempFile = `${HOTSPOTS_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(hotspots, null, 2), 'utf-8');
      fs.renameSync(tempFile, HOTSPOTS_FILE);
      return true;
    } catch (err) {
      console.error('[JsonRepository] Error saving hotspots:', err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw new Error('Failed to persist hotspots data to JSON repository');
    }
  }

  generateId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `INC-${suffix}`;
  }

  async getAll({ search, category, severity, status, sort, includeDrafts = false } = {}) {
    let items = this._readAll().map(normalizeLegacyStatus);
    items = items.map(inc => ({ ...inc, ...(() => { const p = calculatePriority(inc); return { priorityScore: p.score, priorityLabel: p.label, priorityBreakdown: p.breakdown }; })() }));

    // Incomplete drafts never reach the authority queue
    if (!includeDrafts) {
      items = items.filter(inc => !inc.isDraft && inc.status !== 'Draft');
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      items = items.filter(inc => {
        return (
          (inc.id && inc.id.toLowerCase().includes(term)) ||
          (inc.title && inc.title.toLowerCase().includes(term)) ||
          (inc.description && inc.description.toLowerCase().includes(term)) ||
          (inc.location && inc.location.toLowerCase().includes(term))
        );
      });
    }

    if (category && category !== 'All') {
      items = items.filter(inc => inc.category === category);
    }

    if (severity && severity !== 'All') {
      items = items.filter(inc => {
        const effectiveSeverity = inc.severityOverride || inc.severity;
        return effectiveSeverity === severity;
      });
    }

    if (status && status !== 'All') {
      items = items.filter(inc => inc.status === status);
    }

    const severityRank = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1
    };

    if (sort === 'severity') {
      items.sort((a, b) => {
        const rankA = severityRank[a.severityOverride || a.severity] || 0;
        const rankB = severityRank[b.severityOverride || b.severity] || 0;
        if (rankB !== rankA) {
          return rankB - rankA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      items.sort((a, b) => {
        const isCritA = (a.severityOverride || a.severity) === 'Critical' ? 1 : 0;
        const isCritB = (b.severityOverride || b.severity) === 'Critical' ? 1 : 0;
        if (isCritB !== isCritA) {
          return isCritB - isCritA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return items;
  }

  async getById(id) {
    if (!id) return null;
    const items = this._readAll();
    const found = items.find(inc => inc.id.toUpperCase() === id.toUpperCase()) || null;
    return found ? normalizeLegacyStatus(found) : null;
  }

  async getByCitizenId(citizenId) {
    if (!citizenId) return [];
    const items = this._readAll();
    return items.map(normalizeLegacyStatus)
      .filter(inc => inc.citizenId === citizenId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async upsertCitizen({ name, phone }) {
    if (!phone) throw new Error('Phone is required for citizen upsert');
    const citizens = this._readCitizens();
    const existingIndex = citizens.findIndex(c => c.phone === phone);
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      citizens[existingIndex].name = name;
      citizens[existingIndex].updatedAt = now;
      this._writeCitizens(citizens);
      return citizens[existingIndex];
    }

    const newCitizen = {
      id: crypto.randomUUID(),
      name,
      phone,
      createdAt: now,
      updatedAt: now
    };
    citizens.push(newCitizen);
    this._writeCitizens(citizens);
    return newCitizen;
  }

  async create(incidentData) {
    const items = this._readAll().map(normalizeLegacyStatus);
    const id = incidentData.id || this.generateId();
    const now = new Date().toISOString();

    const newIncident = {
      id,
      citizenId: incidentData.citizenId || null,
      title: incidentData.title,
      description: incidentData.description,
      category: incidentData.category,
      location: incidentData.location,
      latitude: incidentData.latitude !== undefined ? incidentData.latitude : null,
      longitude: incidentData.longitude !== undefined ? incidentData.longitude : null,
      peopleAffected: incidentData.peopleAffected !== undefined ? Number(incidentData.peopleAffected) : 0,
      contactName: incidentData.contactName || '',
      contactPhone: incidentData.contactPhone || '',
      contactEmail: incidentData.contactEmail || '',
      peopleTrapped: incidentData.peopleTrapped || 'Unknown',
      immediateDanger: incidentData.immediateDanger || 'Unknown',
      injuries: incidentData.injuries || 'Unknown',
      severity: incidentData.severity || 'Low',
      severityScore: incidentData.severityScore || 0,
      severityReasons: incidentData.severityReasons || [],
      severityOverride: null,
      finalSeverity: incidentData.finalSeverity || incidentData.severity || 'Low',
      isDraft: incidentData.isDraft !== undefined ? !!incidentData.isDraft : false,
      aiStatus: incidentData.aiStatus || 'none',
      aiSeverity: incidentData.aiSeverity || null,
      aiConfidence: incidentData.aiConfidence !== undefined && incidentData.aiConfidence !== null ? Number(incidentData.aiConfidence) : null,
      aiAnalysis: incidentData.aiAnalysis || null,
      needsHumanReview: !!incidentData.needsHumanReview,
      status: incidentData.status || (incidentData.isDraft ? 'Draft' : 'Reported'),
      assignedTeamId: incidentData.assignedTeamId || null,
      assignedAt: incidentData.assignedAt || null,
      priorityScore: Number(incidentData.priorityScore) || 0,
      priorityLabel: incidentData.priorityLabel || null,
      priorityBreakdown: incidentData.priorityBreakdown || [],
      statusHistory: incidentData.statusHistory || [
        { status: incidentData.status || 'Reported', at: now, note: 'Initial incident report logged' }
      ],
      isSample: incidentData.isSample !== undefined ? !!incidentData.isSample : false,
      createdAt: incidentData.createdAt || now,
      updatedAt: now
    };

    items.unshift(newIncident);
    this._writeAll(items);
    return newIncident;
  }

  async update(id, partial) {
    const items = this._readAll();
    const index = items.findIndex(inc => inc.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return null;

    const existing = items[index];
    const updated = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString()
    };

    if (partial.severityOverride !== undefined) {
      updated.finalSeverity = partial.severityOverride || existing.severity || 'Low';
    }

    items[index] = updated;
    this._writeAll(items);
    return updated;
  }

  async delete(id) {
    const items = this._readAll();
    const index = items.findIndex(inc => inc.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return false;

    items.splice(index, 1);
    this._writeAll(items);
    return true;
  }

  async getStats() {
    const items = this._readAll().map(normalizeLegacyStatus);

    const total = items.length;
    let critical = 0;
    let reported = 0;
    let assigned = 0;
    let inProgress = 0;
    let resolved = 0;

    const byCategory = {
      'Fire Emergency': 0,
      'Road Accident': 0,
      'Medical Emergency': 0,
      'Flood': 0,
      'Building Collapse': 0,
      'Other Emergencies': 0
    };

    const bySeverity = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    for (const inc of items) {
      const effSev = inc.severityOverride || inc.finalSeverity || inc.severity || 'Low';
      if (effSev === 'Critical') critical++;
      if (bySeverity[effSev] !== undefined) bySeverity[effSev]++;

      if (inc.status === 'Reported') reported++;
      else if (inc.status === 'Assigned') assigned++;
      else if (inc.status === 'In Progress') inProgress++;
      else if (inc.status === 'Resolved') resolved++;

      if (byCategory[inc.category] !== undefined) {
        byCategory[inc.category]++;
      } else {
        byCategory['Other Emergencies'] = (byCategory['Other Emergencies'] || 0) + 1;
      }
    }

    return {
      total,
      critical,
      reported,
      assigned,
      inProgress,
      resolved,
      byCategory,
      bySeverity
    };
  }

  async getIncidentsWithin({ lat, lng, radiusM, since }) {
    const items = this._readAll();
    const centerLat = Number(lat);
    const centerLng = Number(lng);
    const radius = Number(radiusM);
    const sinceTime = since ? new Date(since).getTime() : -Infinity;

    return items.filter(inc => {
      if (inc.latitude === null || inc.latitude === undefined || inc.longitude === null || inc.longitude === undefined) {
        return false;
      }
      if (new Date(inc.createdAt).getTime() < sinceTime) {
        return false;
      }
      const dist = haversineDistance(centerLat, centerLng, Number(inc.latitude), Number(inc.longitude));
      return dist <= radius;
    });
  }

  // --- HOTSPOT METHODS ---
  async getAllHotspots() {
    const items = this._readHotspots();
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveHotspots() {
    const items = this._readHotspots();
    return items
      .filter(h => h.status === 'active' || h.status === 'acknowledged')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getHotspotById(id) {
    if (!id) return null;
    const items = this._readHotspots();
    return items.find(h => h.id === id) || null;
  }

  async createHotspot(hotspotData) {
    const items = this._readHotspots();
    const now = new Date().toISOString();
    const newHotspot = {
      id: hotspotData.id || crypto.randomUUID(),
      centerLat: Number(hotspotData.centerLat),
      centerLng: Number(hotspotData.centerLng),
      radiusM: Number(hotspotData.radiusM || 1000),
      incidentIds: Array.isArray(hotspotData.incidentIds) ? hotspotData.incidentIds : [],
      reportCount: Number(hotspotData.reportCount || (hotspotData.incidentIds ? hotspotData.incidentIds.length : 0)),
      category: hotspotData.category || null,
      severity: hotspotData.severity || 'High',
      status: hotspotData.status || 'active',
      createdAt: hotspotData.createdAt || now,
      updatedAt: now
    };

    items.unshift(newHotspot);
    this._writeHotspots(items);
    return newHotspot;
  }

  async updateHotspot(id, partial) {
    const items = this._readHotspots();
    const index = items.findIndex(h => h.id === id);
    if (index === -1) return null;

    const existing = normalizeLegacyStatus(items[index]);
    const updated = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString()
    };
    if (partial.centerLat !== undefined) updated.centerLat = Number(partial.centerLat);
    if (partial.centerLng !== undefined) updated.centerLng = Number(partial.centerLng);
    if (partial.radiusM !== undefined) updated.radiusM = Number(partial.radiusM);
    if (partial.reportCount !== undefined) updated.reportCount = Number(partial.reportCount);

    items[index] = updated;
    this._writeHotspots(items);
    return updated;
  }

  async saveIncidentMedia({ incidentId, storagePath, mimeType, sizeBytes, durationSeconds = null }) {
    const items = this._readMedia();
    const mediaRecord = {
      id: crypto.randomUUID(),
      incidentId,
      storagePath,
      mimeType,
      sizeBytes: Number(sizeBytes),
      durationSeconds: durationSeconds ? Number(durationSeconds) : null,
      createdAt: new Date().toISOString()
    };
    items.unshift(mediaRecord);
    this._writeMedia(items);
    return mediaRecord;
  }

  async getMediaByIncidentId(incidentId) {
    if (!incidentId) return null;
    const items = this._readMedia();
    return items.find(m => m.incidentId.toUpperCase() === incidentId.toUpperCase()) || null;
  }

  async seed(incidentsList) {
    this._writeAll(incidentsList);
    return incidentsList.length;
  }
}

module.exports = new JsonIncidentRepository();
