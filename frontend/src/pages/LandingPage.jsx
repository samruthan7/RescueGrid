import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, 
  Shield, 
  Activity, 
  PhoneCall, 
  ArrowRight, 
  Clock, 
  Layers, 
  Eye, 
  FileText, 
  Flame, 
  Car, 
  Stethoscope, 
  Waves, 
  Building2, 
  HelpCircle 
} from 'lucide-react';
import HeroGlobe3D from '../components/HeroGlobe3D';
import TiltCard from '../components/TiltCard';
import IncidentMap from '../components/IncidentMap';
import { incidentApi } from '../services/api';

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [publicIncidents, setPublicIncidents] = useState([]);

  useEffect(() => {
    // Quick load of public overview numbers if available
    incidentApi.getStats()
      .then(data => setStats(data))
      .catch(() => {});

    // Fetch privacy-safe public map coordinates
    incidentApi.getPublicMap()
      .then(data => setPublicIncidents(data || []))
      .catch(err => console.warn('Public map fetch warning:', err.message));
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 sm:pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Headline & Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-semibold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-gold animate-ping"></span>
                Emergency Incident Reporting & Monitoring Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gold tracking-tight leading-[1.1]">
                Decisive Coordination <br />
                <span className="text-white">When Seconds Count.</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                RescueGrid bridges citizens and disaster response authorities in real time. 
                Report localized crises, receive instant automated severity classification, 
                and empower incident commanders with unified situational awareness.
              </p>

              {/* Action Buttons beside 3D Hero */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/report"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gold text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:bg-gold-light hover:shadow-[0_0_28px_rgba(212,175,55,0.6)] transition-all transform hover:-translate-y-0.5"
                >
                  <AlertCircle className="w-5 h-5 text-black" />
                  <span>Report an Emergency</span>
                </Link>

                <Link
                  to="/authority"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl border border-gold/40 bg-surface text-white font-semibold text-sm hover:border-gold hover:bg-gold/10 transition-all transform hover:-translate-y-0.5"
                >
                  <Shield className="w-5 h-5 text-gold" />
                  <span>Authority Dashboard</span>
                </Link>
              </div>

              {/* Quick stats mini-bar */}
              <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-severity-low"></span>
                  <span>Autonomous Severity Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  <span>Zero Database Lock-in</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-severity-critical"></span>
                  <span>Audit-Trail Incident Tracking</span>
                </div>
              </div>
            </div>

            {/* Right: 3D Wireframe Globe */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <HeroGlobe3D />
            </div>
          </div>
        </div>
      </section>

      {/* Public Live Incident Map Section (Privacy-Safe ~110m Fuzzed Coordinates) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-2xl border border-gold/30 p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-severity-critical animate-ping"></span>
                <span className="text-xs uppercase tracking-wider text-gold font-bold">Public Situational Awareness</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gold tracking-tight mt-1">
                Live Emergency Incident Map
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time privacy-safe incident distribution across Tirupati & regional emergency response sectors.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-xs text-zinc-400 bg-black/60 px-3 py-1.5 rounded-xl border border-zinc-800 font-mono">
                <strong className="text-gold">{publicIncidents.length}</strong> active mapped coordinates
              </span>
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold text-black text-xs font-bold uppercase tracking-wider hover:bg-gold-light transition-colors"
              >
                <span>Report Now</span>
              </Link>
            </div>
          </div>

          <IncidentMap
            incidents={publicIncidents}
            height="440px"
          />

          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="text-[11px] text-zinc-500">
              * Privacy safeguard active: Geographic coordinates are fuzzed to ~110m resolution. Personal identities and addresses are strictly concealed.
            </span>
            <Link to="/track" className="text-gold hover:underline text-xs">
              Track specific reference number →
            </Link>
          </div>
        </div>
      </section>

      {/* Two Large Portal Choice Cards (with 3D Tilt Effect) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gold tracking-tight">Select Operation Portal</h2>
          <p className="text-sm text-zinc-400 mt-1">Direct access for citizens on the ground or emergency operations officers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Citizen Card */}
          <TiltCard className="rounded-2xl border border-gold/25 bg-surface p-8 relative overflow-hidden group hover:border-gold transition-colors">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle className="w-32 h-32 text-gold" />
            </div>

            <div className="relative z-10 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-gold font-bold">Public Citizen Portal</span>
                <h3 className="text-2xl font-bold text-gold mt-1">Report an Emergency</h3>
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  Log accidents, building collapses, fires, floods, or medical incidents. 
                  Provide geolocation and risk assessment indicators to receive an instant transparent severity rating.
                </p>
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gold"></div>
                  <span>Instant GPS / Geolocation capture</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gold"></div>
                  <span>Real-time rule-based severity calculation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gold"></div>
                  <span>Anonymous or identified contact logging</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/report"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold text-black font-bold text-xs uppercase tracking-wider hover:bg-gold-light transition-colors shadow-md"
                >
                  <span>Submit Incident Report</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </TiltCard>

          {/* Authority Dashboard Card */}
          <TiltCard className="rounded-2xl border border-gold/25 bg-surface p-8 relative overflow-hidden group hover:border-gold transition-colors">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Shield className="w-32 h-32 text-gold" />
            </div>

            <div className="relative z-10 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                <Shield className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-gold font-bold">Command & Triage Center</span>
                <h3 className="text-2xl font-bold text-gold mt-1">Authority Dashboard</h3>
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  Centralized command interface for authorized response directors. 
                  Monitor incoming incidents, filter by threat severity, manage dispatch status, and override classifications.
                </p>
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gold"></div>
                  <span>Prioritized sorting for Critical incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gold"></div>
                  <span>Interactive charts and real-time auto-refresh</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gold"></div>
                  <span>Full status audit trail & severity overrides</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/authority"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gold text-gold font-bold text-xs uppercase tracking-wider hover:bg-gold/10 transition-colors shadow-md"
                >
                  <span>Open Authority Center</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* Emergency Categories Supported */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-surface/60 border border-gold/15 p-6 sm:p-8">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-lg font-bold text-gold">Universal Crisis Response Categories</h3>
            <p className="text-xs text-zinc-400 mt-1">RescueGrid systematically scores risk factors across six primary disaster domains.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Flame, name: 'Fire Emergency', desc: 'Structure & wild fires' },
              { icon: Car, name: 'Road Accident', desc: 'Collisions & pileups' },
              { icon: Stethoscope, name: 'Medical Emergency', desc: 'Cardiac, trauma & vitals' },
              { icon: Waves, name: 'Flood', desc: 'Surges & rising waters' },
              { icon: Building2, name: 'Building Collapse', desc: 'Structural failure & debris' },
              { icon: HelpCircle, name: 'Other Emergencies', desc: 'Gas leaks, hazards & spills' },
            ].map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="bg-black/40 border border-zinc-800 rounded-xl p-4 text-center space-y-2 hover:border-gold/40 transition-colors">
                  <div className="w-9 h-9 mx-auto rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gold">{cat.name}</h4>
                  <p className="text-[11px] text-zinc-400">{cat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
