const incidents = require('../repositories');
const teams = require('../teamRepository');
const { haversine, estimateTravelMinutes } = require('./distanceService');
const { rankIncidents, calculatePriority } = require('../priority');

const SUITABILITY = {
  Fire: ['Fire', 'Rescue', 'Disaster Response'],
  Medical: ['Medical', 'Rescue'],
  'Road Accident': ['Medical', 'Police', 'Rescue'],
  Flood: ['Disaster Response', 'Rescue'],
  'Building Collapse': ['Rescue', 'Fire', 'Medical', 'Disaster Response'],
  Other: ['Police', 'Rescue', 'Disaster Response']
};
function primaryCategory(category) {
  if (category === 'Fire Emergency') return 'Fire';
  if (category === 'Medical Emergency') return 'Medical';
  if (category === 'Other Emergencies') return 'Other';
  return category;
}
async function findBestTeams(incident, limit = 3) {
  const type = primaryCategory(incident.category);
  const suitability = SUITABILITY[type] || SUITABILITY.Other;
  const available = await teams.getAll({ availability: 'Available' });
  const candidates = available.filter(t => suitability.includes(t.category) && t.lat != null && t.lng != null && incident.latitude != null && incident.longitude != null)
    .map(team => {
      const primary = team.category === suitability[0];
      const distanceKm = haversine(incident.latitude, incident.longitude, team.lat, team.lng);
      return { team, distanceKm, etaMinutes: estimateTravelMinutes(distanceKm), matchType: primary ? 'primary' : 'secondary', reason: primary ? `Primary ${team.category} match; ${distanceKm.toFixed(2)} km away.` : `Suitable ${team.category} team; ${distanceKm.toFixed(2)} km away.` };
    })
    .sort((a,b) => Number(b.matchType === 'primary') - Number(a.matchType === 'primary') || a.distanceKm - b.distanceKm)
    .slice(0, limit);
  return { candidates, message: candidates.length ? null : 'No suitable team available; incident remains in queue' };
}
async function assignTeam(incidentId, teamId, performedBy = 'authority') {
  const incident = await incidents.getById(incidentId);
  if (!incident) throw Object.assign(new Error('Incident not found.'), { status: 404 });
  if (incident.status === 'Resolved') throw Object.assign(new Error('Resolved incidents cannot be assigned.'), { status: 409 });
  if (!['Reported', 'Assigned'].includes(incident.status) || (!incident.assignedTeamId && incident.status !== 'Reported')) throw Object.assign(new Error('Incident cannot be assigned from its current status.'), { status: 409 });
  let candidate;
  if (teamId === 'auto') {
    const result = await findBestTeams(incident, 1);
    if (!result.candidates.length) throw Object.assign(new Error(result.message), { status: 409 });
    candidate = result.candidates[0]; teamId = candidate.team.id;
  }
  const team = await teams.getById(teamId);
  if (!team) throw Object.assign(new Error('Team not found.'), { status: 404 });
  const distanceKm = candidate?.distanceKm ?? (incident.latitude != null && incident.longitude != null && team.lat != null && team.lng != null ? haversine(incident.latitude, incident.longitude, team.lat, team.lng) : null);
  if (teamId === incident.assignedTeamId && team.availability === 'Busy' && team.currentIncidentId === incident.id) return { incident, team, distanceKm, etaMinutes: distanceKm == null ? null : estimateTravelMinutes(distanceKm) };
  const claimed = await teams.claimAvailable(teamId, incident.id);
  if (!claimed) throw Object.assign(new Error('Team is no longer available. Refresh recommendations and try again.'), { status: 409 });
  const at = new Date().toISOString();
  try {
    const priorId = incident.assignedTeamId;
    const p = calculatePriority({ ...incident, status: 'Assigned' });
    const history = [...(incident.statusHistory || []), { status: 'Assigned', at, note: `Assigned to ${team.name} by ${performedBy}.` }];
    const updated = await incidents.update(incidentId, { status: 'Assigned', assignedTeamId: teamId, assignedAt: at, statusHistory: history, priorityScore: p.score, priorityLabel: p.label, priorityBreakdown: p.breakdown });
    if (priorId && priorId !== teamId) {
      await teams.release(priorId, incident.id);
      await teams.recordAssignment({ incidentId, teamId: priorId, action: 'reassigned', distanceKm: null, performedBy });
    }
    await teams.recordAssignment({ incidentId, teamId, action: priorId ? 'reassigned' : 'assigned', distanceKm, performedBy });
    return { incident: updated, team: claimed, distanceKm, etaMinutes: distanceKm == null ? null : estimateTravelMinutes(distanceKm) };
  } catch (err) {
    await teams.release(teamId, incident.id).catch(() => {});
    throw err;
  }
}
async function unassignTeam(incidentId, performedBy = 'authority') {
  const incident = await incidents.getById(incidentId);
  if (!incident) throw Object.assign(new Error('Incident not found.'), { status: 404 });
  if (incident.status === 'Resolved') throw Object.assign(new Error('Resolved incidents cannot be unassigned.'), { status: 409 });
  if (incident.assignedTeamId) {
    await teams.release(incident.assignedTeamId, incident.id);
    await teams.recordAssignment({ incidentId, teamId: incident.assignedTeamId, action: 'unassigned', performedBy });
  }
  const at = new Date().toISOString(), history = [...(incident.statusHistory || []), { status: 'Reported', at, note: `Team assignment removed by ${performedBy}.` }];
  const p = calculatePriority({ ...incident, status: 'Reported' });
  return incidents.update(incidentId, { status: 'Reported', assignedTeamId: null, assignedAt: null, statusHistory: history, priorityScore: p.score, priorityLabel: p.label, priorityBreakdown: p.breakdown });
}
async function releaseTeamForIncident(incident, action = 'released', performedBy = 'authority') {
  if (!incident?.assignedTeamId) return;
  await teams.release(incident.assignedTeamId, incident.id);
  await teams.recordAssignment({ incidentId: incident.id, teamId: incident.assignedTeamId, action, performedBy });
}
async function autoDispatchAll() {
  const active = (await incidents.getAll({ includeDrafts: false })).filter(i => i.status !== 'Resolved' && !i.assignedTeamId);
  const ranked = rankIncidents(active);
  const assigned = [], unassignable = [];
  for (const incident of ranked) {
    const candidates = await findBestTeams(incident, 1);
    if (!candidates.candidates.length) { unassignable.push({ incidentId: incident.id, message: candidates.message }); continue; }
    try { assigned.push(await assignTeam(incident.id, candidates.candidates[0].team.id, 'auto-dispatch')); }
    catch (e) { unassignable.push({ incidentId: incident.id, message: e.message }); }
  }
  return { assigned, unassignable };
}
module.exports = { SUITABILITY, findBestTeams, assignTeam, unassignTeam, releaseTeamForIncident, autoDispatchAll };
