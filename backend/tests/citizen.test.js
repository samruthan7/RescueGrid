const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// Ensure test environment uses JSON storage
process.env.STORAGE_DRIVER = 'json';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'rescuegrid-test-key-2026';

const repository = require('../repositories');
const citizenController = require('../controllers/citizenController');
const { authenticateCitizen, JWT_SECRET } = require('../middleware/citizenAuth');
const incidentController = require('../controllers/incidentController');
const hotspotController = require('../controllers/hotspotController');

function createMockReqRes({ body = {}, params = {}, query = {}, headers = {}, citizen = null, user = null } = {}) {
  const req = {
    body,
    params,
    query,
    headers,
    citizen,
    user
  };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };
  return { req, res };
}

describe('Citizen Authentication & Incident Ownership Unit Tests', () => {
  let citizenToken;
  let citizenProfile;

  test('citizenController.login rejects name under 2 characters', async () => {
    const { req, res } = createMockReqRes({
      body: { name: 'V', phone: '9849012345' }
    });

    await citizenController.login(req, res, () => {});
    assert.equal(res.getStatusCode(), 400);
    assert.ok(res.getData().error.includes('minimum 2 characters'));
  });

  test('citizenController.login rejects invalid phone number', async () => {
    const { req, res } = createMockReqRes({
      body: { name: 'Venkat Raman', phone: '123' }
    });

    await citizenController.login(req, res, () => {});
    assert.equal(res.getStatusCode(), 400);
    assert.ok(res.getData().error.includes('10-digit Indian phone number'));
  });

  test('citizenController.login normalizes phone and returns valid 7-day citizen JWT', async () => {
    const { req, res } = createMockReqRes({
      body: { name: 'Venkat Raman', phone: '9849012345' }
    });

    await citizenController.login(req, res, () => {});
    assert.equal(res.getStatusCode(), 200);

    const data = res.getData();
    assert.ok(data.token);
    assert.equal(data.citizen.name, 'Venkat Raman');
    assert.equal(data.citizen.phone, '+919849012345');

    citizenToken = data.token;
    citizenProfile = data.citizen;

    const decoded = jwt.verify(citizenToken, JWT_SECRET);
    assert.equal(decoded.role, 'citizen');
    assert.equal(decoded.phone, '+919849012345');
    assert.equal(decoded.id, citizenProfile.id);
  });

  test('citizenAuth middleware verifies valid citizen JWT and rejects invalid or authority tokens', () => {
    // Valid token
    const { req: req1, res: res1 } = createMockReqRes({
      headers: { authorization: `Bearer ${citizenToken}` }
    });
    let nextCalled1 = false;
    authenticateCitizen(req1, res1, () => { nextCalled1 = true; });
    assert.equal(nextCalled1, true);
    assert.equal(req1.citizen.id, citizenProfile.id);
    assert.equal(req1.citizen.role, 'citizen');

    // Missing token
    const { req: req2, res: res2 } = createMockReqRes();
    authenticateCitizen(req2, res2, () => {});
    assert.equal(res2.getStatusCode(), 401);

    // Token with authority role (role !== citizen)
    const authOfficerToken = jwt.sign(
      { username: 'admin', role: 'authority' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const { req: req3, res: res3 } = createMockReqRes({
      headers: { authorization: `Bearer ${authOfficerToken}` }
    });
    authenticateCitizen(req3, res3, () => {});
    assert.equal(res3.getStatusCode(), 403);
    assert.ok(res3.getData().error.includes('citizen accounts'));
  });

  test('incidentController.createIncident attaches authenticated citizenId', async () => {
    const payload = {
      title: 'Hostel Roof Water Leakage Emergency',
      description: 'Severe water tank overflow flooding electrical switchboard in corridor. Risk of electrocution.',
      category: 'Other Emergencies',
      location: 'SVU Mens Hostel 2, Tirupati',
      latitude: 13.6330,
      longitude: 79.4015,
      peopleAffected: 5,
      peopleTrapped: 'No',
      immediateDanger: 'Yes',
      injuries: 'None'
    };

    const { req, res } = createMockReqRes({
      body: payload,
      citizen: citizenProfile
    });

    await incidentController.createIncident(req, res, (err) => { if (err) throw err; });
    assert.equal(res.getStatusCode(), 201);

    const created = res.getData().incident;
    assert.ok(created.id);
    assert.equal(created.citizenId, citizenProfile.id);
    assert.equal(created.contactName, citizenProfile.name);
    assert.equal(created.contactPhone, citizenProfile.phone);
  });

  test('citizenController.getMyIncidents returns only incidents owned by authenticated citizen', async () => {
    const { req, res } = createMockReqRes({
      citizen: citizenProfile
    });

    await citizenController.getMyIncidents(req, res, (err) => { if (err) throw err; });
    assert.equal(res.getStatusCode(), 200);

    const data = res.getData();
    assert.ok(Array.isArray(data.incidents));
    assert.ok(data.incidents.length >= 1);
    for (const inc of data.incidents) {
      assert.equal(inc.citizenId, citizenProfile.id);
    }
  });

  test('incidentController.getPublicMapIncidents returns fuzzed coordinates (~110m) without private data', async () => {
    const { req, res } = createMockReqRes();

    await incidentController.getPublicMapIncidents(req, res, (err) => { if (err) throw err; });
    assert.equal(res.getStatusCode(), 200);

    const points = res.getData();
    assert.ok(Array.isArray(points));
    assert.ok(points.length > 0);

    const first = points[0];
    assert.ok(first.id);
    assert.ok(first.category);
    assert.ok(first.finalSeverity);
    assert.ok(typeof first.latitude === 'number');
    assert.ok(typeof first.longitude === 'number');

    // Decimal precision must be <= 3 (110m fuzzed privacy)
    const latDecimals = (first.latitude.toString().split('.')[1] || '').length;
    const lngDecimals = (first.longitude.toString().split('.')[1] || '').length;
    assert.ok(latDecimals <= 3);
    assert.ok(lngDecimals <= 3);

    // Private fields omitted
    assert.equal(first.description, undefined);
    assert.equal(first.citizenId, undefined);
    assert.equal(first.contactName, undefined);
    assert.equal(first.contactPhone, undefined);
  });

  test('public incident tracking omits contact fields and free-text address and fuzzes coordinates', async () => {
    const owned = await repository.getByCitizenId(citizenProfile.id);
    const incident = owned.find(item => item.latitude != null);
    const { req, res } = createMockReqRes({ params: { id: incident.id } });
    await incidentController.getIncidentPublicStatus(req, res, (err) => { if (err) throw err; });
    const data = res.getData();
    assert.equal(data.contactName, undefined);
    assert.equal(data.contactPhone, undefined);
    assert.equal(data.contactEmail, undefined);
    assert.equal(data.location, undefined);
    assert.equal(data.latitude, Number(Number(incident.latitude).toFixed(3)));
  });

  test('hotspotController.getNearbyHotspots detects active cluster near SV University coordinates', async () => {
    // Ensure an active hotspot exists at SV University for proximity test
    await repository.createHotspot({
      centerLat: 13.6335,
      centerLng: 79.4010,
      radiusM: 1000,
      incidentIds: ['INC-TEST1', 'INC-TEST2', 'INC-TEST3'],
      reportCount: 3,
      category: 'Fire Emergency',
      severity: 'Critical',
      status: 'active'
    });

    const { req, res } = createMockReqRes({
      query: { lat: '13.6335', lng: '79.4010', radius: '1000' }
    });

    await hotspotController.getNearbyHotspots(req, res, (err) => { if (err) throw err; });
    assert.equal(res.getStatusCode(), 200);

    const data = res.getData();
    assert.equal(typeof data.inHotspot, 'boolean');
    assert.equal(data.inHotspot, true);
    assert.ok(data.count >= 1);
  });

  test('hotspotController allows authorities to view, acknowledge, and resolve alerts', async () => {
    // 1. Get all hotspots
    const { req: getReq, res: getRes } = createMockReqRes();
    await hotspotController.getAllHotspots(getReq, getRes, (err) => { if (err) throw err; });
    assert.equal(getRes.getStatusCode(), 200);

    const hotspots = getRes.getData().hotspots;
    assert.ok(hotspots.length > 0);
    const targetHotspot = hotspots[0];

    // 2. Acknowledge alert
    const { req: ackReq, res: ackRes } = createMockReqRes({
      params: { id: targetHotspot.id },
      body: { status: 'acknowledged' }
    });
    await hotspotController.updateHotspotStatus(ackReq, ackRes, (err) => { if (err) throw err; });
    assert.equal(ackRes.getStatusCode(), 200);
    assert.equal(ackRes.getData().hotspot.status, 'acknowledged');

    // 3. Resolve alert
    const { req: resReq, res: resRes } = createMockReqRes({
      params: { id: targetHotspot.id },
      body: { status: 'resolved' }
    });
    await hotspotController.updateHotspotStatus(resReq, resRes, (err) => { if (err) throw err; });
    assert.equal(resRes.getStatusCode(), 200);
    assert.equal(resRes.getData().hotspot.status, 'resolved');
  });
});
