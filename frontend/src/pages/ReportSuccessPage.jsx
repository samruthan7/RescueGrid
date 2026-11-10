import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  AlertTriangle,
  Activity,
  MapPin,
  Flame,
  PhoneCall,
  Loader2,
  Bot,
  ShieldAlert,
  Zap,
  Eye,
  AlertCircle
} from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import IncidentMap from '../components/IncidentMap';
import { incidentApi, hotspotApi } from '../services/api';
import { formatExactTime } from '../utils/formatters';

const SEVERITY_COLORS = {
  Critical: 'text-severity-critical',
  High: 'text-severity-high',
  Medium: 'text-severity-medium',
  Low: 'text-severity-low'
};

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

export default function ReportSuccessPage() {
  const { id } = useParams();
  const location = useLocation();

  const [incident, setIncident] = useState(location.state?.incident || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!location.state?.incident);
  const [error, setError] = useState(null);
  const [hotspotWarning, setHotspotWarning] = useState(null);

  // AI polling state
  const [aiStatus, setAiStatus] = useState(incident?.aiStatus || null);
  const [aiAnalysis, setAiAnalysis] = useState(incident?.aiAnalysis || null);
  const pollingRef = useRef(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 24; // 24 × 5s = 2 minutes

  // Initial fetch if no state provided
  useEffect(() => {
    if (!incident && id) {
      incidentApi.trackIncident(id)
        .then(data => {
          setIncident(data);
          setAiStatus(data.aiStatus);
          setAiAnalysis(data.aiAnalysis);
          setLoading(false);
        })
        .catch(err => {
          setError(err.response?.data?.error || 'Unable to retrieve incident report.');
          setLoading(false);
        });
    }
  }, [id, incident]);

  // Start AI polling when incident is loaded and AI is pending
  useEffect(() => {
    if (!incident || !id) return;
    const status = incident.aiStatus || aiStatus;
    if (status === 'pending' || status === null) {
      startPolling();
    }
    return () => stopPolling();
  }, [incident?.id]);

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        stopPolling();
        return;
      }
      try {
        const data = await incidentApi.trackIncident(id);
        setIncident(data);
        setAiStatus(data.aiStatus);
        setAiAnalysis(data.aiAnalysis);
        if (data.aiStatus && data.aiStatus !== 'pending') {
          stopPolling();
        }
      } catch (e) {
        // Silently ignore poll errors
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Check proximity to active hotspots
  useEffect(() => {
    if (incident?.latitude && incident?.longitude) {
      hotspotApi.getNearby(incident.latitude, incident.longitude)
        .then(res => {
          if (res && res.inHotspot) {
            setHotspotWarning(res);
          }
        })
        .catch(err => console.warn('Hotspot proximity check notice:', err.message));
    }
  }, [incident?.id]);

  const handleCopyId = () => {
    if (!incident) return;
    navigator.clipboard.writeText(incident.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-zinc-400">Loading incident confirmation details...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-severity-critical/20 text-severity-critical mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gold">Record Not Found</h2>
        <p className="text-sm text-zinc-300">{error || 'Incident was not found in the repository.'}</p>
        <div className="pt-4">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold text-black font-semibold text-xs uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Submit New Report</span>
          </Link>
        </div>
      </div>
    );
  }

  const effectiveSeverity = incident.finalSeverity || incident.severityOverride || incident.severity;
  const currentAiStatus = aiStatus || incident.aiStatus;
  const currentAiAnalysis = aiAnalysis || incident.aiAnalysis;
  const hasAiResult = currentAiStatus && currentAiStatus !== 'pending';
  const aiFailed = currentAiStatus === 'failed';
  const aiDone = currentAiStatus === 'done' || currentAiStatus === 'completed' || (currentAiStatus && !aiFailed && currentAiStatus !== 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Success Heading */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold mx-auto flex items-center justify-center text-gold shadow-[0_0_25px_rgba(212,175,55,0.3)]">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>
        <span className="text-xs uppercase tracking-widest text-gold font-bold">Report Confirmed</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gold tracking-tight">
          Incident Registered Successfully
        </h1>
        <p className="text-sm text-zinc-300 max-w-lg mx-auto">
          Your emergency report has been saved to the repository with an initial algorithmic triage.
        </p>
      </div>

      {/* Hotspot Proximity Alert Banner */}
      {hotspotWarning && (
        <div className="bg-severity-critical/15 border-2 border-severity-critical/50 rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-white shadow-[0_0_25px_rgba(239,68,68,0.25)] animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-severity-critical/20 flex items-center justify-center shrink-0 text-severity-critical border border-severity-critical/40">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest font-extrabold text-severity-critical block">
              High Density Emergency Cluster
            </span>
            <p className="text-sm sm:text-base font-bold text-white">
              Multiple reports in your area. Authorities are being alerted.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Our automated geospatial clustering engine has detected an active incident cluster in this vicinity.
              Municipal emergency commanders have elevated priority dispatch for this hotspot zone.
            </p>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="bg-[#1C1204] border border-gold/40 rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-200 leading-relaxed space-y-1">
            <p className="font-semibold text-gold">Notice Regarding Automated Assessment:</p>
            <p>
              "This severity is an automated preliminary assessment based on the information you provided.
              It has not been verified by authorities. If anyone is in danger, call <strong>112</strong> immediately."
            </p>
            <p className="text-zinc-400 text-[11px] pt-1">
              * Note: Submitting this form does not guarantee immediate physical response from official municipal emergency services.
            </p>
          </div>
        </div>
      </div>

      {/* Incident Details Card */}
      <div className="bg-surface rounded-2xl border border-gold/25 p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Incident ID Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 block font-medium">Incident Tracking ID</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-2xl font-bold text-gold tracking-wider">{incident.id}</span>
              <button
                onClick={handleCopyId}
                className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-gold hover:border-gold transition-colors flex items-center gap-1.5 text-xs"
                title="Copy Incident ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-gold" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left sm:text-right">
              <span className="text-xs uppercase tracking-wider text-zinc-400 block font-medium">Current Status</span>
              <div className="mt-1">
                <StatusBadge status={incident.status} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Severity Classification Result Panel */}
        <div className="bg-black/60 rounded-xl p-5 border border-gold/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase tracking-wider text-gold font-semibold">
                {aiDone && currentAiAnalysis ? 'Combined Rule + AI Severity' : 'Algorithmic Severity Result'}
              </span>
              <div className="flex items-center gap-3 mt-1">
                <SeverityBadge severity={effectiveSeverity} size="lg" />
                <span className="text-xs text-zinc-300">
                  Threat Score: <strong className="text-white font-mono font-bold text-sm">{incident.severityScore} pts</strong>
                </span>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
              {aiDone && currentAiAnalysis ? 'Rule-Based + AI' : 'Rule-Based Scoring Engine'}
            </span>
          </div>

          {/* Scoring Reasons */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <span className="text-xs font-semibold text-zinc-300 block">Scoring Factors & Detected Triggers:</span>
            <ul className="text-xs text-zinc-300 space-y-1.5 list-disc pl-5">
              {incident.severityReasons && incident.severityReasons.length > 0 ? (
                incident.severityReasons.map((reason, idx) => (
                  <li key={idx} className="leading-normal">{reason}</li>
                ))
              ) : (
                <li>Baseline category parameters applied</li>
              )}
            </ul>
          </div>
        </div>

        {/* AI Video Analysis Section */}
        <div className="rounded-xl border space-y-4 overflow-hidden">
          <div className="bg-[#0d1117] border-b border-zinc-800 px-5 py-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-gold" />
            <span className="text-xs uppercase tracking-wider text-gold font-bold">AI Video Analysis</span>
          </div>

          <div className="px-5 pb-5">
            {/* Pending: Spinner */}
            {(!currentAiStatus || currentAiStatus === 'pending') && (
              <div className="flex items-center gap-3 py-4">
                <div className="relative">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  <div className="absolute inset-0 rounded-full bg-gold/10 animate-ping" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gold">AI is analyzing your video...</p>
                  <p className="text-xs text-zinc-500">This usually takes 30–90 seconds. You can leave this page and check back.</p>
                </div>
              </div>
            )}

            {/* Failed */}
            {aiFailed && (
              <div className="flex items-center gap-3 py-3 text-zinc-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">AI analysis unavailable — rule-based severity applies. Your report is still active.</p>
              </div>
            )}

            {/* Done + Has analysis */}
            {aiDone && currentAiAnalysis && (
              <div className="space-y-5">
                {/* Needs human review warning */}
                {incident.needsHumanReview && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>⚠️ This report requires human authority review before final severity is confirmed. The video or description raised authenticity flags.</span>
                  </div>
                )}

                {/* Confidence Bar */}
                {currentAiAnalysis.confidence != null && (
                  <ConfidenceBar confidence={currentAiAnalysis.confidence} />
                )}

                {/* AI Summary */}
                {currentAiAnalysis.summary && (
                  <div className="bg-[#111] rounded-lg p-4 border border-zinc-800 space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">AI Summary</span>
                    <p className="text-sm text-zinc-200">{currentAiAnalysis.summary}</p>
                  </div>
                )}

                {/* Hazards */}
                {currentAiAnalysis.hazards_visible && currentAiAnalysis.hazards_visible.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">Hazards Detected</span>
                    <div className="flex flex-wrap gap-2">
                      {currentAiAnalysis.hazards_visible.map((h, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-severity-critical/15 text-severity-critical border border-severity-critical/30">
                          🔴 {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Response */}
                {currentAiAnalysis.recommended_response && currentAiAnalysis.recommended_response.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">Recommended Response Units</span>
                    <div className="flex flex-wrap gap-2">
                      {currentAiAnalysis.recommended_response.map((r, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gold/10 text-gold border border-gold/30">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Reasons */}
                {currentAiAnalysis.reasons && currentAiAnalysis.reasons.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">AI Analysis Factors</span>
                    <ul className="text-xs text-zinc-300 space-y-1.5 list-disc pl-5">
                      {currentAiAnalysis.reasons.map((r, i) => (
                        <li key={i} className="leading-normal">
                          <span className="text-gold font-semibold">[AI]</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Done but no analysis object */}
            {aiDone && !currentAiAnalysis && !aiFailed && (
              <p className="text-xs text-zinc-500 py-3">AI analysis complete. Combined severity shown above.</p>
            )}
          </div>
        </div>

        {/* Localized Mini-Map */}
        {incident.latitude && incident.longitude && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-gold font-bold">
                Incident Location Pin & Satellite Map
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                {Number(incident.latitude).toFixed(4)}, {Number(incident.longitude).toFixed(4)}
              </span>
            </div>
            <IncidentMap
              incidents={[incident]}
              center={[Number(incident.latitude), Number(incident.longitude)]}
              zoom={15}
              height="260px"
              interactive={true}
            />
          </div>
        )}

        {/* Summary Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-zinc-400 block">Incident Title</span>
            <span className="text-sm font-bold text-white block">{incident.title}</span>
          </div>
          <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-zinc-400 block">Category</span>
            <span className="text-sm font-bold text-gold block">{incident.category}</span>
          </div>
          <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 space-y-1 sm:col-span-2">
            <span className="text-zinc-400 block">Location</span>
            <div className="flex items-center gap-1.5 text-sm text-white">
              <MapPin className="w-4 h-4 text-gold shrink-0" />
              <span>{incident.location}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to={`/track?id=${incident.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gold text-gold hover:bg-gold/10 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>Go to Live Tracking Page</span>
          </Link>

          <Link
            to="/report"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 text-xs font-medium transition-colors"
          >
            <span>Report Another Emergency</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
