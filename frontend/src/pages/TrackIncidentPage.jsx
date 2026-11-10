import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Loader2, 
  History,
  CheckCircle2,
  Calendar,
  Bot,
  ShieldAlert
} from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { incidentApi } from '../services/api';
import { formatExactTime } from '../utils/formatters';

function ConfidenceBar({ confidence }) {
  const pct = Math.round((confidence || 0) * 100);
  const color = pct >= 80 ? '#22C55E' : pct >= 60 ? '#EAB308' : '#F97316';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>AI Confidence</span>
        <span className="font-mono font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function TrackIncidentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [incidentIdInput, setIncidentIdInput] = useState(initialId);
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI polling
  const [aiStatus, setAiStatus] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const pollingRef = useRef(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 24;

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchIncident = async (idToSearch) => {
    const cleanId = idToSearch.trim().toUpperCase();
    if (!cleanId) return;

    setLoading(true);
    setError(null);
    setIncident(null);
    stopPolling();
    pollCountRef.current = 0;

    try {
      const data = await incidentApi.trackIncident(cleanId);
      setIncident(data);
      setAiStatus(data.aiStatus);
      setAiAnalysis(data.aiAnalysis);
      setSearchParams({ id: cleanId });

      // Start AI polling if pending
      if (data.aiStatus === 'pending' || !data.aiStatus) {
        pollingRef.current = setInterval(async () => {
          pollCountRef.current += 1;
          if (pollCountRef.current > MAX_POLLS) { stopPolling(); return; }
          try {
            const updated = await incidentApi.trackIncident(cleanId);
            setIncident(updated);
            setAiStatus(updated.aiStatus);
            setAiAnalysis(updated.aiAnalysis);
            if (updated.aiStatus && updated.aiStatus !== 'pending') stopPolling();
          } catch (e) { /* ignore */ }
        }, 5000);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || `No emergency record matching ID "${cleanId}" was found in the repository.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchIncident(initialId);
    }
    return () => stopPolling();
  }, [initialId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchIncident(incidentIdInput);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <span className="text-xs uppercase tracking-wider text-gold font-bold">Public Incident Status</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gold tracking-tight">Track Your Emergency Report</h1>
        <p className="text-sm text-zinc-300 max-w-lg mx-auto">
          Enter your unique Incident Tracking ID (e.g. <span className="font-mono text-gold">INC-DEMO01</span>) 
          to review real-time classification, dispatch status, and history.
        </p>
      </div>

      {/* Tracking Search Input */}
      <div className="bg-surface rounded-2xl border border-gold/25 p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gold absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Enter Incident ID (e.g. INC-DEMO01)"
              value={incidentIdInput}
              onChange={(e) => setIncidentIdInput(e.target.value)}
              className="w-full bg-[#181818] border border-zinc-700 focus:border-gold rounded-xl pl-12 pr-4 py-3 text-sm text-white font-mono placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !incidentIdInput.trim()}
            className="px-7 py-3 rounded-xl bg-gold text-black font-bold text-xs uppercase tracking-wider hover:bg-gold-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Search className="w-4 h-4" />}
            <span>Track Incident</span>
          </button>
        </form>

        {/* Quick Demo Pre-fill Pills */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span>Demo Tracking IDs:</span>
          {['INC-DEMO01', 'INC-DEMO02', 'INC-DEMO03', 'INC-DEMO06'].map((demoId) => (
            <button
              key={demoId}
              type="button"
              onClick={() => {
                setIncidentIdInput(demoId);
                fetchIncident(demoId);
              }}
              className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-gold border border-gold/30 hover:bg-gold/15 transition-colors"
            >
              {demoId}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-surface rounded-2xl border border-severity-critical/40 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-severity-critical mx-auto" />
          <h2 className="text-lg font-bold text-severity-critical">Incident Not Found</h2>
          <p className="text-xs text-zinc-300 max-w-md mx-auto">{error}</p>
        </div>
      )}

      {/* Incident Result */}
      {incident && (
        <div className="space-y-6 animate-fadeIn">
          {/* Mandatory Disclaimer Note */}
          <div className="bg-[#1C1204] border border-gold/40 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-200 leading-relaxed space-y-1">
                <p className="font-semibold text-gold">Notice Regarding Automated Assessment:</p>
                <p>
                  "This severity is an automated preliminary assessment based on the information you provided. 
                  It has not been verified by authorities. If anyone is in danger, call <strong>112</strong> immediately."
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-gold/25 p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-zinc-800 text-gold border border-gold/30">
                    {incident.id}
                  </span>
                  <span className="text-xs text-zinc-400">Category: {incident.category}</span>
                </div>
                <h2 className="text-2xl font-bold text-gold tracking-tight mt-1">{incident.title}</h2>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Reported on {formatExactTime(incident.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs uppercase text-zinc-400 block mb-1">Status</span>
                  <StatusBadge status={incident.status} size="lg" />
                </div>
              </div>
            </div>

            {/* Severity Result */}
            <div className="bg-black/60 rounded-xl p-5 border border-gold/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs uppercase tracking-wider text-gold font-semibold">Triage Severity Assessment</span>
                  <div className="flex items-center gap-3 mt-1">
                    <SeverityBadge severity={incident.severity} size="lg" />
                    <span className="text-xs text-zinc-300">
                      Calculated Threat Score: <strong className="text-white font-mono font-bold text-sm">{incident.severityScore} pts</strong>
                    </span>
                  </div>
                </div>
                {incident.severityOverride && (
                  <span className="text-xs text-gold border border-gold/40 bg-gold/15 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
                    Manually Reviewed by Authority
                  </span>
                )}
              </div>

              {/* Reasons list */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <span className="text-xs font-semibold text-zinc-300 block">Assessment Criteria Triggered:</span>
                <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-5">
                  {incident.severityReasons && incident.severityReasons.length > 0 ? (
                    incident.severityReasons.map((r, i) => <li key={i}>{r}</li>)
                  ) : (
                    <li>Standard emergency category weight applied</li>
                  )}
                </ul>
              </div>
            </div>

            {/* AI Video Analysis compact section */}
            {(() => {
              const currentAiStatus = aiStatus || incident.aiStatus;
              const currentAiAnalysis = aiAnalysis || incident.aiAnalysis;
              const aiFailed = currentAiStatus === 'failed';
              const aiDone = currentAiStatus && currentAiStatus !== 'pending' && !aiFailed;
              return (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="bg-[#0d1117] border-b border-zinc-800 px-4 py-2.5 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-gold" />
                    <span className="text-xs uppercase tracking-wider text-gold font-bold">AI Video Analysis</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {(!currentAiStatus || currentAiStatus === 'pending') && (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-gold animate-spin shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gold">AI is analyzing the video...</p>
                          <p className="text-[11px] text-zinc-500">Refresh or wait for automatic update.</p>
                        </div>
                      </div>
                    )}
                    {aiFailed && (
                      <p className="text-xs text-zinc-500">AI analysis unavailable — rule-based severity applies.</p>
                    )}
                    {aiDone && currentAiAnalysis && (
                      <div className="space-y-3">
                        {incident.needsHumanReview && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>⚠️ Requires human authority review before final severity is confirmed.</span>
                          </div>
                        )}
                        {currentAiAnalysis.confidence != null && (
                          <ConfidenceBar confidence={currentAiAnalysis.confidence} />
                        )}
                        {currentAiAnalysis.summary && (
                          <p className="text-xs text-zinc-200 leading-relaxed">{currentAiAnalysis.summary}</p>
                        )}
                        {currentAiAnalysis.hazards_visible && currentAiAnalysis.hazards_visible.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {currentAiAnalysis.hazards_visible.map((h, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-severity-critical/15 text-severity-critical border border-severity-critical/30">
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {aiDone && !currentAiAnalysis && (
                      <p className="text-xs text-zinc-500">Analysis complete. Final severity shown above.</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Location */}
            <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 block font-semibold">Reported Location</span>
                <p className="text-xs text-zinc-200 mt-0.5">{incident.location || (incident.latitude != null && incident.longitude != null ? `Approximate area: ${incident.latitude}, ${incident.longitude}` : 'Location details are kept private')}</p>
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gold flex items-center gap-2">
                <History className="w-4 h-4 text-gold" />
                <span>Incident Progress & Dispatch History</span>
              </h3>

              <div className="space-y-3 pl-2 border-l border-gold/20">
                {incident.statusHistory && incident.statusHistory.length > 0 ? (
                  incident.statusHistory.map((item, idx) => (
                    <div key={idx} className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[1.3rem] top-1 w-2.5 h-2.5 rounded-full bg-gold border border-black" />
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} size="sm" />
                        <span className="text-[11px] text-zinc-400">{formatExactTime(item.at)}</span>
                      </div>
                      {item.note && <p className="text-xs text-zinc-300">{item.note}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">Initial incident logged. Waiting for dispatch review.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
