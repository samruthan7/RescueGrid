const repository = require('../repository');
const { classifySeverity } = require('../severity');
const { validateIncidentInput } = require('../validators/incidentValidator');

/**
 * Public Citizen endpoint: Submit an emergency incident
 */
function createIncident(req, res, next) {
  try {
    const { isValid, errors, sanitized } = validateIncidentInput(req.body);

    if (!isValid) {
      return res.status(400).json({
        error: 'Validation failed. Please correct the highlighted errors.',
        errors
      });
    }

    // Run automated rule-based severity assessment
    const { level, score, reasons } = classifySeverity(sanitized);

    const incidentData = {
      ...sanitized,
      severity: level,
      severityScore: score,
      severityReasons: reasons,
      status: 'Reported'
    };

    const savedIncident = repository.create(incidentData);

    return res.status(201).json({
      message: 'Emergency incident reported successfully.',
      incident: savedIncident
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public Citizen tracking endpoint: Get safe incident status without exposing contact info
 */
function getIncidentPublicStatus(req, res, next) {
  try {
    const { id } = req.params;
    const incident = repository.getById(id);

    if (!incident) {
      return res.status(404).json({
        error: `Incident record with ID '${id}' was not found. Please verify the incident reference number.`
      });
    }

    // Publicly sanitized view: Do NOT expose citizen phone, email, or full contact name
    const publicData = {
      id: incident.id,
      title: incident.title,
      category: incident.category,
      location: incident.location,
      severity: incident.severityOverride || incident.severity,
      originalSeverity: incident.severity,
      severityOverride: incident.severityOverride,
      severityScore: incident.severityScore,
      severityReasons: incident.severityReasons,
      status: incident.status,
      statusHistory: incident.statusHistory,
      createdAt: incident.createdAt
    };

    return res.json(publicData);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createIncident,
  getIncidentPublicStatus
};
