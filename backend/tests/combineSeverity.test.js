const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { combineSeverity } = require('../services/aiSeverityService');

describe('AI + Rule Combined Severity Classification Engine', () => {
  test('Escalates severity when AI detects higher severity with confidence >= 0.6', () => {
    const ruleResult = {
      severity: 'Medium',
      score: 5,
      reasons: ['Road accident baseline (+2)', 'Minor injury (+2)']
    };
    const aiResult = {
      severity: 'High',
      confidence: 0.85,
      video_matches_description: true,
      authenticity_concerns: null,
      hazards_visible: ['severe vehicle deformation', 'fuel spill'],
      reasons: ['Heavy deformation visible in passenger cabin']
    };

    const combined = combineSeverity(ruleResult, aiResult);
    assert.equal(combined.finalSeverity, 'High', 'Should escalate Medium to High');
    assert.equal(combined.needsHumanReview, false);
    assert.ok(combined.combinedReasons.some(r => r.includes('[AI] Heavy deformation')));
  });

  test('Never downgrades a rule-based Critical override even if AI reports Low', () => {
    const ruleResult = {
      severity: 'Critical',
      score: 12,
      reasons: ['Structure fire (+4)', 'Override: victim not breathing (Forces CRITICAL)'],
      isCriticalOverride: true
    };
    const aiResult = {
      severity: 'Low',
      confidence: 0.95,
      video_matches_description: true,
      authenticity_concerns: null,
      reasons: ['No active flame visible in short clip']
    };

    const combined = combineSeverity(ruleResult, aiResult);
    assert.equal(combined.finalSeverity, 'Critical', 'Rule Critical Override MUST NEVER be downgraded');
    assert.equal(combined.needsHumanReview, false);
  });

  test('Preserves rule severity when AI confidence is below 0.6 threshold', () => {
    const ruleResult = {
      severity: 'Medium',
      score: 6,
      reasons: ['Water logging (+3)']
    };
    const aiResult = {
      severity: 'Critical',
      confidence: 0.45, // < 0.6
      video_matches_description: true,
      authenticity_concerns: null,
      reasons: ['Blurry clip possibly showing rising current']
    };

    const combined = combineSeverity(ruleResult, aiResult);
    assert.equal(combined.finalSeverity, 'Medium', 'Should not escalate when confidence < 0.6');
    assert.ok(combined.combinedReasons.some(r => r.includes('below the 60% escalation threshold')));
  });

  test('Flags needsHumanReview and refuses severity change if video does not match description', () => {
    const ruleResult = {
      severity: 'High',
      score: 8,
      reasons: ['Reported chemical fire']
    };
    const aiResult = {
      severity: 'Critical',
      confidence: 0.9,
      video_matches_description: false, // MISMATCH
      authenticity_concerns: null,
      reasons: ['Video shows a sunny beach, not chemical fire']
    };

    const combined = combineSeverity(ruleResult, aiResult);
    assert.equal(combined.finalSeverity, 'High', 'Severity must NOT change on video mismatch');
    assert.equal(combined.needsHumanReview, true, 'Must flag needsHumanReview');
    assert.ok(combined.combinedReasons.some(r => r.includes('[AI Warning] Video scene does not correlate')));
  });

  test('Flags needsHumanReview and refuses severity change if authenticity concerns detected', () => {
    const ruleResult = {
      severity: 'Medium',
      score: 5,
      reasons: ['Reported localized flooding']
    };
    const aiResult = {
      severity: 'Critical',
      confidence: 0.92,
      video_matches_description: true,
      authenticity_concerns: 'Footage appears to be re-recorded from older news broadcast',
      reasons: ['Heavy flood waters seen']
    };

    const combined = combineSeverity(ruleResult, aiResult);
    assert.equal(combined.finalSeverity, 'Medium', 'Severity must NOT change if authenticity concerns exist');
    assert.equal(combined.needsHumanReview, true);
    assert.ok(combined.combinedReasons.some(r => r.includes('Authenticity concern detected')));
  });

  test('Gracefully handles null or missing AI result', () => {
    const ruleResult = {
      severity: 'Low',
      score: 2,
      reasons: ['Minor debris on sidewalk']
    };

    const combined = combineSeverity(ruleResult, null);
    assert.equal(combined.finalSeverity, 'Low');
    assert.equal(combined.needsHumanReview, false);
    assert.deepEqual(combined.combinedReasons, ruleResult.reasons);
  });
});
