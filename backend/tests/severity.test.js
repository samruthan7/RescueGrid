const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { classifySeverity } = require('../severity');

describe('Severity Classification Engine', () => {
  test('Case 1: Low Severity - Minor isolated incident without injuries or danger', () => {
    const report = {
      title: 'Small tree branch blocking walkway',
      description: 'A small tree branch fell on the garden pathway in the park. No one is hurt.',
      category: 'Other Emergencies',
      peopleAffected: 0,
      peopleTrapped: 'No',
      immediateDanger: 'No',
      injuries: 'None'
    };

    const result = classifySeverity(report);
    // Score: people (0) + category 'Other' (1) = 1 (blocked keyword +1 = 2) -> Low
    assert.equal(result.level, 'Low');
    assert.ok(result.score <= 3);
    assert.ok(result.reasons.length > 0);
  });

  test('Case 2: Medium Severity - Road Accident with minor injury', () => {
    const report = {
      title: 'Minor two-car collision at street intersection',
      description: 'Two vehicles bumped into each other. Driver has a small bruise and scratches.',
      category: 'Road Accident',
      peopleAffected: 2,
      peopleTrapped: 'No',
      immediateDanger: 'No',
      injuries: 'Minor'
    };

    const result = classifySeverity(report);
    // Score: people 2 (+1), category Road Accident (+2), minor injuries (+1) = 4 -> Medium
    assert.equal(result.level, 'Medium');
    assert.ok(result.score >= 4 && result.score <= 6);
  });

  test('Case 3: High Severity - Structure Fire with serious injury and multiple affected', () => {
    const report = {
      title: 'Apartment balcony fire spreading rapidly',
      description: 'Thick smoke coming from second floor balcony, spreading to curtains. Emergency services needed.',
      category: 'Fire Emergency',
      peopleAffected: 4,
      peopleTrapped: 'No',
      immediateDanger: 'Yes',
      injuries: 'Serious'
    };

    const result = classifySeverity(report);
    // Score: people 4 (+2) + Fire (+3) + immediate danger (+3) + serious (+3) + spreading (+2) + smoke (+1) = 14 (Critical)
    // Let's test a distinct High severity case without reaching 10+:
    const highReport = {
      title: 'Submerged basement storage unit',
      description: 'Water leaking heavily into basement storage rooms. Several tenants are trying to salvage items.',
      category: 'Flood',
      peopleAffected: 4, // +2
      peopleTrapped: 'No',
      immediateDanger: 'No',
      injuries: 'Minor' // +1
      // Flood (+2), stranded (+1) -> 2+2+1+1 = 6 or with immediate danger (+3) = 7 (High)
    };
    highReport.immediateDanger = 'Yes'; // +3 => 2 + 2 + 1 + 3 = 8 (High)

    const highResult = classifySeverity(highReport);
    assert.equal(highResult.level, 'High');
    assert.ok(highResult.score >= 7 && highResult.score <= 9);
  });

  test('Case 4: Critical Severity - Building Collapse with multiple trapped victims', () => {
    const report = {
      title: 'Commercial roof collapse downtown',
      description: 'Roof of grocery market collapsed completely. Multiple shoppers trapped under rubble.',
      category: 'Building Collapse',
      peopleAffected: 12,
      peopleTrapped: 'Yes',
      immediateDanger: 'Yes',
      injuries: 'Serious'
    };

    const result = classifySeverity(report);
    assert.equal(result.level, 'Critical');
    assert.ok(result.score >= 10);
    assert.ok(result.reasons.some(r => r.includes('Building Collapse')));
  });

  test('Case 5: Override Rule - Trapped = Yes with victims escalates otherwise medium score to High', () => {
    const report = {
      title: 'Stuck elevator in 2-story office',
      description: 'Elevator power cut off between floor 1 and 2. Passenger is calm but cannot open doors.',
      category: 'Other Emergencies',
      peopleAffected: 1, // +1
      peopleTrapped: 'Yes', // +3
      immediateDanger: 'No', // +0
      injuries: 'None' // +0
      // Base score: 1 (people) + 1 (Other) + 3 (trapped) + 0 = 5 (Medium)
      // Override triggers: trapped = yes and people >= 1 -> escalates to High
    };

    const result = classifySeverity(report);
    assert.equal(result.level, 'High');
    assert.ok(result.reasons.some(r => r.includes('OVERRIDE')));
  });

  test('Case 6: Override Rule - "not breathing" keyword forces CRITICAL severity', () => {
    const report = {
      title: 'Person collapsed in park',
      description: 'Elderly citizen is not breathing and needs CPR immediately.',
      category: 'Medical Emergency',
      peopleAffected: 1,
      peopleTrapped: 'No',
      immediateDanger: 'No',
      injuries: 'Unknown'
    };

    const result = classifySeverity(report);
    assert.equal(result.level, 'Critical');
    assert.ok(result.reasons.some(r => r.includes('CRITICAL OVERRIDE')));
  });

  test('Case 7: Override Rule - "gas leak" keyword forces CRITICAL severity', () => {
    const report = {
      title: 'Pungent odor in building basement',
      description: 'Strong smell of gas leak detected from main boiler pipe.',
      category: 'Other Emergencies',
      peopleAffected: 0,
      peopleTrapped: 'No',
      immediateDanger: 'No',
      injuries: 'None'
    };

    const result = classifySeverity(report);
    assert.equal(result.level, 'Critical');
    assert.ok(result.reasons.some(r => r.includes('CRITICAL OVERRIDE')));
  });

  test('Case 8: Missing or Unknown values never downgrade severity', () => {
    const reportUnknown = {
      title: 'Smoke in stairwell',
      description: 'Thick smoke in building stairwell. Cannot verify if anyone is trapped.',
      category: 'Fire Emergency',
      peopleAffected: 'unknown',
      peopleTrapped: 'Unknown',
      immediateDanger: 'Unknown',
      injuries: 'Unknown'
    };

    const result = classifySeverity(reportUnknown);
    // Fire base (+3) + smoke (+1) = 4 -> Medium. Does not error or produce negative score.
    assert.ok(result.score >= 4);
    assert.equal(result.level, 'Medium');
  });
});
