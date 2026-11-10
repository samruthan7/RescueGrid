import React, { useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  useMap, 
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatRelativeTime } from '../utils/formatters';

// Severity color palette
const SEVERITY_COLORS = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#EAB308',
  Low: '#22C55E'
};

// Create custom DOM markers styled with Tailwind and SVG
function createSeverityIcon(severity = 'Low', isPulsing = false) {
  const color = SEVERITY_COLORS[severity] || '#D4AF37';
  const isCrit = severity === 'Critical' || isPulsing;

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8">
      ${isCrit ? `<span class="absolute w-8 h-8 rounded-full opacity-75 animate-ping" style="background-color: ${color};"></span>` : ''}
      <span class="relative flex items-center justify-center w-6 h-6 rounded-full border-2 border-black shadow-lg" style="background-color: ${color};">
        <span class="w-2 h-2 rounded-full bg-black"></span>
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

// Picker pin icon for selecting location
const pickerIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center w-9 h-9">
      <span class="absolute w-9 h-9 rounded-full bg-gold/40 animate-ping"></span>
      <div class="relative w-7 h-7 rounded-full bg-gold border-2 border-black flex items-center justify-center shadow-xl">
        <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2v20m10-10H2" />
        </svg>
      </div>
    </div>
  `,
  className: 'custom-picker-pin',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

// Component to handle map clicks in picker mode
function LocationPickerHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({
          lat: parseFloat(e.latlng.lat.toFixed(6)),
          lng: parseFloat(e.latlng.lng.toFixed(6))
        });
      }
    }
  });
  return null;
}

// Component to auto-fit map view to markers
function MapBoundsManager({ incidents = [], center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && (!incidents || incidents.length === 0)) {
      map.setView(center, zoom || 13);
      return;
    }

    const validPoints = incidents.filter(
      (inc) => inc.latitude !== null && inc.latitude !== undefined && inc.longitude !== null && inc.longitude !== undefined
    );

    if (validPoints.length === 1) {
      map.setView([validPoints[0].latitude, validPoints[0].longitude], 14);
    } else if (validPoints.length > 1) {
      const bounds = L.latLngBounds(
        validPoints.map((inc) => [Number(inc.latitude), Number(inc.longitude)])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [incidents, center, zoom, map]);

  return null;
}

export default function IncidentMap({
  incidents = [],
  hotspots = [],
  selectedIncident = null,
  onSelectIncident,
  // Location picker props
  isPicker = false,
  pickerLocation = null, // { lat, lng }
  onLocationSelect,
  // Map display settings
  center = [13.6288, 79.4192], // Default Tirupati, AP center
  zoom = 13,
  height = '420px',
  interactive = true,
  className = ''
}) {
  const markerRef = useRef(null);

  // Draggable marker event handler for picker
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null && onLocationSelect) {
          const latlng = marker.getLatLng();
          onLocationSelect({
            lat: parseFloat(latlng.lat.toFixed(6)),
            lng: parseFloat(latlng.lng.toFixed(6))
          });
        }
      }
    }),
    [onLocationSelect]
  );

  const effectiveCenter = pickerLocation
    ? [pickerLocation.lat, pickerLocation.lng]
    : center;

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden border border-gold/30 shadow-2xl bg-[#0F0F0F] ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={effectiveCenter}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="w-full h-full z-0"
        style={{ background: '#121212' }}
      >
        {/* Dark themed tile layer: CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Auto fit manager */}
        {!isPicker && <MapBoundsManager incidents={incidents} center={center} zoom={zoom} />}

        {/* Location Picker Mode: Click & Drag pin */}
        {isPicker && (
          <>
            <LocationPickerHandler onLocationSelect={onLocationSelect} />
            {pickerLocation && pickerLocation.lat && pickerLocation.lng && (
              <Marker
                draggable={true}
                eventHandlers={eventHandlers}
                position={[pickerLocation.lat, pickerLocation.lng]}
                icon={pickerIcon}
                ref={markerRef}
              >
                <Popup className="rescuegrid-leaflet-popup">
                  <div className="p-2 text-xs text-white space-y-1">
                    <span className="font-bold text-gold block">Selected Incident Coordinate</span>
                    <p className="font-mono text-[11px] text-zinc-300">
                      {pickerLocation.lat.toFixed(6)}, {pickerLocation.lng.toFixed(6)}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Drag marker or click anywhere on map to reposition.
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}

        {/* Active Hotspot Radius Overlays (Red/Orange Translucent Circles) */}
        {hotspots &&
          hotspots.map((h) => {
            const isCrit = h.severity === 'Critical';
            const color = isCrit ? '#EF4444' : '#F97316';
            return (
              <Circle
                key={h.id || `hotspot-${h.centerLat}-${h.centerLng}`}
                center={[h.centerLat, h.centerLng]}
                radius={h.radiusM || 1000}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.22,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              >
                <Popup className="rescuegrid-leaflet-popup">
                  <div className="p-2.5 text-xs text-white space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase tracking-wide text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${color}33`, color: color }}>
                        🔥 Active Hotspot
                      </span>
                      <span className="text-[11px] font-bold text-gold">{h.severity}</span>
                    </div>
                    <p className="font-bold text-sm text-white">{h.category || 'Emergency Cluster'}</p>
                    <p className="text-[11px] text-zinc-300">
                      <span className="font-bold text-gold">{h.reportCount}</span> incidents detected in last 60 minutes
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Radius: {h.radiusM || 1000}m coverage zone
                    </p>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* Incident Marker Pins */}
        {!isPicker &&
          incidents &&
          incidents.map((incident) => {
            const lat = Number(incident.latitude);
            const lng = Number(incident.longitude);
            if (isNaN(lat) || isNaN(lng) || lat === null || lng === null) return null;

            const effSeverity = incident.severityOverride || incident.finalSeverity || incident.severity || 'Low';
            const icon = createSeverityIcon(effSeverity, effSeverity === 'Critical');

            return (
              <Marker
                key={incident.id}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (onSelectIncident) {
                      onSelectIncident(incident);
                    }
                  }
                }}
              >
                <Popup className="rescuegrid-leaflet-popup">
                  <div className="p-3 text-xs text-white space-y-2 min-w-[220px]">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-700/60 pb-1.5">
                      <span className="font-mono font-bold text-gold text-xs">{incident.id}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${SEVERITY_COLORS[effSeverity] || '#888'}25`,
                          color: SEVERITY_COLORS[effSeverity] || '#fff'
                        }}
                      >
                        {effSeverity}
                      </span>
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="font-bold text-white text-xs">{incident.title || incident.category}</h4>
                      <p className="text-[11px] text-zinc-300 mt-0.5">{incident.category}</p>
                      {incident.location && (
                        <p className="text-[10px] text-zinc-400 truncate mt-1">📍 {incident.location}</p>
                      )}
                    </div>

                    {/* Status & Timestamp */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-700/60">
                      <span>Status: <strong className="text-white">{incident.status}</strong></span>
                      {incident.createdAt && (
                        <span>{formatRelativeTime(incident.createdAt)}</span>
                      )}
                    </div>

                    {/* Action button if onSelectIncident provided */}
                    {onSelectIncident && (
                      <button
                        type="button"
                        onClick={() => onSelectIncident(incident)}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg bg-gold text-black font-extrabold text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors text-center"
                      >
                        View Full Details
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-10 bg-black/85 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-800 text-[10px] text-zinc-300 space-y-1 select-none pointer-events-none sm:pointer-events-auto">
        <span className="font-bold text-gold uppercase tracking-wider block text-[9px]">Severity Legend</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-severity-critical animate-pulse"></span>
            Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-severity-high"></span>
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-severity-medium"></span>
            Med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-severity-low"></span>
            Low
          </span>
        </div>
      </div>
    </div>
  );
}
