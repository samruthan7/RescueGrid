import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  MapPin, 
  Navigation, 
  Users, 
  Flame, 
  Car, 
  Stethoscope, 
  Waves, 
  Building2, 
  HelpCircle, 
  Check, 
  Info, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { incidentApi } from '../services/api';

const CATEGORIES = [
  { id: 'Fire Emergency', label: 'Fire Emergency', icon: Flame, desc: 'Structure fires, wildfires, smoke' },
  { id: 'Road Accident', label: 'Road Accident', icon: Car, desc: 'Vehicle collisions, pileups' },
  { id: 'Medical Emergency', label: 'Medical Emergency', icon: Stethoscope, desc: 'Cardiac arrest, trauma, vital danger' },
  { id: 'Flood', label: 'Flood', icon: Waves, desc: 'Rising rivers, flash flooding, surges' },
  { id: 'Building Collapse', label: 'Building Collapse', icon: Building2, desc: 'Structural failure, debris, cave-in' },
  { id: 'Other Emergencies', label: 'Other Emergencies', icon: HelpCircle, desc: 'Gas leaks, chemical spills, power grid' },
];

export default function CitizenReportPage() {
  const navigate = useNavigate();

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [peopleAffected, setPeopleAffected] = useState(0);

  // Optional Contact
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Contextual Risk Questions
  const [peopleTrapped, setPeopleTrapped] = useState('Unknown');
  const [immediateDanger, setImmediateDanger] = useState('Unknown');
  const [injuries, setInjuries] = useState('Unknown');

  // UI States
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null); // 'loading', 'success', 'error'
  const [geoMessage, setGeoMessage] = useState('');

  // Geolocation Handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoMessage('Geolocation is not supported by your browser.');
      return;
    }

    setGeoStatus('loading');
    setGeoMessage('Acquiring high-accuracy GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lon = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lon);
        setGeoStatus('success');
        setGeoMessage(`Coordinates locked: ${lat}, ${lon}`);

        // If location description is empty, populate a hint
        if (!location) {
          setLocation(`GPS Coordinates [${lat}, ${lon}]`);
        }
      },
      (err) => {
        setGeoStatus('error');
        if (err.code === 1) {
          setGeoMessage('Location permission was denied. Please enter your street address or landmark manually.');
        } else {
          setGeoMessage('Unable to retrieve location. Please enter your landmark manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Client-Side Validation
  const validate = () => {
    const errs = {};
    if (!title.trim() || title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters long.';
    }
    if (!description.trim() || description.trim().length < 20) {
      errs.description = `Description must be at least 20 characters (current: ${description.trim().length}).`;
    }
    if (!category) {
      errs.category = 'Please select an emergency category.';
    }
    if (!location.trim() || location.trim().length < 3) {
      errs.location = 'Please specify the location or landmark.';
    }
    const affected = Number(peopleAffected);
    if (isNaN(affected) || affected < 0 || affected > 10000) {
      errs.peopleAffected = 'Please specify a valid number between 0 and 10,000.';
    }
    if (contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        errs.contactEmail = 'Invalid email format.';
      }
    }
    if (contactPhone.trim()) {
      const phoneRegex = /^[0-9+\-()#\s.]{7,20}$/;
      if (!phoneRegex.test(contactPhone.trim())) {
        errs.contactPhone = 'Please enter a valid phone number (min 7 digits).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        latitude,
        longitude,
        peopleAffected: Number(peopleAffected),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        peopleTrapped,
        immediateDanger,
        injuries
      };

      const response = await incidentApi.submitIncident(payload);
      if (response && response.incident) {
        navigate(`/report/success/${response.incident.id}`, {
          state: { incident: response.incident }
        });
      }
    } catch (err) {
      console.error('Incident submission error:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({
          form: err.response?.data?.error || 'Failed to submit report. Please check your network and try again.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Guidance */}
      <div className="mb-8 space-y-2 text-center sm:text-left">
        <span className="text-xs uppercase tracking-wider text-gold font-bold">Public Emergency Dispatch</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gold tracking-tight">Report an Emergency Incident</h1>
        <p className="text-sm text-zinc-300">
          Submit immediate facts regarding the incident. 
          Our autonomous system will classify severity and queue the report for monitoring authorities.
        </p>
      </div>

      {errors.form && (
        <div className="mb-6 p-4 rounded-xl bg-severity-critical/15 border border-severity-critical/40 text-severity-critical text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Emergency Category Selector */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gold">1. Select Emergency Category *</h2>
            {errors.category && <span className="text-xs text-severity-critical font-medium">{errors.category}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    if (errors.category) setErrors({ ...errors, category: null });
                  }}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-gold bg-gold/15 text-white shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                      : 'border-zinc-800 bg-[#181818] text-zinc-300 hover:border-gold/40 hover:bg-[#202020]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-gold text-black' : 'bg-gold/10 text-gold'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-gold text-black flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gold">{cat.label}</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Primary Incident Details */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gold">2. Incident Details *</h2>

          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="title" className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                Incident Title *
              </label>
              <span className="text-xs text-zinc-400">Min 5 chars</span>
            </div>
            <input
              id="title"
              type="text"
              placeholder="e.g. 3-car collision blocking downtown freeway"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-[#181818] border rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                errors.title ? 'border-severity-critical' : 'border-zinc-700 focus:border-gold'
              }`}
            />
            {errors.title && <p className="text-xs text-severity-critical">{errors.title}</p>}
          </div>

          {/* Description & Character Counter */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="description" className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                Incident Description *
              </label>
              <span className={`text-xs ${description.length < 20 ? 'text-severity-critical' : 'text-zinc-400'}`}>
                {description.length} / 2500 chars (min 20)
              </span>
            </div>
            <textarea
              id="description"
              rows={4}
              placeholder="Provide specific details: visual observations, smoke direction, severity of damage, emergency services already on scene, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-[#181818] border rounded-xl p-4 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                errors.description ? 'border-severity-critical' : 'border-zinc-700 focus:border-gold'
              }`}
            />
            {errors.description && <p className="text-xs text-severity-critical">{errors.description}</p>}
          </div>

          {/* People Affected */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="peopleAffected" className="text-xs uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gold" />
                Number of People Affected *
              </label>
              <span className="text-xs text-zinc-400">0 to 10,000</span>
            </div>
            <input
              id="peopleAffected"
              type="number"
              min={0}
              max={10000}
              value={peopleAffected}
              onChange={(e) => setPeopleAffected(e.target.value)}
              className={`w-full bg-[#181818] border rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                errors.peopleAffected ? 'border-severity-critical' : 'border-zinc-700 focus:border-gold'
              }`}
            />
            {errors.peopleAffected && <p className="text-xs text-severity-critical">{errors.peopleAffected}</p>}
          </div>
        </div>

        {/* Step 3: Location & Geolocation */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gold">3. Location & Geolocation *</h2>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={geoStatus === 'loading'}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gold/40 bg-gold/10 text-gold text-xs font-semibold hover:bg-gold/20 transition-all self-start sm:self-auto disabled:opacity-50"
            >
              {geoStatus === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>{geoStatus === 'loading' ? 'Detecting Location...' : 'Use my current location'}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
              Address / Landmark / Cross Streets *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gold absolute left-4 top-3.5" />
              <input
                id="location"
                type="text"
                placeholder="e.g. 450 Market St, intersection with 5th Avenue"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`w-full bg-[#181818] border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                  errors.location ? 'border-severity-critical' : 'border-zinc-700 focus:border-gold'
                }`}
              />
            </div>
            {errors.location && <p className="text-xs text-severity-critical">{errors.location}</p>}
          </div>

          {/* Geolocation feedback */}
          {geoMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                geoStatus === 'success'
                  ? 'bg-severity-low/15 border border-severity-low/30 text-severity-low'
                  : geoStatus === 'loading'
                  ? 'bg-gold/10 border border-gold/30 text-gold'
                  : 'bg-severity-critical/15 border border-severity-critical/30 text-severity-critical'
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>{geoMessage}</span>
            </div>
          )}
        </div>

        {/* Step 4: Contextual Threat Assessment Questions */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gold">4. Threat Severity Factors</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Labelled <em>"unverified, as reported by you"</em>. Helps algorithmic classification prioritize immediate rescue squads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Are people trapped? */}
            <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 space-y-2">
              <label className="text-xs text-zinc-300 font-semibold block">Are people trapped?</label>
              <div className="grid grid-cols-3 gap-2">
                {['Yes', 'No', 'Unknown'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPeopleTrapped(val)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      peopleTrapped === val
                        ? val === 'Yes'
                          ? 'bg-severity-critical/20 text-severity-critical border-severity-critical'
                          : 'bg-gold text-black border-gold'
                        : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Is anyone in immediate danger? */}
            <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 space-y-2">
              <label className="text-xs text-zinc-300 font-semibold block">Immediate danger to life?</label>
              <div className="grid grid-cols-3 gap-2">
                {['Yes', 'No', 'Unknown'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setImmediateDanger(val)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      immediateDanger === val
                        ? val === 'Yes'
                          ? 'bg-severity-critical/20 text-severity-critical border-severity-critical'
                          : 'bg-gold text-black border-gold'
                        : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Are there injuries? */}
            <div className="bg-[#181818] p-4 rounded-xl border border-zinc-800 space-y-2">
              <label className="text-xs text-zinc-300 font-semibold block">Are there injuries?</label>
              <div className="grid grid-cols-2 gap-2">
                {['None', 'Minor', 'Serious', 'Unknown'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setInjuries(val)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      injuries === val
                        ? val === 'Serious'
                          ? 'bg-severity-critical/20 text-severity-critical border-severity-critical'
                          : val === 'Minor'
                          ? 'bg-severity-medium/20 text-severity-medium border-severity-medium'
                          : 'bg-gold text-black border-gold'
                        : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Optional Contact Information */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gold">5. Contact Information (Optional)</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Optional. Visible strictly to verified authorities for follow-up verification. Never published publicly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="contactName" className="text-xs text-zinc-300 block">Full Name</label>
              <input
                id="contactName"
                type="text"
                placeholder="Jane Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-[#181818] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-gold"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contactPhone" className="text-xs text-zinc-300 block">Phone Number</label>
              <input
                id="contactPhone"
                type="tel"
                placeholder="+1-555-0199"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={`w-full bg-[#181818] border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none ${
                  errors.contactPhone ? 'border-severity-critical' : 'border-zinc-700 focus:border-gold'
                }`}
              />
              {errors.contactPhone && <p className="text-xs text-severity-critical">{errors.contactPhone}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="contactEmail" className="text-xs text-zinc-300 block">Email Address</label>
              <input
                id="contactEmail"
                type="email"
                placeholder="citizen@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={`w-full bg-[#181818] border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none ${
                  errors.contactEmail ? 'border-severity-critical' : 'border-zinc-700 focus:border-gold'
                }`}
              />
              {errors.contactEmail && <p className="text-xs text-severity-critical">{errors.contactEmail}</p>}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-400 text-center sm:text-left">
            By submitting, you certify that the information provided represents genuine on-scene observations.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[220px] px-8 py-4 rounded-xl bg-gold text-black font-extrabold text-sm uppercase tracking-wider hover:bg-gold-light transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Classifying & Submitting...</span>
              </>
            ) : (
              <span>Submit Emergency Report</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
