const speed = Math.max(1, Number(process.env.AVG_TEAM_SPEED_KMPH) || 40);
function haversine(lat1, lng1, lat2, lng2) {
  const rad = n => Number(n) * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}
function estimateTravelMinutes(distanceKm) { return Math.ceil(Number(distanceKm) / speed * 60); }
module.exports = { haversine, estimateTravelMinutes };
