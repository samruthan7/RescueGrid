const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const repository = require('../repositories');
const { getLocalVideoBuffer } = require('./storageService');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const IS_DEMO_MODE = process.env.DEMO_MODE === 'true';

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
 * Combines rule-based severity with AI visual inspection results
 * Pure function: rigorously tested in unit tests
 */
function combineSeverity(ruleResult, aiResult) {
  const ruleSeverity = ruleResult.severity || 'Low';
  const ruleReasons = Array.isArray(ruleResult.reasons) ? [...ruleResult.reasons] : [];
  const isRuleCriticalOverride =
    ruleResult.isCriticalOverride ||
    (ruleSeverity === 'Critical' &&
      ruleReasons.some(
        r =>
          r.toLowerCase().includes('override') ||
          r.toLowerCase().includes('not breathing') ||
          r.toLowerCase().includes('gas leak')
      ));

  // If no AI result or failed, retain rule triage
  if (!aiResult) {
    return {
      finalSeverity: ruleSeverity,
      combinedReasons: ruleReasons,
      aiSeverity: null,
      aiConfidence: null,
      needsHumanReview: false,
      aiAnalysis: null
    };
  }

  const aiSeverity = aiResult.severity || 'Low';
  const aiConfidence = typeof aiResult.confidence === 'number' ? aiResult.confidence : 0;
  const videoMatches = aiResult.video_matches_description !== false;
  const hasAuthenticityConcerns = Boolean(aiResult.authenticity_concerns);

  const aiReasonsFormatted = Array.isArray(aiResult.reasons)
    ? aiResult.reasons.map(r => (r.startsWith('[AI]') ? r : `[AI] ${r}`))
    : [];

  // RULE 1: Mismatch or Authenticity Concerns
  // If video does not match report or has authenticity concerns, do NOT change severity; flag for human review
  if (!videoMatches || hasAuthenticityConcerns) {
    const warningNote = hasAuthenticityConcerns
      ? `[AI Warning] Authenticity concern detected: ${aiResult.authenticity_concerns}`
      : '[AI Warning] Video scene does not correlate with text description';

    return {
      finalSeverity: ruleSeverity,
      combinedReasons: [...ruleReasons, warningNote, ...aiReasonsFormatted],
      aiSeverity,
      aiConfidence,
      needsHumanReview: true,
      aiAnalysis: aiResult
    };
  }

  // RULE 2: Rule-based Critical Overrides are SACROSANCT
  // AI can NEVER downgrade a rule-based Critical override ("not breathing", "gas leak", etc.)
  if (isRuleCriticalOverride) {
    return {
      finalSeverity: 'Critical',
      combinedReasons: [...ruleReasons, ...aiReasonsFormatted],
      aiSeverity,
      aiConfidence,
      needsHumanReview: false,
      aiAnalysis: aiResult
    };
  }

  // RULE 3: Confidence Threshold >= 0.6
  if (aiConfidence >= 0.6) {
    const ruleRank = SEVERITY_RANKS[ruleSeverity] || 1;
    const aiRank = SEVERITY_RANKS[aiSeverity] || 1;

    // Final = HIGHER of rule and AI severity
    const higherRank = Math.max(ruleRank, aiRank);
    const finalSeverity = RANK_TO_SEVERITY[higherRank] || ruleSeverity;

    return {
      finalSeverity,
      combinedReasons: [...ruleReasons, ...aiReasonsFormatted],
      aiSeverity,
      aiConfidence,
      needsHumanReview: false,
      aiAnalysis: aiResult
    };
  }

  // RULE 4: Low AI Confidence (< 0.6)
  // Keep rule severity, append confidence disclaimer
  return {
    finalSeverity: ruleSeverity,
    combinedReasons: [
      ...ruleReasons,
      `[AI Note] Visual confidence score (${(aiConfidence * 100).toFixed(0)}%) was below the 60% escalation threshold. Rule severity maintained.`,
      ...aiReasonsFormatted
    ],
    aiSeverity,
    aiConfidence,
    needsHumanReview: false,
    aiAnalysis: aiResult
  };
}

/**
 * Deterministic mock generator for DEMO_MODE or offline fallback
 */
function generateMockAIAnalysis(incident) {
  const desc = (incident.description || '').toLowerCase();
  const cat = incident.category || 'Other Emergencies';

  let severity = 'Medium';
  let hazards = ['general disruption'];
  let recommended = ['Paramedic crew dispatch'];

  if (desc.includes('fire') || desc.includes('smoke') || cat === 'Fire Emergency') {
    severity = 'High';
    hazards = ['active flames', 'dense smoke', 'thermal hazard'];
    recommended = ['Fire brigade dispatch', 'Water tender', 'EMS standby'];
  } else if (desc.includes('collapse') || cat === 'Building Collapse' || desc.includes('trapped')) {
    severity = 'Critical';
    hazards = ['structural debris', 'collapsed beams', 'trapped individuals'];
    recommended = ['Urban search and rescue (USAR)', 'Heavy lifting gear', 'Trauma response team'];
  } else if (desc.includes('flood') || cat === 'Flood') {
    severity = 'High';
    hazards = ['fast rising water', 'inundation'];
    recommended = ['Inflatable boat rescue squad', 'Flood evacuation unit'];
  }

  return {
    severity,
    confidence: 0.88,
    incident_type_observed: cat,
    hazards_visible: hazards,
    people_visible_estimate: incident.peopleAffected || 2,
    video_matches_description: true,
    authenticity_concerns: null,
    summary: `Visual confirmation of ${cat.toLowerCase()} with visible ${hazards[0]}. Rapid physical triage verified.`,
    reasons: [
      `Visual verification of ${hazards.join(', ')}`,
      `Scene dynamics correlate with ${severity} emergency status`
    ],
    recommended_response: recommended
  };
}

