const { haversine, estimateTravelMinutes } = require('./distanceService');
const cache = new Map();
function pointKey(n) { return Number(n).toFixed(4); }
async function getRoute(fromLat, fromLng, toLat, toLng) {
  const key=[fromLat,fromLng,toLat,toLng].map(pointKey).join(',');
  if(cache.has(key)) return cache.get(key);
  const distanceKm=haversine(fromLat,fromLng,toLat,toLng);
  const straight={distanceKm,durationMin:estimateTravelMinutes(distanceKm),geometry:{type:'LineString',coordinates:[[Number(fromLng),Number(fromLat)],[Number(toLng),Number(toLat)]]},source:'straight-line'};
  const base=(process.env.OSRM_BASE_URL||'https://router.project-osrm.org').replace(/\/$/,'');
  try {
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),Number(process.env.ROUTING_TIMEOUT_MS)||3000);
    const response=await fetch(`${base}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,{signal:controller.signal}); clearTimeout(timeout);
    if(!response.ok) throw new Error(`OSRM returned ${response.status}`);
    const data=await response.json(), route=data.routes?.[0];
    if(!route?.geometry?.coordinates) throw new Error('OSRM route missing geometry');
    const result={distanceKm:Number((route.distance/1000).toFixed(2)),durationMin:Math.ceil(route.duration/60),geometry:route.geometry,source:'road'};
    cache.set(key,result); return result;
  } catch { cache.set(key,straight); return straight; }
}
function clearRouteCache(){cache.clear();}
module.exports={getRoute,clearRouteCache};
