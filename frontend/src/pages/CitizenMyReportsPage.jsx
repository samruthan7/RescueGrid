import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  AlertCircle, 
  Clock, 
  MapPin, 
  ExternalLink, 
  RefreshCw, 
  PlusCircle, 
  Activity, 
  FileText,
  UserCheck
} from 'lucide-react';
import { citizenApi } from '../services/api';
import { useCitizenAuth } from '../context/CitizenAuthContext';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatExactTime, formatRelativeTime } from '../utils/formatters';

export default function CitizenMyReportsPage() {
  const { citizen } = useCitizenAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadIncidents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await citizenApi.getMyIncidents();
      setIncidents(data.incidents || []);
      setError('');
    } catch (err) {
      console.error('Error fetching citizen incidents:', err);
      setError('Unable to load your incident reports. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gold/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gold font-bold">Verified Citizen Profile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gold tracking-tight">
              {citizen?.name || 'Citizen'}
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Registered Mobile: {citizen?.phone || 'Loading...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadIncidents(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-700 bg-surface text-zinc-300 text-xs font-semibold hover:border-gold hover:text-gold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-gold' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-black text-xs font-extrabold uppercase tracking-wide hover:bg-gold-light transition-colors shadow-[0_0_12px_rgba(212,175,55,0.3)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Report</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-severity-critical/15 border border-severity-critical/40 text-severity-critical text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Loading your reported incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-gold/20 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 mx-auto flex items-center justify-center text-gold">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gold">No Emergency Reports Logged</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            You haven't reported any emergency incidents yet. All reports submitted with this mobile number will appear here with live authority dispatch updates.
          </p>
          <div className="pt-2">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-black font-extrabold text-xs uppercase tracking-wider hover:bg-gold-light shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Report an Emergency Incident</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>Showing {incidents.length} personal emergency record{incidents.length === 1 ? '' : 's'}</span>
            <span>Real-time Audit Trail</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {incidents.map((incident) => {
              const effectiveSeverity = incident.severityOverride || incident.finalSeverity || incident.severity || 'Low';
              return (
                <div
                  key={incident.id}
                  className="bg-surface rounded-2xl border border-zinc-800 hover:border-gold/40 transition-all p-5 space-y-3"
                >
                  {/* Top Bar: ID, Category, Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                        {incident.id}
                      </span>
                      <span className="text-xs font-medium text-zinc-400">
                        {incident.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={effectiveSeverity} />
                      <StatusBadge status={incident.status} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-gold transition-colors">
                      {incident.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {incident.description}
                    </p>
                  </div>

                  {/* Metadata & Track Link */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gold" />
                        <span className="truncate max-w-[200px] sm:max-w-xs">{incident.location}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatRelativeTime(incident.createdAt)}</span>
                      </span>
                    </div>

                    <Link
                      to={`/report/success/${incident.id}`}
                      className="inline-flex items-center gap-1.5 text-gold hover:text-gold-light font-semibold text-xs transition-colors ml-auto"
                    >
                      <span>Track Dispatch Live</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
