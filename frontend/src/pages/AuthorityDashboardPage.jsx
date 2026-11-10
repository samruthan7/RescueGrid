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
  PieChart as PieIcon,
  Map as MapIcon,
  List as ListIcon,
  Check,
  Radio
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
import IncidentMap from '../components/IncidentMap';
import Toast from '../components/Toast';
import { OpsAssistantPanel } from '../components/AssistantChat';
import { incidentApi, hotspotApi, authService } from '../services/api';
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
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // View mode tab: 'split' | 'table' | 'map'
  const [viewMode, setViewMode] = useState('split');

  // Dashboard main tab: 'incidents' | 'analytics' | 'opsassist'
  const [dashTab, setDashTab] = useState('incidents');

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);

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
      const [statsData, incidentsData, hotspotsData] = await Promise.all([
        incidentApi.getStats(),
        incidentApi.getIncidents({
          search: searchTerm,
          category: categoryFilter,
          severity: severityFilter,
          status: statusFilter,
          sort: sortBy
        }),
        hotspotApi.getAll().catch(err => {
          console.warn('Hotspot fetch error:', err.message);
          return { hotspots: [] };
        })
      ]);

      setStats(statsData);
      setIncidents(incidentsData);
      setHotspots(hotspotsData?.hotspots || []);
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

  // Load analytics when analytics tab is opened
  useEffect(() => {
    if (dashTab === 'analytics' && !analytics) {
      setAnalyticsLoading(true);
      import('../services/api').then(({ analyticsApi }) => {
        analyticsApi.getAnalytics()
          .then(data => { setAnalytics(data); setAnalyticsLoading(false); })
          .catch(err => { console.error('Analytics error:', err); setAnalyticsLoading(false); });
      });
    }
  }, [dashTab]);

  const handleExportCsv = async (includeContact = false) => {
    if (includeContact && !window.confirm('This will include personal contact data (name, phone, email). Are you sure?')) return;
    setCsvExporting(true);
    try {
      const { analyticsApi } = await import('../services/api');
      const blob = await analyticsApi.exportCsv(includeContact);
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rescuegrid-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV export downloaded successfully');
    } catch (err) {
      showToast('CSV export failed', 'error');
    } finally {
      setCsvExporting(false);
    }
  };

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

  const handleHotspotStatus = async (id, status) => {
    try {
      await hotspotApi.updateStatus(id, status);
      showToast(`Hotspot alert marked as "${status}"`);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update hotspot status', 'error');
    }
  };

  // Active or acknowledged hotspots
  const activeHotspots = hotspots.filter(
    h => h.status === 'active' || h.status === 'acknowledged'
  );

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

      {/* Active Hotspot Alerts Banner Strip */}
      {activeHotspots.length > 0 && (
        <div className="bg-severity-critical/10 border-2 border-severity-critical/40 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-severity-critical/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-severity-critical/20 border border-severity-critical/40 flex items-center justify-center text-severity-critical animate-pulse">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-severity-critical">
                    Active Hotspot Clusters ({activeHotspots.length})
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-severity-critical text-black animate-pulse">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  Automated spatial engine detected multiple emergencies within 1km radius window.
                </p>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              PostGIS / Haversine Density
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeHotspots.map((h) => {
              const isCrit = h.severity === 'Critical';
              return (
                <div
                  key={h.id}
                  className="bg-[#140808] border border-severity-critical/30 rounded-xl p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">
                          {h.category || 'Emergency Cluster'}
                        </span>
                        <SeverityBadge severity={h.severity} size="sm" />
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        📍 Center: {h.centerLat.toFixed(4)}, {h.centerLng.toFixed(4)}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-severity-critical/20 text-severity-critical border border-severity-critical/40">
                      {h.reportCount} reports
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                    <span>Status: <strong className="uppercase text-gold font-mono">{h.status}</strong></span>
                    <span>{formatRelativeTime(h.updatedAt || h.createdAt)}</span>
                  </div>

                  {/* Hotspot Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {h.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleHotspotStatus(h.id, 'acknowledged')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold hover:text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleHotspotStatus(h.id, 'resolved')}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-severity-low hover:border-severity-low/40 border border-zinc-700 font-semibold text-xs transition-colors text-center"
                    >
                      Resolve Cluster
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {/* Reported Incidents */}
        <TiltCard className="bg-surface rounded-2xl border border-severity-medium/40 p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-severity-medium">Reported Triage</span>
            <div className="p-2 rounded-lg bg-severity-medium/15 text-severity-medium border border-severity-medium/30">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-severity-medium font-mono">{stats?.reported ?? 0}</span>
            <span className="text-xs text-zinc-400">reported</span>
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
              <h3 className="text-sm font-bold text-gold uppercase tracking-wider">
                Emergency Category Distribution
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Live Ingestion</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#71717A" 
                  fontSize={11} 
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#71717A" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(212, 175, 55, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: '#D4AF37',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px'
                  }}
                  formatter={(val, name, item) => [`${val} incidents`, item.payload.fullName]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((entry) => (
                    <Cell 
                      key={`cell-${entry.fullName}`} 
                      fill={CATEGORY_CHART_COLORS[entry.fullName] || '#D4AF37'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown Pie Chart */}
        <div className="lg:col-span-4 bg-surface rounded-2xl border border-gold/25 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-gold uppercase tracking-wider">
                Severity Ratio
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Algorithm Score</span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
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
                  {severityChartData.map((entry) => (
                    <Cell 
                      key={`sev-${entry.name}`} 
                      fill={SEVERITY_COLORS[entry.name] || '#D4AF37'} 
                    />
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

      {/* Main Dashboard Tab Switcher */}
      <div className="flex items-center bg-[#141414] border border-zinc-700 rounded-xl p-1 self-start w-full sm:w-auto">
        {[
          { id: 'incidents', label: 'Incidents & Map', icon: ListIcon },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'opsassist', label: 'Ops Assistant', icon: Radio }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setDashTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${
              dashTab === id ? 'bg-gold text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Analytics Tab ─────────────────────────────────────────────── */}
      {dashTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="bg-surface rounded-2xl border border-gold/20 p-12 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-zinc-400">Loading analytics data...</p>
            </div>
          ) : analytics ? (
            <>
              {/* KPI stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Avg Dispatch Time', value: analytics.avgDispatchMin != null ? `${analytics.avgDispatchMin.toFixed(1)} min` : 'N/A', sub: 'Time to first status change' },
                  { label: 'Avg Resolution Time', value: analytics.avgResolutionMin != null ? `${analytics.avgResolutionMin.toFixed(1)} min` : 'N/A', sub: 'Reported → Resolved' },
                  { label: 'AI Agreement Rate', value: analytics.aiAgreementRate != null ? `${Math.round(analytics.aiAgreementRate * 100)}%` : 'N/A', sub: 'AI vs rule engine match' },
                  { label: 'Active Hotspots', value: analytics.hotspotCounts?.active ?? 0, sub: `${analytics.hotspotCounts?.resolved ?? 0} resolved` }
                ].map((card) => (
                  <div key={card.label} className="bg-surface rounded-2xl border border-gold/20 p-5 space-y-1">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">{card.label}</span>
                    <p className="text-3xl font-extrabold text-gold font-mono">{card.value}</p>
                    <p className="text-[11px] text-zinc-500">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Hourly trend */}
              {analytics.hourly && analytics.hourly.length > 0 && (
                <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gold">Incidents per Hour (Last 24h)</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.hourly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#181818', borderColor: '#D4AF37', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Category x Severity Matrix */}
              {analytics.categoryMatrix && Object.keys(analytics.categoryMatrix).length > 0 && (
                <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gold">Category × Severity Distribution</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-2 pr-4 text-zinc-400 font-semibold">Category</th>
                          {['Low', 'Medium', 'High', 'Critical'].map(s => (
                            <th key={s} className="text-center py-2 px-3 text-zinc-400 font-semibold">{s}</th>
                          ))}
                          <th className="text-center py-2 px-3 text-zinc-400 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analytics.categoryMatrix).map(([cat, severities]) => {
                          const total = Object.values(severities).reduce((a, b) => a + b, 0);
                          return (
                            <tr key={cat} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                              <td className="py-2 pr-4 text-zinc-200 font-medium">{cat}</td>
                              {['Low', 'Medium', 'High', 'Critical'].map(s => (
                                <td key={s} className="text-center py-2 px-3">
                                  <span style={{ color: SEVERITY_COLORS[s] }} className="font-mono font-bold">
                                    {severities[s] || 0}
                                  </span>
                                </td>
                              ))}
                              <td className="text-center py-2 px-3 text-gold font-mono font-bold">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Export buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleExportCsv(false)}
                  disabled={csvExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-gold/40 text-gold hover:bg-gold/15 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {csvExporting ? 'Exporting...' : 'Export CSV (No PII)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCsv(true)}
                  disabled={csvExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-zinc-600 text-zinc-300 hover:border-gold/40 hover:text-gold text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Users className="w-3.5 h-3.5" />
                  Export CSV (Include Contact Data)
                </button>
              </div>
            </>
          ) : (
            <div className="bg-surface rounded-2xl border border-gold/20 p-8 text-center text-sm text-zinc-400">
              Analytics could not be loaded. Please try refreshing.
            </div>
          )}
        </div>
      )}

      {/* ── Ops Assistant Tab ─────────────────────────────────────────── */}
      {dashTab === 'opsassist' && (
        <div className="h-[600px]">
          <OpsAssistantPanel />
        </div>
      )}

      {/* ── Incidents Tab ─────────────────────────────────────────────── */}
      {dashTab === 'incidents' && (
      <>

      {/* Incident Filtering & Operations Section */}
      <div className="bg-surface rounded-2xl border border-gold/25 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gold">Incident Registry & Operations Queue</h2>
            <p className="text-xs text-zinc-400">Search keywords, filter parameters, or toggle between Live Map and Table View.</p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#141414] border border-zinc-700 rounded-xl p-1 self-start lg:self-auto">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'split' ? 'bg-gold text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Split View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map' ? 'bg-gold text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Live Map</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-gold text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-gold absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, title, location..."
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
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortBy(sortBy === 'severity' ? 'newest' : 'severity')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold/40 bg-gold/10 text-gold text-xs font-semibold hover:bg-gold/20 transition-colors ml-auto"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort: {sortBy === 'severity' ? 'Severity (Critical First)' : 'Newest'}</span>
          </button>
        </div>

        {/* Live Leaflet Map View (Shown in 'map' or 'split' view) */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-gold flex items-center gap-1.5">
                <MapIcon className="w-4 h-4 text-gold" />
                Live Incident & Hotspot Geospatial Map
              </span>
              <span>Showing {incidents.filter(i => i.latitude && i.longitude).length} mapped incidents</span>
            </div>
            <IncidentMap
              incidents={incidents}
              hotspots={activeHotspots}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              height={viewMode === 'map' ? '540px' : '380px'}
            />
          </div>
        )}

        {/* Queue Table (Shown in 'table' or 'split' view) */}
        {(viewMode === 'table' || viewMode === 'split') && (
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
                    const effectiveSev = inc.severityOverride || inc.finalSeverity || inc.severity;
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
                            {inc.priorityLabel && <span title={`Priority score ${Number(inc.priorityScore || 0).toFixed(1)}`} className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200">P: {inc.priorityLabel}</span>}
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
        )}
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

      </> /* end dashTab === 'incidents' */
      )}
    </div>
  );
}
