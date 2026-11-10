const jwt = require('jsonwebtoken');
const repository = require('../repositories');
const { JWT_SECRET } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const authorities = require('../authorityRepository');
const { calculatePriority, rankIncidents } = require('../priority');
const assignmentService = require('../services/assignmentService');

const VALID_STATUSES = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Demo authority login
 */
async function login(req, res) {
  const { username, password } = req.body || {};
  const expectedUser = process.env.AUTHORITY_USERNAME || 'admin';
  const expectedPass = process.env.AUTHORITY_PASSWORD || 'rescuegrid2026!';

  // 1. Check default admin credentials from env
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

  // 2. Check registered authority database if available
  const existingAuth = authorities.findByUsername(username);
  if (existingAuth && existingAuth.passwordHash) {
    const match = await bcrypt.compare(password, existingAuth.passwordHash);
    if (match) {
      const token = jwt.sign(
        {
          role: 'authority',
          username: existingAuth.username,
          agency: existingAuth.department || 'Civil Protection Unit'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        message: 'Authority authentication successful.',
        token,
        user: {
          username: existingAuth.username,
          role: 'authority',
          agency: existingAuth.department || 'Civil Protection Unit'
        }
      });
    }
  }

  return res.status(401).json({
    error: 'Invalid authority credentials. For demo evaluation, check the backend environment credentials.'
  });
}

/**
 * Register a new authority officer
 */
async function register(req, res) {
  const { username, password, fullName, department, registrationCode } = req.body || {};
  const expectedCode = process.env.AUTHORITY_REGISTRATION_CODE || 'RESCUE-ADMIN-2026';

  if (registrationCode !== expectedCode) {
    return res.status(403).json({ error: 'Invalid authority registration authorization code' });
  }
  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (
    authorities.findByUsername(username) ||
    username.toLowerCase() === (process.env.AUTHORITY_USERNAME || 'admin').toLowerCase()
  ) {
    return res.status(409).json({ error: 'Authority username already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const record = authorities.create({
    username: username.trim(),
    fullName: (fullName || '').trim(),
    department: (department || '').trim(),
    passwordHash,
    createdAt: new Date().toISOString()
  });

  const token = jwt.sign(
    {
      role: 'authority',
      username: record.username,
      agency: record.department || 'Civil Protection'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(201).json({
    token,
    username: record.username,
    user: {
      username: record.username,
      role: 'authority',
      agency: record.department || 'Civil Protection'
    }
  });
}

/**
 * Get all incidents for authority monitoring with filters & search
 */
async function getIncidents(req, res, next) {
  try {
    const { search, category, severity, status, sort } = req.query;
    const incidents = await repository.getAll({ search, category, severity, status, sort });
    const ranked = sort && sort !== 'priority'
      ? incidents.map(inc => { const p=calculatePriority(inc); return { ...inc, priorityScore:p.score, priorityLabel:p.label, priorityBreakdown:p.breakdown }; })
      : rankIncidents(incidents);
    ranked.forEach(inc => { inc.priority = { score: inc.priorityScore, label: inc.priorityLabel, breakdown: inc.priorityBreakdown }; });
    return res.json(ranked);
  } catch (err) {
    next(err);
  }
}

/**
 * Get single full incident details
 */
async function getIncidentById(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await repository.getById(id);
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }
    const priority=calculatePriority(incident);
    return res.json({ ...incident, priorityScore:priority.score, priorityLabel:priority.label, priorityBreakdown:priority.breakdown, priority });
  } catch (err) {
    next(err);
  }
}

/**
 * Get aggregated statistics for dashboard
 */
async function getStats(req, res, next) {
  try {
    const stats = await repository.getStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}

/**
 * Update incident lifecycle status
 */
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const existing = await repository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }

    const allowed = {
      Reported: ['Reported'], Assigned: ['Reported', 'Assigned', 'In Progress'],
      'In Progress': ['Reported', 'In Progress', 'Resolved'], Resolved: ['Reported', 'Resolved']
    };
    if (status === 'Assigned') return res.status(400).json({ error: 'Incidents enter Assigned only through team assignment.' });
    if (!(allowed[existing.status] || []).includes(status)) return res.status(400).json({ error: `Invalid transition from ${existing.status} to ${status}.` });
    if (existing.status === 'Reported' && status !== 'Reported') return res.status(400).json({ error: 'Assign a response team before advancing this incident.' });

    const statusHistory = [...(existing.statusHistory || [])];
    statusHistory.push({
      status,
      at: new Date().toISOString(),
      note: note || `Status updated to ${status} by Authority Officer (${req.user?.username || 'admin'})`
    });

    const updated = await repository.update(id, {
      status,
      statusHistory,
      ...(() => { const p = calculatePriority({ ...existing, status }, new Date()); return { priorityScore:p.score, priorityLabel:p.label, priorityBreakdown:p.breakdown }; })(),
      ...(status === 'Reported' ? { assignedTeamId: null, assignedAt: null } : {})
    });
    if (existing.assignedTeamId && (status === 'Reported' || status === 'Resolved')) await assignmentService.releaseTeamForIncident(existing, status === 'Reported' ? 'unassigned' : 'released', req.user?.username);

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
async function overrideSeverity(req, res, next) {
  try {
    const { id } = req.params;
    const { severityOverride, reason } = req.body || {};

    if (severityOverride && !VALID_SEVERITIES.includes(severityOverride)) {
      return res.status(400).json({
        error: `Invalid severity level. Must be one of: ${VALID_SEVERITIES.join(', ')}`
      });
    }

    const existing = await repository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }

    const reasons = [...(existing.severityReasons || [])];
    if (severityOverride) {
      reasons.push(
        `MANUAL AUTHORITY OVERRIDE: Re-classified from '${existing.severity}' to '${severityOverride}' by Authority. ${reason ? `Reason: ${reason}` : ''}`
      );
    }

    const p = calculatePriority({ ...existing, severityOverride: severityOverride || null, finalSeverity: severityOverride || existing.severity });
    const updated = await repository.update(id, {
      severityOverride: severityOverride || null,
      severityReasons: reasons,
      finalSeverity: severityOverride || existing.severity || 'Low',
      priorityScore:p.score, priorityLabel:p.label, priorityBreakdown:p.breakdown
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
 * Delete an incident report
 */
async function deleteIncident(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await repository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: `Incident ${id} not found.` });
    }

    const success = await repository.delete(id);
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
  register,
  getIncidents,
  getIncidentById,
  getStats,
  updateStatus,
  overrideSeverity,
  deleteIncident
};
