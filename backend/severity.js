/**
 * RescueGrid Rule-Based Emergency Severity Classifier
 * Pure, deterministic function to assess incident threat level and transparent scoring.
 * 
 * Scoring Model:
 * 1. People Affected (0 to +4 pts)
 * 2. Category Base Risk (Building Collapse/Fire +3, Medical/Road Accident/Flood +2, Other +1)
 * 3. Contextual Danger (Trapped +3, Immediate Danger +3, Injuries Minor +1, Serious +3)
 * 4. Keyword Scanning (Critical keywords +2 capped at +6, Moderate keywords +1 capped at +3)
 * 5. Override Rules:
 *    - Critical Keywords ("not breathing", "unconscious", "explosion", "gas leak") -> Forced CRITICAL
 *    - Trapped = Yes AND People Affected >= 1 -> At least HIGH
 * 
 * Thresholds:
 *   0 - 3  : Low
 *   4 - 6  : Medium
 *   7 - 9  : High
 *   10+    : Critical
 */

// Critical keywords (+2 pts each, capped at +6)
const CRITICAL_KEYWORDS = [
  'trapped',
  'explosion',
  'collapse',
  'unconscious',
  'not breathing',
  'gas leak',
  'bleeding heavily',
  'spreading',
  'rising water',
  'fatal',
  'dead',
  'children'
];

// Moderate keywords (+1 pt each, capped at +3)
const MODERATE_KEYWORDS = [
  'smoke',
  'injured',
  'blocked',
  'stranded',
  'fracture'
];

// Direct override phrases that mandate immediate Critical classification
const CRITICAL_OVERRIDE_PATTERNS = [
  /\bnot breathing\b/i,
  /\bunconscious\b/i,
  /\bexplosion\b/i,
  /\bgas leak\b/i
];

/**
 * Classifies an incident report.
 * @param {Object} report
 * @param {string} report.title
 * @param {string} report.description
 * @param {string} report.category
 * @param {number|string} [report.peopleAffected]
 * @param {string} [report.peopleTrapped] - "Yes" | "No" | "Unknown"
 * @param {string} [report.immediateDanger] - "Yes" | "No" | "Unknown"
 * @param {string} [report.injuries] - "None" | "Minor" | "Serious" | "Unknown"
 * @returns {{ level: 'Low' | 'Medium' | 'High' | 'Critical', score: number, reasons: string[] }}
 */
