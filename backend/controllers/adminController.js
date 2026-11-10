const jwt = require('jsonwebtoken');
const repository = require('../repository');
const { JWT_SECRET } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const authorities = require('../authorityRepository');
const sign = (username) =>
  jwt.sign({ username, role: 'authority' }, process.env.JWT_SECRET, { expiresIn: '8h' });

const VALID_STATUSES = ['Reported', 'Pending', 'In Progress', 'Resolved'];
const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Demo authority login
 */
function login(req, res) {
  const { username, password } = req.body || {};
  const expectedUser = process.env.AUTHORITY_USERNAME || 'admin';
  const expectedPass = process.env.AUTHORITY_PASSWORD || 'rescuegrid2026!';

  if (username === expectedUser && password === expectedPass) {
    const token = jwt.sign(
      {
        role: 'authority',
        username: expectedUser,
        agency: 'National Disaster & Emergency Response Directorate'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
exports.register = async (req, res) => {
  const { username, password, fullName, department, registrationCode } = req.body || {};
  if (registrationCode !== process.env.AUTHORITY_REGISTRATION_CODE)
    return res.status(403).json({ error: 'Invalid registration code' });
  if (!username || username.trim().length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (authorities.findByUsername(username) || username.toLowerCase() === process.env.AUTHORITY_USERNAME.toLowerCase())
    return res.status(409).json({ error: 'Username already taken' });

  authorities.create({
    username: username.trim(),
    fullName: (fullName || '').trim(),
    department: (department || '').trim(),
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ token: sign(username.trim()), username: username.trim() });
};
    return res.json({
      message: 'Demo authority authentication successful.',
      token,
      user: {
        username: expectedUser,
        role: 'authority',
        agency: 'National Disaster & Emergency Response Directorate'
      }
    });
  }
  

  return res.status(401).json({
    error: 'Invalid authority credentials. For demo evaluation, check the backend environment credentials.'
  });
}

/**
 * Get all incidents for authority monitoring with filters & search
 */
function getIncidents(req, res, next) {
  try {
    const { search, category, severity, status, sort } = req.query;
    const incidents = repository.getAll({ search, category, severity, status, sort });
    return res.json(incidents);
  } catch (err) {
    next(err);
  }
}

/**
 * Get single full incident details
 */
function getIncidentById(req, res, next) {
  try {
    const { id } = req.params;
    const incident = repository.getById(id);
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }
    return res.json(incident);
  } catch (err) {
    next(err);
  }
}

/**
 * Get aggregated statistics for dashboard
 */
function getStats(req, res, next) {
  try {
    const stats = repository.getStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}

/**
 * Update incident lifecycle status
 */
function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const existing = repository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }

    const statusHistory = existing.statusHistory || [];
    statusHistory.push({
      status,
      at: new Date().toISOString(),
      note: note || `Status updated to ${status} by Authority Officer (${req.user?.username || 'admin'})`
    });

    const updated = repository.update(id, {
      status,
      statusHistory
    });

    return res.json({
      message: `Incident status updated to '${status}'.`,
      incident: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Override incident severity level
 */
function overrideSeverity(req, res, next) {
  try {
    const { id } = req.params;
    const { severityOverride, reason } = req.body || {};

    // Allow resetting override with null/empty or setting a valid severity
    if (severityOverride && !VALID_SEVERITIES.includes(severityOverride)) {
      return res.status(400).json({
        error: `Invalid severity level. Must be one of: ${VALID_SEVERITIES.join(', ')}`
      });
    }

    const existing = repository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }

    const reasons = [...(existing.severityReasons || [])];
    if (severityOverride) {
      reasons.push(
        `MANUAL AUTHORITY OVERRIDE: Re-classified from '${existing.severity}' to '${severityOverride}' by Authority. ${reason ? `Reason: ${reason}` : ''}`
      );
    }

    const updated = repository.update(id, {
      severityOverride: severityOverride || null,
      severityReasons: reasons
    });

    return res.json({
      message: severityOverride
        ? `Incident severity overridden to '${severityOverride}'.`
        : `Incident severity reset to system classification ('${existing.severity}').`,
      incident: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete an incident report (e.g. test or duplicate report)
 */
function deleteIncident(req, res, next) {
  try {
    const { id } = req.params;
    const existing = repository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }

    const success = repository.delete(id);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete incident record.' });
    }

    return res.json({
      message: `Incident ${id} has been permanently deleted.`,
      id
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getIncidents,
  getIncidentById,
  getStats,
  updateStatus,
  overrideSeverity,
  deleteIncident
};
