const path = require('path');
const fs = require('fs');
const repository = require('../repositories');
const { classifySeverity } = require('../severity');
const { validateIncidentInput } = require('../validators/incidentValidator');
const { checkHotspots } = require('../services/hotspotService');
const { verifyVideoMagicBytes, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../utils/videoValidator');
const { uploadIncidentVideo, getVideoSignedUrl, UPLOADS_DIR } = require('../services/storageService');
const { analyzeIncidentVideoAsync } = require('../services/aiSeverityService');
const { calculatePriority } = require('../priority');
const teamRepository = require('../teamRepository');

function redactPublicText(value) {
  return String(value || '').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[redacted phone]');
}

/**
 * Step 1: Create incident draft.
 * An incident starts as a draft until mandatory video is attached.
 */
async function createIncident(req, res, next) {
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

    const citizenId = req.citizen ? req.citizen.id : (sanitized.citizenId || null);
    const contactName = sanitized.contactName || req.citizen?.name || '';
    const contactPhone = sanitized.contactPhone || req.citizen?.phone || '';

    const incidentData = {
      ...sanitized,
      citizenId,
      contactName,
      contactPhone,
      severity: level,
      finalSeverity: level,
      severityScore: score,
      severityReasons: reasons,
      status: 'Draft',
      isDraft: true,
      aiStatus: 'none'
    };
    Object.assign(incidentData, (() => { const p=calculatePriority(incidentData); return { priorityScore:p.score, priorityLabel:p.label, priorityBreakdown:p.breakdown }; })());

    const savedIncident = await repository.create(incidentData);
    if (process.env.AUTO_ASSIGN_ON_CREATE === 'true' && !savedIncident.isDraft) {
      setImmediate(() => require('../services/assignmentService').assignTeam(savedIncident.id, 'auto', 'auto-create').catch(err => console.warn('[AutoAssign] Assignment skipped:', err.message)));
    }

    return res.status(201).json({
      message: 'Emergency incident draft created. Please attach mandatory video to finalize submission.',
      incident: savedIncident
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Step 2: Upload mandatory incident video, validate magic bytes, and activate incident.
 */
async function uploadVideo(req, res, next) {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No video file provided. Mandatory incident video recording is required.'
      });
    }

    // Find incident draft
    const incident = await repository.getById(id);
    if (!incident) {
      return res.status(404).json({
        error: `Incident '${id}' was not found.`
      });
    }

    // Ownership check: only the citizen who created this draft may upload video
    if (incident.citizenId && req.citizen && req.citizen.id !== incident.citizenId) {
      return res.status(403).json({
        error: 'Forbidden: You can only upload video evidence for your own incidents.'
      });
    }

    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: `Invalid video format (${file.mimetype}). Accepted formats: MP4, WebM, QuickTime.`
      });
    }

    // 2. Validate File Size (max 50 MB)
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `Video size exceeds maximum limit of 50 MB (current size: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`
      });
    }

    // 3. Validate Magic Bytes (binary signature inspection)
    const magicResult = verifyVideoMagicBytes(file.buffer.slice(0, 64));
    if (!magicResult.isValid) {
      return res.status(400).json({
        error: magicResult.error
      });
    }

    // 4. Upload video to storage
    const uploadResult = await uploadIncidentVideo({
      incidentId: id,
      buffer: file.buffer,
      originalname: file.originalname || `incident-${id}.mp4`,
      mimeType: file.mimetype
    });

    // 5. Save incident_media row
    const mediaRecord = await repository.saveIncidentMedia({
      incidentId: id,
      storagePath: uploadResult.storagePath,
      mimeType: file.mimetype,
      sizeBytes: file.size
    });

    // 6. Finalize incident submission: activate from draft to 'Reported'
    const reportedPriority = calculatePriority({ ...incident, status: 'Reported' });
    const activatedIncident = await repository.update(id, {
      isDraft: false,
      status: 'Reported',
      priorityScore: reportedPriority.score,
      priorityLabel: reportedPriority.label,
      priorityBreakdown: reportedPriority.breakdown,
      aiStatus: 'pending',
      statusHistory: [
        ...(incident.statusHistory || []),
        {
          status: 'Reported',
          at: new Date().toISOString(),
          note: 'Mandatory video evidence verified. Incident queued for triage.'
        }
      ]
    });
    if (process.env.AUTO_ASSIGN_ON_CREATE === 'true') {
      setImmediate(() => require('../services/assignmentService').assignTeam(id, 'auto', 'auto-create').catch(err => console.warn('[AutoAssign] Assignment skipped:', err.message)));
    }

    // 7. Trigger Hotspot / Cluster Engine on activated incident
    let triggeredHotspot = null;
    try {
      triggeredHotspot = await checkHotspots(activatedIncident);
    } catch (hErr) {
      console.warn('[IncidentController] Hotspot check warning:', hErr.message);
    }

    // 8. Launch asynchronous AI video severity analysis
    setImmediate(() => {
      analyzeIncidentVideoAsync(id).catch(err => {
        console.error(`[IncidentController] Async AI inspection error for ${id}:`, err.message);
      });
    });

    // Immediate response to citizen with rule triage
    return res.status(200).json({
      message: 'Video evidence attached successfully. Emergency report submitted to response authorities.',
      incident: activatedIncident,
      media: {
        id: mediaRecord.id,
        mimeType: mediaRecord.mimeType,
        sizeBytes: mediaRecord.sizeBytes
      },
      hotspot: triggeredHotspot
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public Citizen tracking endpoint: Get safe incident status without exposing contact info
 */
async function getIncidentPublicStatus(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await repository.getById(id);

    if (!incident) {
      return res.status(404).json({
        error: `Incident record with ID '${id}' was not found. Please verify the incident reference number.`
      });
    }

    // Publicly sanitized view: Do NOT expose video URLs, citizen phone, email, or full contact name
    const publicData = {
      id: incident.id,
      title: redactPublicText(incident.title),
      category: incident.category,
      // Public tracking keeps only approximate coordinates and omits free-text addresses.
      latitude: incident.latitude == null ? null : Number(Number(incident.latitude).toFixed(3)),
      longitude: incident.longitude == null ? null : Number(Number(incident.longitude).toFixed(3)),
      severity: incident.severityOverride || incident.finalSeverity || incident.severity,
      originalSeverity: incident.severity,
      severityOverride: incident.severityOverride,
      severityScore: incident.severityScore,
      severityReasons: (incident.severityReasons || []).map(redactPublicText),
      aiStatus: incident.aiStatus || 'none',
      aiSeverity: incident.aiSeverity || null,
      aiConfidence: incident.aiConfidence || null,
      aiAnalysis: incident.aiAnalysis ? {
        summary: redactPublicText(incident.aiAnalysis.summary),
        hazards_visible: redactPublicText(incident.aiAnalysis.hazards_visible),
        recommended_response: redactPublicText(incident.aiAnalysis.recommended_response)
      } : null,
      status: incident.status,
      ...(incident.assignedTeamId ? await (async () => { const team=await teamRepository.getById(incident.assignedTeamId); return team ? { assignedTeam: { name: team.name, category: team.category }, assignedAt: incident.assignedAt } : {}; })() : {}),
      statusHistory: (incident.statusHistory || []).map(entry => ({ ...entry, note: redactPublicText(entry.note) })),
      createdAt: incident.createdAt
    };

    return res.json(publicData);
  } catch (err) {
    next(err);
  }
}

/**
 * Public Live Map endpoint (fuzzed coordinates ~110m for privacy)
 */
async function getPublicMapIncidents(req, res, next) {
  try {
    const incidents = await repository.getAll();

    const publicPoints = incidents
      .filter(inc => !inc.isDraft && inc.latitude !== null && inc.latitude !== undefined && inc.longitude !== null && inc.longitude !== undefined)
      .map(inc => ({
        id: inc.id,
        category: inc.category,
        finalSeverity: inc.severityOverride || inc.finalSeverity || inc.severity || 'Low',
        latitude: Number(Number(inc.latitude).toFixed(3)),
        longitude: Number(Number(inc.longitude).toFixed(3)),
        status: inc.status,
        createdAt: inc.createdAt
      }));

    return res.json(publicPoints);
  } catch (err) {
    next(err);
  }
}

/**
 * Authority endpoint: Get signed short-lived playback URL (10 minutes) for verified officer
 */
async function getVideoPlaybackUrl(req, res, next) {
  try {
    const { id } = req.params;
    const media = await repository.getMediaByIncidentId(id);

    if (!media || !media.storagePath) {
      return res.status(404).json({
        error: `No video evidence found for incident ${id}.`
      });
    }

    const signedUrl = await getVideoSignedUrl(media.storagePath, id);

    return res.json({
      incidentId: id,
      signedUrl,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      expiresInSeconds: 600
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Local media streaming with HTTP 206 Partial Content (for offline/demo playback)
 */
function streamVideoLocal(req, res, next) {
  try {
    const { id } = req.params;
    const incidentDir = path.join(UPLOADS_DIR, id);

    if (!fs.existsSync(incidentDir)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const files = fs.readdirSync(incidentDir);
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const videoPath = path.join(incidentDir, files[0]);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(videoPath).toLowerCase();
    const contentType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      };
      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createIncident,
  uploadVideo,
  getIncidentPublicStatus,
  getPublicMapIncidents,
  getVideoPlaybackUrl,
  streamVideoLocal
};
