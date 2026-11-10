const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { supabase, isConfigured } = require('../lib/supabase');

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'incident-videos';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Uploads incident video to Supabase Storage (with local disk fallback for JSON/Demo mode)
 */
async function uploadIncidentVideo({ incidentId, buffer, originalname, mimeType }) {
  const extMatch = originalname.split('.').pop() || 'mp4';
  const ext = extMatch.toLowerCase();
  const fileId = crypto.randomUUID();
  const storagePath = `incidents/${incidentId}/${fileId}.${ext}`;

  ensureUploadsDir();

  // Always keep local disk copy for instant offline playback & Gemini file streaming
  const localIncidentDir = path.join(UPLOADS_DIR, incidentId);
  if (!fs.existsSync(localIncidentDir)) {
    fs.mkdirSync(localIncidentDir, { recursive: true });
  }
  const localFilePath = path.join(localIncidentDir, `${fileId}.${ext}`);
  fs.writeFileSync(localFilePath, buffer);

  if (isConfigured && supabase && process.env.DEMO_MODE !== 'true' && process.env.STORAGE_DRIVER !== 'json') {
    try {
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!error) {
        return {
          storagePath,
          localFilePath,
          bucket: SUPABASE_BUCKET,
          provider: 'supabase'
        };
      }
      console.warn('[StorageService] Supabase upload failed, falling back to local file:', error.message);
    } catch (err) {
      console.warn('[StorageService] Supabase upload error:', err.message);
    }
  }

  return {
    storagePath,
    localFilePath,
    bucket: 'local',
    provider: 'local'
  };
}

/**
 * Generates a short-lived signed playback URL (10 minutes = 600 seconds)
 */
async function getVideoSignedUrl(storagePath, incidentId) {
  if (isConfigured && supabase && process.env.DEMO_MODE !== 'true' && process.env.STORAGE_DRIVER !== 'json') {
    try {
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .createSignedUrl(storagePath, 600); // 10 minutes

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
      console.warn('[StorageService] createSignedUrl error:', error?.message);
    } catch (e) {
      console.warn('[StorageService] createSignedUrl warning:', e.message);
    }
  }

  // Local streaming endpoint for JSON driver or fallback
  return `/api/admin/incidents/${incidentId}/video-stream`;
}

/**
 * Read local video file buffer for AI analysis
 */
function getLocalVideoBuffer(storagePath, incidentId) {
  try {
    const filename = path.basename(storagePath);
    const localPath = path.join(UPLOADS_DIR, incidentId, filename);
    if (fs.existsSync(localPath)) {
      return {
        buffer: fs.readFileSync(localPath),
        localPath
      };
    }
  } catch (e) {
    console.warn('[StorageService] Local buffer lookup warning:', e.message);
  }
  return null;
}

module.exports = {
  uploadIncidentVideo,
  getVideoSignedUrl,
  getLocalVideoBuffer,
  SUPABASE_BUCKET,
  UPLOADS_DIR
};
