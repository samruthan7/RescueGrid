const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'incidents.json');

class IncidentRepository {
  constructor() {
    this._ensureFileExists();
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
      console.error('[Repository] Error ensuring data file exists:', err);
    }
  }

  _readAll() {
    this._ensureFileExists();
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[Repository] Error reading incidents.json, returning empty array:', err);
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
      console.error('[Repository] Error saving incidents:', err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw new Error('Failed to persist incident data to repository');
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

  /**
   * Get all incidents with optional filtering and sorting
   */
  getAll({ search, category, severity, status, sort } = {}) {
    let items = this._readAll();

    // 1. Search across title, description, location, id
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

    // 2. Filter by category
    if (category && category !== 'All') {
      items = items.filter(inc => inc.category === category);
    }

    // 3. Filter by severity (check effective severity: override if present, else original)
    if (severity && severity !== 'All') {
      items = items.filter(inc => {
        const effectiveSeverity = inc.severityOverride || inc.severity;
        return effectiveSeverity === severity;
      });
    }

    // 4. Filter by status
    if (status && status !== 'All') {
      items = items.filter(inc => inc.status === status);
    }

    // 5. Sorting
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
          return rankB - rankA; // Critical -> Low
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // Default: sort by newest first, but ensure Critical incidents are given visual priority or sorted by createdAt
      items.sort((a, b) => {
        const isCritA = (a.severityOverride || a.severity) === 'Critical' ? 1 : 0;
        const isCritB = (b.severityOverride || b.severity) === 'Critical' ? 1 : 0;
        if (isCritB !== isCritA) {
          return isCritB - isCritA; // Critical on top
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return items;
  }

  getById(id) {
    if (!id) return null;
    const items = this._readAll();
    return items.find(inc => inc.id.toUpperCase() === id.toUpperCase()) || null;
  }

  create(incidentData) {
    const items = this._readAll();
    const id = incidentData.id || this.generateId();
    const now = new Date().toISOString();

    const newIncident = {
      id,
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
      status: incidentData.status || 'Reported',
      statusHistory: incidentData.statusHistory || [
        { status: incidentData.status || 'Reported', at: now, note: 'Initial incident report logged' }
      ],
      createdAt: incidentData.createdAt || now,
      updatedAt: now
    };

    items.unshift(newIncident);
    this._writeAll(items);
    return newIncident;
  }

  update(id, partial) {
    const items = this._readAll();
    const index = items.findIndex(inc => inc.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return null;

    const existing = items[index];
    const updated = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString()
    };

    items[index] = updated;
    this._writeAll(items);
    return updated;
  }

  delete(id) {
    const items = this._readAll();
    const index = items.findIndex(inc => inc.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return false;

    items.splice(index, 1);
    this._writeAll(items);
    return true;
  }

  getStats() {
    const items = this._readAll();

    const total = items.length;
    let critical = 0;
    let pending = 0;
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
      const effSev = inc.severityOverride || inc.severity || 'Low';
      if (effSev === 'Critical') critical++;
      if (bySeverity[effSev] !== undefined) bySeverity[effSev]++;

      if (inc.status === 'Pending') pending++;
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
      pending,
      inProgress,
      resolved,
      byCategory,
      bySeverity
    };
  }

  seed(incidentsList) {
    this._writeAll(incidentsList);
    return incidentsList.length;
  }
}

module.exports = new IncidentRepository();
