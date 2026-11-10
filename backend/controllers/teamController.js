const teams = require('../teamRepository');
const incidents = require('../repositories');
const assignmentService = require('../services/assignmentService');
const CATEGORIES = ['Fire','Medical','Rescue','Police','Disaster Response'];
const clean = s => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim();
function validate(body, partial=false) {
 const e={};
 if (!partial || body.name!==undefined) { if(typeof body.name!=='string'||!clean(body.name)||clean(body.name).length>100)e.name='Name is required (maximum 100 characters).'; }
 if (!partial || body.category!==undefined) if(!CATEGORIES.includes(body.category))e.category='Invalid team category.';
 const lat=body.location?.lat ?? body.lat, lng=body.location?.lng ?? body.lng;
 if (body.location && (body.location.lat===undefined || body.location.lng===undefined)) e.location='Location must include both latitude and longitude.';
 if (!partial || lat!==undefined) if(lat===null||lat===''||!Number.isFinite(Number(lat))||Number(lat)<-90||Number(lat)>90)e.lat='Latitude must be between -90 and 90.';
 if (!partial || lng!==undefined) if(lng===null||lng===''||!Number.isFinite(Number(lng))||Number(lng)<-180||Number(lng)>180)e.lng='Longitude must be between -180 and 180.';
 if(body.availability!==undefined&&!['Available','Busy'].includes(body.availability))e.availability='Availability must be Available or Busy.';
 return e;
}
const fail=(res,error)=>res.status(error.status||500).json({error:error.status?error.message:'Team operation failed.'});
exports.list=async(req,res)=>{try{res.json(await teams.getAll({category:req.query.category,availability:req.query.availability}));}catch(e){fail(res,e);}};
exports.get=async(req,res)=>{try{const t=await teams.getById(req.params.id); t?res.json(t):res.status(404).json({error:'Team not found.'});}catch(e){fail(res,e);}};
exports.create=async(req,res)=>{const b=req.body||{},e=validate(b); if(b.id&&!/^TEAM-[0-9]{3,}$/.test(clean(b.id)))e.id='Team ID must look like TEAM-001.'; if(Object.keys(e).length)return res.status(400).json({error:'Invalid team.',errors:e}); try{let id=b.id?clean(b.id):null; if(!id){const all=await teams.getAll(); id=`TEAM-${String(all.reduce((m,t)=>Math.max(m,Number((t.id.match(/(\d+)$/)||[])[1])||0),0)+1).padStart(3,'0')}`;} res.status(201).json(await teams.create({id,name:clean(b.name),category:b.category,lat:Number(b.location?.lat??b.lat),lng:Number(b.location?.lng??b.lng),availability:b.availability||'Available',contactLabel:b.contactLabel?clean(b.contactLabel):null}));}catch(x){fail(res,x);}};
exports.update=async(req,res)=>{const b=req.body||{}, e=validate(b,true); if(Object.keys(e).length)return res.status(400).json({error:'Invalid team.',errors:e}); try{const old=await teams.getById(req.params.id); if(!old)return res.status(404).json({error:'Team not found.'}); if(b.availability==='Available'&&old.currentIncidentId)return res.status(409).json({error:'This team has an active incident. Release it through the incident before setting availability to Available.'}); const patch={}; for(const k of ['name','category','availability','contactLabel'])if(b[k]!==undefined)patch[k]=k==='name'||k==='contactLabel'?clean(b[k]):b[k]; if(b.location||b.lat!==undefined)patch.lat=Number(b.location?.lat??b.lat); if(b.location||b.lng!==undefined)patch.lng=Number(b.location?.lng??b.lng); const t=await teams.update(req.params.id,patch); res.json(t);}catch(x){fail(res,x);}};
exports.remove=async(req,res)=>{try{const old=await teams.getById(req.params.id); if(!old)return res.status(404).json({error:'Team not found.'}); if(old.availability==='Busy'&&old.currentIncidentId)return res.status(409).json({error:'Cannot delete a Busy team with an active incident. Release the incident first.'}); await teams.delete(req.params.id); res.json({message:'Team deleted.'});}catch(e){fail(res,e);}};
exports.assign=async(req,res)=>{try{const result=await assignmentService.assignTeam(req.params.id,req.body?.teamId,req.user?.username); res.json(result);}catch(e){res.status(e.status||500).json({error:e.message||'Assignment failed.'});}};
exports.recommend=async(req,res)=>{try{const incident=await incidents.getById(req.params.id); if(!incident)return res.status(404).json({error:'Incident not found.'}); res.json(await assignmentService.findBestTeams(incident,3));}catch(e){fail(res,e);}};
exports.unassign=async(req,res)=>{try{res.json({incident:await assignmentService.unassignTeam(req.params.id,req.user?.username)});}catch(e){res.status(e.status||500).json({error:e.message||'Unassign failed.'});}};
exports.history=async(req,res)=>{try{const incident=await incidents.getById(req.params.id); if(!incident)return res.status(404).json({error:'Incident not found.'}); res.json(await teams.getAssignmentHistory(req.params.id));}catch(e){fail(res,e);}};
exports.autoDispatch=async(req,res)=>{try{res.json(await assignmentService.autoDispatchAll());}catch(e){fail(res,e);}};
exports.route=async(req,res)=>{const names=['fromLat','fromLng','toLat','toLng'];const c=Object.fromEntries(names.map(k=>[k,Number(req.query[k])])); if(names.some(k=>req.query[k]===undefined||!Number.isFinite(c[k]))||c.fromLat < -90||c.fromLat>90||c.toLat < -90||c.toLat>90||c.fromLng < -180||c.fromLng>180||c.toLng < -180||c.toLng>180)return res.status(400).json({error:'Valid route coordinates are required.'}); try{res.json(await require('../services/routingService').getRoute(c.fromLat,c.fromLng,c.toLat,c.toLng));}catch(e){res.status(200).json(await require('../services/routingService').getRoute(c.fromLat,c.fromLng,c.toLat,c.toLng));}};