/**
 * Asynchronously inspects incident video with Gemini API
 */
async function analyzeIncidentVideoAsync(incidentId) {
  const maxRetries = 2;
  const timeoutMs = 90000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const incident = await repository.getById(incidentId);
      if (!incident) return;

      const media = await repository.getMediaByIncidentId(incidentId);
      if (!media || !media.storagePath) {
        console.warn(`[AISeverity] No media found for ${incidentId}`);
        await repository.update(incidentId, { aiStatus: 'failed' });
        return;
      }

      // Check for Demo Mode or missing API Key
      if (IS_DEMO_MODE || !GEMINI_API_KEY || process.env.NODE_ENV === 'test') {
        console.log(`[AISeverity] Running in mock/offline mode for ${incidentId}`);
        const mockAnalysis = generateMockAIAnalysis(incident);
        const combined = combineSeverity(
          {
            severity: incident.severity,
            reasons: incident.severityReasons,
            score: incident.severityScore
          },
          mockAnalysis
        );

        await repository.update(incidentId, {
          aiStatus: 'done',
          aiSeverity: mockAnalysis.severity,
          aiConfidence: mockAnalysis.confidence,
          aiAnalysis: mockAnalysis,
          finalSeverity: combined.finalSeverity,
          needsHumanReview: combined.needsHumanReview,
          severityReasons: combined.combinedReasons
        });
        return;
      }

      // Local file check for upload
      const localMedia = getLocalVideoBuffer(media.storagePath, incidentId);
      if (!localMedia || !localMedia.localPath) {
        throw new Error('Local video file not cached on disk for Gemini upload');
      }

      const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      // Upload file to Gemini Files API
      console.log(`[AISeverity] Uploading ${localMedia.localPath} to Gemini Files API...`);
      const uploadResult = await fileManager.uploadFile(localMedia.localPath, {
        mimeType: media.mimeType || 'video/mp4',
        displayName: `incident-${incidentId}`
      });

      let file = await fileManager.getFile(uploadResult.file.name);
      const pollStart = Date.now();

      while (file.state === 'PROCESSING') {
        if (Date.now() - pollStart > timeoutMs) {
          throw new Error('Gemini video processing timed out');
        }
        await new Promise(r => setTimeout(r, 4000));
        file = await fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === 'FAILED') {
        throw new Error('Gemini video file processing failed');
      }

      // Call Gemini Model with structured output
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const prompt = `
You are an expert AI Emergency Dispatch Analyst for RescueGrid.
Analyze this on-scene incident video alongside the citizen's report:
- Incident Title: ${incident.title}
- Description: ${incident.description}
- Category: ${incident.category}
- Reported People Affected: ${incident.peopleAffected}

Output strictly valid JSON with this exact schema:
{
  "severity": "Low" | "Medium" | "High" | "Critical",
  "confidence": <float 0.0 to 1.0>,
  "incident_type_observed": "<string>",
  "hazards_visible": ["<string>"],
  "people_visible_estimate": <int or null>,
  "video_matches_description": <boolean>,
  "authenticity_concerns": <string or null>,
  "summary": "<string, max 40 words>",
  "reasons": ["<short human readable string>"],
  "recommended_response": ["<string>"]
}
`;

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri
          }
        },
        { text: prompt }
      ]);

      const responseText = result.response.text();
      let aiResult;
      try {
        aiResult = JSON.parse(responseText);
      } catch (pe) {
        console.error('[AISeverity] JSON parse failed on Gemini response:', responseText);
        throw pe;
      }

      // Cleanup uploaded Gemini file
      try {
        await fileManager.deleteFile(file.name);
      } catch (delErr) {
        console.warn('[AISeverity] Non-critical file deletion warning:', delErr.message);
      }

      // Combine with rule severity
      const combined = combineSeverity(
        {
          severity: incident.severity,
          reasons: incident.severityReasons,
          score: incident.severityScore
        },
        aiResult
      );

      await repository.update(incidentId, {
        aiStatus: 'done',
        aiSeverity: aiResult.severity,
        aiConfidence: aiResult.confidence,
        aiAnalysis: aiResult,
        finalSeverity: combined.finalSeverity,
        needsHumanReview: combined.needsHumanReview,
        severityReasons: combined.combinedReasons
      });

      console.log(`[AISeverity] Analysis completed for ${incidentId}: AI=${aiResult.severity} (${aiResult.confidence}), Final=${combined.finalSeverity}`);
      return;
    } catch (err) {
      console.error(`[AISeverity] Attempt ${attempt} failed for ${incidentId}:`, err.message);
      if (attempt === maxRetries) {
        await repository.update(incidentId, {
          aiStatus: 'failed',
          severityReasons: [
            ...(incident?.severityReasons || []),
            '[AI Note] Visual analysis timed out or could not be completed. Initial rule triage remains active.'
          ]
        });
      } else {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
}

module.exports = {
  combineSeverity,
  analyzeIncidentVideoAsync,
  generateMockAIAnalysis
};
