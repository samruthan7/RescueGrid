import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Hourglass, 
  Activity, 
  RefreshCw, 
  Search, 
  Filter, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Eye, 
  MapPin, 
  Trash2, 
  Flame, 
  Users, 
  Clock, 
  ChevronRight,
  ExternalLink,
  Layers,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

import TiltCard from '../components/TiltCard';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import IncidentModal from '../components/IncidentModal';
import Toast from '../components/Toast';
import { incidentApi, authService } from '../services/api';
import { formatRelativeTime, formatExactTime } from '../utils/formatters';

const CATEGORY_CHART_COLORS = {
  'Fire Emergency': '#EF4444',
  'Building Collapse': '#F97316',
  'Road Accident': '#EAB308',
  'Medical Emergency': '#D4AF37',
  'Flood': '#3B82F6',
  'Other Emergencies': '#A855F7'
};

const SEVERITY_COLORS = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#EAB308',
  Low: '#22C55E'
};

export default function AuthorityDashboardPage() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' or 'severity'

  // Modal & Toast
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [statsData, incidentsData] = await Promise.all([
        incidentApi.getStats(),
        incidentApi.getIncidents({
          search: searchTerm,
          category: categoryFilter,
          severity: severityFilter,
          status: statusFilter,
          sort: sortBy
        })
      ]);
      setStats(statsData);
      setIncidents(incidentsData);
      setLastUpdated(new Date());

      // If active incident is open in modal, refresh its data too
      if (selectedIncident) {
        const fresh = incidentsData.find(i => i.id === selectedIncident.id);
        if (fresh) setSelectedIncident(fresh);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showToast('Error syncing with emergency repository', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and filter change trigger
  useEffect(() => {
    loadData();
  }, [searchTerm, categoryFilter, severityFilter, statusFilter, sortBy]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(timer);
  }, [searchTerm, categoryFilter, severityFilter, statusFilter, sortBy, selectedIncident]);

  // Management Handlers
  const handleUpdateStatus = async (id, newStatus, note) => {
    try {
      const res = await incidentApi.updateStatus(id, newStatus, note);
      showToast(`Status updated to "${newStatus}" for incident ${id}`);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleOverrideSeverity = async (id, newSeverity, reason) => {
    try {
      const res = await incidentApi.overrideSeverity(id, newSeverity, reason);
      showToast(res.message || 'Severity successfully adjusted');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to override severity', 'error');
    }
  };

  const handleDeleteIncident = async (id) => {
    try {
      await incidentApi.deleteIncident(id);
      showToast(`Incident ${id} deleted permanently`);
      setSelectedIncident(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete incident', 'error');
    }
  };

  // Category chart formatting data
  const categoryChartData = stats?.byCategory
    ? Object.keys(stats.byCategory).map(cat => ({
        name: cat.replace(' Emergency', ''),
        fullName: cat,
        count: stats.byCategory[cat] || 0
      }))
    : [];

  // Severity pie chart formatting data
  const severityChartData = stats?.bySeverity
    ? Object.keys(stats.bySeverity).map(sev => ({
        name: sev,
        value: stats.bySeverity[sev] || 0
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Header & Refresh Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gold/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-severity-low animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider text-gold font-bold">Centralized Operations Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gold tracking-tight mt-1">Authority Emergency Dashboard</h1>
          <p className="text-xs text-zinc-400">
            Real-time incident classification, resource dispatch & threat mitigation registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-zinc-400">
            <span className="block">Auto-refresh: 15s</span>
            <span className="text-[11px] text-zinc-500">
              Synced: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-gold/40 text-gold hover:bg-gold/15 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Manual Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards (with 3D Tilt Hover Effect) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidents */}
        <TiltCard className="bg-surface rounded-2xl border border-gold/30 p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Reported</span>
            <div className="p-2 rounded-lg bg-gold/15 text-gold border border-gold/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gold font-mono">{stats?.total ?? 0}</span>
            <span className="text-xs text-zinc-400">incidents</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Active repository database records</p>
        </TiltCard>

        {/* Critical Incidents (Highlighted) */}
        <TiltCard className="bg-surface rounded-2xl border border-severity-critical/50 p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-severity-critical">Critical Incidents</span>
            <div className="p-2 rounded-lg bg-severity-critical/20 text-severity-critical border border-severity-critical/40 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-severity-critical font-mono">{stats?.critical ?? 0}</span>
            <span className="text-xs text-zinc-400">critical</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">High lethality & immediate life threat</p>
        </TiltCard>

        {/* Pending Incidents */}
        <TiltCard className="bg-surface rounded-2xl border border-severity-medium/40 p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-severity-medium">Pending Triage</span>
            <div className="p-2 rounded-lg bg-severity-medium/15 text-severity-medium border border-severity-medium/30">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-severity-medium font-mono">{stats?.pending ?? 0}</span>
            <span className="text-xs text-zinc-400">pending</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Awaiting crew or resource dispatch</p>
        </TiltCard>

        {/* Resolved Incidents */}
        <TiltCard className="bg-surface rounded-2xl border border-severity-low/40 p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-severity-low">Resolved Emergencies</span>
            <div className="p-2 rounded-lg bg-severity-low/15 text-severity-low border border-severity-low/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-severity-low font-mono">{stats?.resolved ?? 0}</span>
            <span className="text-xs text-zinc-400">resolved</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Scene stabilized & hazard cleared</p>
        </TiltCard>
      </div>

      {/* Visual Analytics Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Distribution Bar Chart */}
        <div className="lg:col-span-8 bg-surface rounded-2xl border border-gold/25 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gold" />
              <h2 className="text-base font-bold text-gold">Incidents by Disaster Category</h2>
            </div>
            <span className="text-xs text-zinc-400">6 Domains Tracked</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#A1A1AA" 
                  fontSize={11} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#A1A1AA" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: '#D4AF37',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }}
                  formatter={(value, name, props) => [`${value} incidents`, props.payload.fullName]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_CHART_COLORS[entry.fullName] || '#D4AF37'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Donut / Summary */}
        <div className="lg:col-span-4 bg-surface rounded-2xl border border-gold/25 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-gold" />
                <h2 className="text-base font-bold text-gold">Severity Breakdown</h2>
              </div>
              <span className="text-xs text-zinc-400">Triage Ratio</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`sev-cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#181818',
                      borderColor: '#D4AF37',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick legend with counts */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs">
            {severityChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[item.name] }}
                  />
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Filtering & Table Section */}
      <div className="bg-surface rounded-2xl border border-gold/25 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gold">Incident Registry & Operations Queue</h2>
            <p className="text-xs text-zinc-400">Search by keywords, filter attributes, or click any row to inspect.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-gold absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ID, title, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#181818] border border-zinc-700 focus:border-gold rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#181818] border border-zinc-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
            >
              <option value="All">All Categories</option>
              <option value="Fire Emergency">Fire Emergency</option>
              <option value="Road Accident">Road Accident</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Flood">Flood</option>
              <option value="Building Collapse">Building Collapse</option>
              <option value="Other Emergencies">Other Emergencies</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#181818] border border-zinc-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#181818] border border-zinc-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
            >
              <option value="All">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(sortBy === 'severity' ? 'newest' : 'severity')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold/40 bg-gold/10 text-gold text-xs font-semibold hover:bg-gold/20 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort: {sortBy === 'severity' ? 'Severity (Critical First)' : 'Newest'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181818] border-b border-zinc-800 text-gold uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Impact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reported</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <p className="text-sm">No emergency incidents match current query filters.</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCategoryFilter('All');
                        setSeverityFilter('All');
                        setStatusFilter('All');
                      }}
                      className="mt-2 text-xs text-gold underline hover:text-white"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const effectiveSev = inc.severityOverride || inc.severity;
                  const isCritical = effectiveSev === 'Critical';

                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`cursor-pointer transition-colors hover:bg-zinc-800/60 ${
                        isCritical
                          ? 'border-l-4 border-l-severity-critical bg-severity-critical/5'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-gold whitespace-nowrap">
                        {inc.id}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-white block truncate">{inc.title}</span>
                        <span className="text-[11px] text-zinc-400 block truncate">{inc.description}</span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                        {inc.category}
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={effectiveSev} size="sm" />
                          {inc.severityOverride && (
                            <span className="text-[10px] text-gold/80" title="Manually overridden">
                              (Mod)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Impact */}
                      <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          {inc.peopleAffected}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-zinc-300 max-w-[180px] truncate" title={inc.location}>
                        {inc.location}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={inc.status} size="sm" />
                      </td>

                      {/* Reported Time */}
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap" title={formatExactTime(inc.createdAt)}>
                        {formatRelativeTime(inc.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(inc);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-800 text-gold border border-gold/30 hover:bg-gold hover:text-black font-semibold text-xs transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Slide-over / Management Modal */}
      {selectedIncident && (
        <IncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={handleUpdateStatus}
          onOverrideSeverity={handleOverrideSeverity}
          onDelete={handleDeleteIncident}
        />
      )}
    </div>
  );
}
