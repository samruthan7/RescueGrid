/**
 * Format relative time (e.g. "3 mins ago", "just now")
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay} days ago`;
  } catch {
    return isoString;
  }
}

/**
 * Format absolute time string
 */
export function formatExactTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * OpenStreetMap URL generator
 */
export function getMapUrl(lat, lon) {
  if (lat == null || lon == null) return null;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}