function classifySeverity(report = {}) {
  let score = 0;
  const reasons = [];

  const title = (report.title || '').trim();
  const description = (report.description || '').trim();
  const textCorpus = `${title} ${description}`.toLowerCase();
  const category = (report.category || '').trim();

  // 1. People Affected Scoring
  const rawPeople = parseInt(report.peopleAffected, 10);
  const peopleAffected = Number.isFinite(rawPeople) && rawPeople >= 0 ? rawPeople : 0;

  if (peopleAffected >= 21) {
    score += 4;
    reasons.push(`Mass casualty potential: ${peopleAffected} people affected (+4)`);
  } else if (peopleAffected >= 6) {
    score += 3;
    reasons.push(`High impact: ${peopleAffected} people affected (+3)`);
  } else if (peopleAffected >= 3) {
    score += 2;
    reasons.push(`${peopleAffected} people affected (+2)`);
  } else if (peopleAffected >= 1) {
    score += 1;
    reasons.push(`${peopleAffected} person(s) affected (+1)`);
  } else {
    reasons.push('No people directly affected specified (+0)');
  }

  // 2. Category Base Weight
  switch (category) {
    case 'Building Collapse':
      score += 3;
      reasons.push('Building Collapse category base weight (+3)');
      break;
    case 'Fire Emergency':
      score += 3;
      reasons.push('Fire Emergency category base weight (+3)');
      break;
    case 'Medical Emergency':
      score += 2;
      reasons.push('Medical Emergency category base weight (+2)');
      break;
    case 'Road Accident':
      score += 2;
      reasons.push('Road Accident category base weight (+2)');
      break;
    case 'Flood':
      score += 2;
      reasons.push('Flood emergency category base weight (+2)');
      break;
    case 'Other Emergencies':
    default:
      score += 1;
      reasons.push(`Category '${category || 'Other'}' base weight (+1)`);
      break;
  }

  // 3. Situational Indicators (Never penalize Unknown/missing answers)
  const peopleTrapped = (report.peopleTrapped || '').toLowerCase();
  if (peopleTrapped === 'yes') {
    score += 3;
    reasons.push('People trapped confirmed (+3)');
  }

  const immediateDanger = (report.immediateDanger || '').toLowerCase();
  if (immediateDanger === 'yes') {
    score += 3;
    reasons.push('Immediate danger to life reported (+3)');
  }

  const injuries = (report.injuries || '').toLowerCase();
  if (injuries === 'serious') {
    score += 3;
    reasons.push('Serious injuries confirmed (+3)');
  } else if (injuries === 'minor') {
    score += 1;
    reasons.push('Minor injuries reported (+1)');
  }

  // 4. Keyword Scanning
  let criticalKeywordScore = 0;
  const criticalFound = [];
  for (const kw of CRITICAL_KEYWORDS) {
    // Whole word / phrase boundary match
    const regex = new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'i');
    if (regex.test(textCorpus)) {
      criticalFound.push(kw);
      criticalKeywordScore += 2;
    }
  }
  const cappedCriticalKwScore = Math.min(criticalKeywordScore, 6);
  if (criticalFound.length > 0) {
    score += cappedCriticalKwScore;
    reasons.push(
      `Critical keyword(s) detected [${criticalFound.join(', ')}] (+${cappedCriticalKwScore})`
    );
  }

  let moderateKeywordScore = 0;
  const moderateFound = [];
  for (const kw of MODERATE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'i');
    if (regex.test(textCorpus)) {
      moderateFound.push(kw);
      moderateKeywordScore += 1;
    }
  }
  const cappedModerateKwScore = Math.min(moderateKeywordScore, 3);
  if (moderateFound.length > 0) {
    score += cappedModerateKwScore;
    reasons.push(
      `Moderate keyword(s) detected [${moderateFound.join(', ')}] (+${cappedModerateKwScore})`
    );
  }

  // 5. Initial Threshold Evaluation
  let level = 'Low';
  if (score >= 10) {
    level = 'Critical';
  } else if (score >= 7) {
    level = 'High';
  } else if (score >= 4) {
    level = 'Medium';
  } else {
    level = 'Low';
  }

  // 6. Override Rules
  // Override A: Trapped = Yes AND People Affected >= 1 -> Mandate at least High
  if (peopleTrapped === 'yes' && peopleAffected >= 1) {
    if (level === 'Low' || level === 'Medium') {
      level = 'High';
      reasons.push('OVERRIDE: People trapped with known victims escalates severity to High');
    }
  }

  // Override B: Life-critical keywords ("not breathing", "unconscious", "explosion", "gas leak") -> Mandate CRITICAL
  const triggeredOverrides = [];
  for (const pattern of CRITICAL_OVERRIDE_PATTERNS) {
    if (pattern.test(textCorpus)) {
      triggeredOverrides.push(pattern.source.replace(/\\b/g, ''));
    }
  }

  if (triggeredOverrides.length > 0) {
    if (level !== 'Critical') {
      level = 'Critical';
      reasons.push(
        `CRITICAL OVERRIDE: High-lethality trigger detected (${triggeredOverrides.join(', ')}) escalates severity to Critical`
      );
    }
  }

  return {
    level,
    score,
    reasons
  };
}

module.exports = {
  classifySeverity,
  CRITICAL_KEYWORDS,
  MODERATE_KEYWORDS,
  CRITICAL_OVERRIDE_PATTERNS
};
