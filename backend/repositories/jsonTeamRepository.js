const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'teams.json');
const historyFile = path.join(__dirname, '..', 'data', 'assignment_history.json');
function read() { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } }
function write(rows) { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(rows, null, 2)); fs.renameSync(tmp, file); }
module.exports = {
  async getAll(filters = {}) { return read().filter(t => (!filters.category || t.category === filters.category) && (!filters.availability || t.availability === filters.availability)); },
  async getById(id) { return read().find(t => t.id.toLowerCase() === String(id).toLowerCase()) || null; },
  async create(team) { const rows = read(); const id = team.id || `TEAM-${String(rows.length + 1).padStart(3, '0')}`; if (rows.some(t => t.id === id)) throw Object.assign(new Error('Team ID already exists.'), { status: 409 }); const now = new Date().toISOString(); const value = { availability: 'Available', currentIncidentId: null, contactLabel: null, isSample: false, ...team, id, createdAt: now, updatedAt: now }; rows.push(value); write(rows); return value; },
  async update(id, patch) { const rows = read(); const i = rows.findIndex(t => t.id.toLowerCase() === String(id).toLowerCase()); if (i < 0) return null; rows[i] = { ...rows[i], ...patch, updatedAt: new Date().toISOString() }; write(rows); return rows[i]; },
  async claimAvailable(id, incidentId) { const rows=read(), i=rows.findIndex(t=>t.id.toLowerCase()===String(id).toLowerCase()&&t.availability==='Available'); if(i<0)return null; rows[i]={...rows[i],availability:'Busy',currentIncidentId:incidentId,updatedAt:new Date().toISOString()}; write(rows); return rows[i]; },
  async release(id, incidentId) { const rows=read(), i=rows.findIndex(t=>t.id.toLowerCase()===String(id).toLowerCase()&&(!incidentId||t.currentIncidentId===incidentId)); if(i<0)return null; rows[i]={...rows[i],availability:'Available',currentIncidentId:null,updatedAt:new Date().toISOString()}; write(rows); return rows[i]; },
  async delete(id) { const rows = read(); const i = rows.findIndex(t => t.id.toLowerCase() === String(id).toLowerCase()); if (i < 0) return false; rows.splice(i, 1); write(rows); return true; },
  async seed(items) { const rows=read().filter(t=>!t.isSample); write([...rows,...items]); return items.length; },
  async recordAssignment(entry) { let rows=[]; try{rows=JSON.parse(fs.readFileSync(historyFile,'utf8'));}catch{} rows.push({id:require('crypto').randomUUID(),...entry,createdAt:new Date().toISOString()}); fs.writeFileSync(historyFile,JSON.stringify(rows,null,2)); }
  ,async getAssignmentHistory(incidentId) { try{return JSON.parse(fs.readFileSync(historyFile,'utf8')).filter(x=>x.incidentId===incidentId).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));}catch{return [];} }
};
