const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jsonRepository = require('../repositories/jsonRepository');
const supabaseRepository = require('../repositories/supabaseRepository');

describe('Repository Abstraction & Signatures', () => {
  const expectedMethods = [
    'getAll',
    'getById',
    'getByCitizenId',
    'upsertCitizen',
    'getIncidentsWithin',
    'getAllHotspots',
    'getActiveHotspots',
    'getHotspotById',
    'createHotspot',
    'updateHotspot',
    'saveIncidentMedia',
    'getMediaByIncidentId',
    'create',
    'update',
    'delete',
    'getStats',
    'seed',
    'generateId'
  ];

  test('JSON repository implements all expected repository methods', () => {
    for (const method of expectedMethods) {
      assert.equal(
        typeof jsonRepository[method],
        'function',
        `jsonRepository must implement ${method}`
      );
    }
  });

  test('Supabase repository implements all expected repository methods', () => {
    for (const method of expectedMethods) {
      assert.equal(
        typeof supabaseRepository[method],
        'function',
        `supabaseRepository must implement ${method}`
      );
    }
  });

  test('Supabase row mapping converts snake_case to camelCase properly', () => {
    const rawRow = {
      id: 'INC-TEST01',
      title: 'Transformer Fire',
      description: 'Electrical transformer on fire near substation',
      category: 'Fire Emergency',
      address_text: 'Renigunta Road, Tirupati',
      people_affected: 3,
      trapped: true,
      immediate_danger: true,
      injuries: 'Serious',
      lat: 13.6302,
      lng: 79.435,
      rule_score: 11,
      rule_severity: 'Critical',
      rule_reasons: ['Base weight (+3)', 'Trapped (+3)'],
      ai_status: 'none',
      final_severity: 'Critical',
      severity_override: null,
      status: 'Reported',
      status_history: [{ status: 'Reported', at: '2026-11-10T00:00:00.000Z' }],
      is_sample: true,
      created_at: '2026-11-10T00:00:00.000Z',
      updated_at: '2026-11-10T00:00:00.000Z',
      citizens: { name: 'K. Naidu', phone: '+919989011223' }
    };

    const mapped = supabaseRepository._mapFromRow(rawRow);

    assert.equal(mapped.id, 'INC-TEST01');
    assert.equal(mapped.location, 'Renigunta Road, Tirupati');
    assert.equal(mapped.latitude, 13.6302);
    assert.equal(mapped.longitude, 79.435);
    assert.equal(mapped.peopleAffected, 3);
    assert.equal(mapped.peopleTrapped, 'Yes');
    assert.equal(mapped.immediateDanger, 'Yes');
    assert.equal(mapped.severity, 'Critical');
    assert.equal(mapped.severityScore, 11);
    assert.equal(mapped.contactName, 'K. Naidu');
    assert.equal(mapped.contactPhone, '+919989011223');
    assert.equal(mapped.isSample, true);
  });

  test('Supabase row mapping converts camelCase input to snake_case row', () => {
    const incidentData = {
      title: 'Road Blockage',
      description: 'Fallen branch blocking traffic lane',
      category: 'Other Emergencies',
      location: 'Alipiri Road',
      latitude: 13.6515,
      longitude: 79.3958,
      peopleAffected: 0,
      peopleTrapped: 'No',
      immediateDanger: 'No',
      injuries: 'None',
      severity: 'Low',
      severityScore: 2,
      severityReasons: ['Other category (+1)'],
      isSample: true
    };

    const row = supabaseRepository._mapToRow(incidentData);

    assert.equal(row.title, 'Road Blockage');
    assert.equal(row.address_text, 'Alipiri Road');
    assert.equal(row.lat, 13.6515);
    assert.equal(row.lng, 79.3958);
    assert.equal(row.people_affected, 0);
    assert.equal(row.trapped, false);
    assert.equal(row.immediate_danger, false);
    assert.equal(row.rule_severity, 'Low');
    assert.equal(row.rule_score, 2);
    assert.equal(row.final_severity, 'Low');
    assert.equal(row.is_sample, true);
  });
});
