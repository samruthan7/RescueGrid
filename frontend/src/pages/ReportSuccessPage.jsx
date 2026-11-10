import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowLeft, 
  AlertTriangle, 
  ShieldCheck, 
  Activity,
  Calendar,
  MapPin,
  HelpCircle,
  PhoneCall
} from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { incidentApi } from '../services/api';
import { formatExactTime } from '../utils/formatters';

export default function ReportSuccessPage() {
  const { id } = useParams();
  const location = useLocation();

  const [incident, setIncident] = useState(location.state?.incident || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!location.state?.incident);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!incident && id) {
      incidentApi.trackIncident(id)
        .then(data => {
          setIncident(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.response?.data?.error || 'Unable to retrieve incident report.');
          setLoading(false);
        });
    }
  }, [id, incident]);

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
        <p className="text-sm text-zinc-300">{error || 'Incident was not found in the local repository.'}</p>
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

      {/* Mandatory Disclaimer Note from Brief */}
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
              <span className="text-xs uppercase tracking-wider text-gold font-semibold">Algorithmic Severity Result</span>
              <div className="flex items-center gap-3 mt-1">
                <SeverityBadge severity={incident.severity} size="lg" />
                <span className="text-xs text-zinc-300">
                  Total Threat Score: <strong className="text-white font-mono font-bold text-sm">{incident.severityScore} pts</strong>
                </span>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
              Rule-Based Scoring Engine
            </span>
          </div>

          {/* Itemized Reasons */}
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
