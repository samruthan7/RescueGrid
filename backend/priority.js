const SEVERITY = { Critical: 100, High: 70, Medium: 40, Low: 10 };
const CATEGORY = { 'Building Collapse': 10, 'Fire Emergency': 10, Fire: 10, Medical: 8, 'Medical Emergency': 8, 'Road Accident': 6, Flood: 6, Other: 2, 'Other Emergencies': 2 };

function calculatePriority(incident, now = new Date()) {
  if (incident.status === 'Resolved') return { score: 0, label: 'Low', breakdown: [{ factor: 'resolved', points: 0, note: 'Resolved incidents are not in the active queue.' }] };
  const severity = incident.severityOverride || incident.finalSeverity || incident.severity || 'Low';
  const people = Math.max(0, Number(incident.peopleAffected ?? incident.people_affected) || 0);
  const elapsed = (new Date(now).getTime() - new Date(incident.createdAt || incident.created_at || now).getTime()) / 60000;
  const age = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const waiting = Math.min(age * 0.5, 30);
  const factors = [
    { factor: 'severity', points: SEVERITY[severity] ?? 10, note: `Final severity ${severity}.` },
    { factor: 'peopleAffected', points: Math.min(people, 50) * 0.5, note: `${Math.min(people, 50)} people counted (maximum 50).` },
    { factor: 'waitingTime', points: waiting, note: `Waiting time contributes 0.5 points per minute, capped at 30 (${Math.round(age)} minutes elapsed).` },
    { factor: 'category', points: CATEGORY[incident.category] ?? 2, note: `${incident.category || 'Other'} emergency category weight.` }
  ];
  const score = factors.reduce((sum, f) => sum + f.points, 0);
  const label = score >= 130 ? 'Critical' : score >= 90 ? 'High' : score >= 50 ? 'Medium' : 'Low';
  return { score, label, breakdown: factors };
}

function rankIncidents(incidents, now = new Date()) {
  return incidents.map(incident => ({ ...incident, ...(() => { const p=calculatePriority(incident,now); return { priorityScore:p.score, priorityLabel:p.label, priorityBreakdown:p.breakdown }; })() }))
    .sort((a,b) => b.priorityScore-a.priorityScore || new Date(a.createdAt || a.created_at)-new Date(b.createdAt || b.created_at));
}

module.exports = { calculatePriority, rankIncidents };
