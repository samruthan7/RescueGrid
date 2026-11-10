import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  ExternalLink, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  User, 
  AlertTriangle, 
  History, 
  ShieldAlert, 
  Trash2, 
  SlidersHorizontal,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { getMapUrl, formatExactTime } from '../utils/formatters';

export default function IncidentModal({
  incident,
  onClose,
  onUpdateStatus,
  onOverrideSeverity,
  onDelete
}) {
  const [selectedStatus, setSelectedStatus] = useState(incident.status);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [overrideLevel, setOverrideLevel] = useState(incident.severityOverride || '');
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!incident) return null;

  const mapUrl = getMapUrl(incident.latitude, incident.longitude);
  const effectiveSeverity = incident.severityOverride || incident.severity;

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (selectedStatus === incident.status && !statusNote) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(incident.id, selectedStatus, statusNote);
      setStatusNote('');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    setIsSavingOverride(true);
    try {
      await onOverrideSeverity(incident.id, overrideLevel || null, overrideReason);
      setShowOverrideForm(false);
      setOverrideReason('');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(incident.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn">
        <div className="w-full max-w-2xl bg-surface border-l border-gold/30 h-full overflow-y-auto flex flex-col shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-[#161616] border-b border-gold/20 p-5 z-10 flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {incident.id}
                </span>
                <SeverityBadge severity={effectiveSeverity} size="md" />
                <StatusBadge status={incident.status} size="md" />
                {incident.severityOverride && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/40">
                    Authority Overridden
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gold tracking-tight mt-2">{incident.title}</h2>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                Reported {formatExactTime(incident.createdAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Description Section */}
            <div className="bg-[#181818] rounded-xl p-4 border border-zinc-800 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gold font-semibold">Incident Narrative</h3>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* Location & Coordinates */}
            <div className="bg-[#181818] rounded-xl p-4 border border-zinc-800 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gold font-semibold">Location Details</h3>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 text-sm text-zinc-200">
                  <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span>{incident.location}</span>
                </div>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-gold border border-gold/40 bg-gold/10 px-2.5 py-1.5 rounded-md hover:bg-gold/20 transition-colors shrink-0 font-medium"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {incident.latitude != null && incident.longitude != null && (
                <div className="text-xs font-mono text-zinc-400 pl-6">
                  Lat: {incident.latitude.toFixed(6)}, Lon: {incident.longitude.toFixed(6)}
                </div>
              )}
            </div>

            {/* Incident Metrics & Context */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#181818] p-3 rounded-lg border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Category</span>
                <span className="text-xs font-semibold text-white mt-1 block">{incident.category}</span>
              </div>
              <div className="bg-[#181818] p-3 rounded-lg border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">People Affected</span>
                <span className="text-xs font-semibold text-white mt-1 block flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-gold" />
                  {incident.peopleAffected}
                </span>
              </div>
              <div className="bg-[#181818] p-3 rounded-lg border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">People Trapped</span>
                <span className={`text-xs font-semibold mt-1 block ${incident.peopleTrapped === 'Yes' ? 'text-severity-critical' : 'text-white'}`}>
                  {incident.peopleTrapped || 'Unknown'}
                </span>
              </div>
              <div className="bg-[#181818] p-3 rounded-lg border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Immediate Danger</span>
                <span className={`text-xs font-semibold mt-1 block ${incident.immediateDanger === 'Yes' ? 'text-severity-critical' : 'text-white'}`}>
                  {incident.immediateDanger || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Citizen Contact Information (Admin only view) */}
            <div className="bg-[#181818] rounded-xl p-4 border border-zinc-800 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gold font-semibold">Citizen Contact Information</h3>
              {incident.contactName || incident.contactPhone || incident.contactEmail ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gold" />
                    <span>{incident.contactName || 'Anonymous'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gold" />
                    <span>{incident.contactPhone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gold" />
                    <span>{incident.contactEmail || 'No email'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No contact information provided by reporting citizen.</p>
              )}
            </div>

            {/* Severity Assessment & Override */}
            <div className="bg-[#181818] rounded-xl p-4 border border-gold/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-gold font-semibold">Severity Classification</h3>
                  <p className="text-xs text-zinc-400">
                    System Score: <span className="text-white font-mono font-bold">{incident.severityScore} pts</span> | System Level: <span className="font-semibold text-white">{incident.severity}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOverrideForm(!showOverrideForm)}
                  className="inline-flex items-center gap-1.5 text-xs text-gold border border-gold/40 hover:bg-gold/10 px-2.5 py-1 rounded transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showOverrideForm ? 'Close Override' : 'Override Severity'}</span>
                </button>
              </div>

              {/* Severity Reasons breakdown */}
              <div className="bg-black/50 p-3 rounded-lg border border-zinc-800 space-y-1.5">
                <span className="text-[11px] text-zinc-400 block font-medium">Scoring Audit Trail:</span>
                <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                  {incident.severityReasons && incident.severityReasons.length > 0 ? (
                    incident.severityReasons.map((r, i) => <li key={i}>{r}</li>)
                  ) : (
                    <li>Standard baseline assessment</li>
                  )}
                </ul>
              </div>

              {/* Override Form */}
              {showOverrideForm && (
                <form onSubmit={handleOverrideSubmit} className="pt-2 border-t border-zinc-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-300 block mb-1">New Severity Level</label>
                      <select
                        value={overrideLevel}
                        onChange={(e) => setOverrideLevel(e.target.value)}
                        className="w-full bg-black border border-gold/40 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="">Reset to System Level ({incident.severity})</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-300 block mb-1">Override Reason / Justification</label>
                      <input
                        type="text"
                        placeholder="e.g. Visual confirmation by drone unit"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full bg-black border border-zinc-700 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOverrideForm(false)}
                      className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingOverride}
                      className="px-3 py-1 text-xs bg-gold text-black font-semibold rounded hover:bg-gold-light disabled:opacity-50"
                    >
                      {isSavingOverride ? 'Saving...' : 'Apply Severity Override'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Lifecycle Status Management */}
            <div className="bg-[#181818] rounded-xl p-4 border border-zinc-800 space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gold font-semibold">Update Status</h3>
              <form onSubmit={handleStatusSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-300 block mb-1">Incident Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-black border border-gold/40 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
                    >
                      <option value="Reported">Reported</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 block mb-1">Status Note / Dispatch Log</label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 4 arriving on scene"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full bg-black border border-zinc-700 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingStatus || (selectedStatus === incident.status && !statusNote)}
                    className="px-3 py-1.5 text-xs bg-gold text-black font-semibold rounded hover:bg-gold-light disabled:opacity-40 transition-colors"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </form>
            </div>

            {/* Status History Timeline */}
            <div className="bg-[#181818] rounded-xl p-4 border border-zinc-800 space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gold font-semibold flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-gold" />
                Status History Timeline
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
                  <p className="text-xs text-zinc-400">No status updates logged.</p>
                )}
              </div>
            </div>

            {/* Danger Zone: Delete Report */}
            <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-semibold text-severity-critical">Delete Incident</h4>
                <p className="text-[11px] text-zinc-400">Purge simulated, duplicate, or test emergency records.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-severity-critical/15 text-severity-critical border border-severity-critical/30 hover:bg-severity-critical/30 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-[#181818] border border-severity-critical/40 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-severity-critical">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-severity-critical">Confirm Permanent Deletion</h3>
            </div>
            <p className="text-sm text-zinc-200">
              Are you sure you want to delete incident <strong className="text-gold">{incident.id}</strong>?
            </p>
            <div className="p-3 rounded bg-severity-critical/10 border border-severity-critical/20 text-xs text-severity-critical">
              <strong>Warning:</strong> This cannot be undone. All audit records and status history will be removed from the repository.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-severity-critical rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
