const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateDistance,
  calculateClusterCenter,
  determineClusterSeverity,
  determineDominantCategory,
  filterIncidentsInWindow,
  HOTSPOT_RADIUS_METERS,
  HOTSPOT_WINDOW_MINUTES,
  HOTSPOT_MIN_REPORTS
} = require('../services/hotspotService');
const { normalizeIndianPhone } = require('../utils/phone');

describe('Geospatial Hotspot & Clustering Detection Engine', () => {
  test('Haversine distance calculates accurate meters between SV University coordinates', () => {
    // SV University Engineering Block (13.6322, 79.4020) to Admin Complex (13.6335, 79.4005)
    const dist = calculateDistance(13.6322, 79.4020, 13.6335, 79.4005);
    // Approximate distance is ~217 meters
    assert.ok(dist > 180 && dist < 260, `Distance should be ~217m, got ${dist}`);

    // Same point distance must be 0
    const zeroDist = calculateDistance(13.6322, 79.4020, 13.6322, 79.4020);
    assert.equal(Math.round(zeroDist), 0);

    // Tirupati to Chennai (~130 km)
    const farDist = calculateDistance(13.6288, 79.4192, 13.0827, 80.2707);
    assert.ok(farDist > 110000 && farDist < 140000, `Expected ~115-135km, got ${farDist}`);
  });

  test('calculateClusterCenter accurately averages coordinate points', () => {
    const points = [
      { latitude: 13.6322, longitude: 79.4020 },
      { latitude: 13.6335, longitude: 79.4005 },
      { latitude: 13.6340, longitude: 79.4012 }
    ];

    const center = calculateClusterCenter(points);
    assert.ok(Math.abs(center.lat - 13.633233) < 0.001);
    assert.ok(Math.abs(center.lng - 79.401233) < 0.001);
  });

  test('determineClusterSeverity picks highest severity for sub-escalation clusters', () => {
    // 3 reports with Medium, Low, High
    const severities = ['Low', 'Medium', 'High'];
    const result = determineClusterSeverity(severities, 3, 3);
    assert.equal(result, 'High');

    // 4 reports with Low only
    const lowResult = determineClusterSeverity(['Low', 'Low', 'Low', 'Low'], 4, 3);
    assert.equal(lowResult, 'Low');
  });

  test('determineClusterSeverity escalates one level when count >= 2x threshold (6+ reports)', () => {
    // 6 reports with max severity Medium escalates to High
    const medSeverities = ['Medium', 'Low', 'Medium', 'Low', 'Medium', 'Low'];
    const escalatedToHigh = determineClusterSeverity(medSeverities, 6, 3);
    assert.equal(escalatedToHigh, 'High', 'Medium should escalate to High at 2x threshold');

    // 6 reports with max severity High escalates to Critical
    const highSeverities = ['High', 'Medium', 'Medium', 'Low', 'Low', 'High'];
    const escalatedToCritical = determineClusterSeverity(highSeverities, 6, 3);
    assert.equal(escalatedToCritical, 'Critical', 'High should escalate to Critical at 2x threshold');

    // 6 reports already Critical stays Critical (capped)
    const critSeverities = ['Critical', 'High', 'Low', 'Low', 'Low', 'Low'];
    const cappedCritical = determineClusterSeverity(critSeverities, 6, 3);
    assert.equal(cappedCritical, 'Critical', 'Critical remains capped at Critical');
  });

  test('determineDominantCategory identifies the most frequent category', () => {
    const categories = ['Fire Emergency', 'Medical Emergency', 'Fire Emergency', 'Road Accident'];
    const dominant = determineDominantCategory(categories);
    assert.equal(dominant, 'Fire Emergency');
  });

  test('filterIncidentsInWindow filters out incidents created outside time window', () => {
    const now = Date.now();
    const incidents = [
      { id: '1', createdAt: new Date(now - 1000 * 60 * 15).toISOString() }, // 15 min ago (in)
      { id: '2', createdAt: new Date(now - 1000 * 60 * 45).toISOString() }, // 45 min ago (in)
      { id: '3', createdAt: new Date(now - 1000 * 60 * 90).toISOString() }  // 90 min ago (out for 60 min window)
    ];

    const inWindow = filterIncidentsInWindow(incidents, 60, now);
    assert.equal(inWindow.length, 2);
    assert.equal(inWindow[0].id, '1');
    assert.equal(inWindow[1].id, '2');
  });
});

describe('Indian Phone Number Normalization (E.164)', () => {
  test('Normalizes 10-digit number like 9849012345 to +919849012345', () => {
    const res = normalizeIndianPhone('9849012345');
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, '+919849012345');
  });

  test('Normalizes 11-digit number with leading 0 (09849012345) to +919849012345', () => {
    const res = normalizeIndianPhone('09849012345');
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, '+919849012345');
  });

  test('Normalizes 12-digit number starting with 91 (919849012345) to +919849012345', () => {
    const res = normalizeIndianPhone('919849012345');
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, '+919849012345');
  });

  test('Normalizes formatted phone with spaces/dashes (+91 98490-12345) to +919849012345', () => {
    const res = normalizeIndianPhone('+91 98490-12345');
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, '+919849012345');
  });

  test('Rejects invalid phone numbers (alphabetic, short, or wrong length)', () => {
    assert.equal(normalizeIndianPhone('12345').isValid, false);
    assert.equal(normalizeIndianPhone('abcdefghij').isValid, false);
    assert.equal(normalizeIndianPhone('').isValid, false);
    assert.equal(normalizeIndianPhone(null).isValid, false);
  });
});
