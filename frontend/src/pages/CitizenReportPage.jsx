import React, { useState, useRef } from 'react';
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
  Loader2,
  Video,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { incidentApi } from '../services/api';
import IncidentMap from '../components/IncidentMap';
import { useCitizenAuth } from '../context/CitizenAuthContext';

const CATEGORIES = [
  { id: 'Fire Emergency', label: 'Fire Emergency', icon: Flame, desc: 'Structure fires, wildfires, smoke' },
  { id: 'Road Accident', label: 'Road Accident', icon: Car, desc: 'Vehicle collisions, pileups' },
  { id: 'Medical Emergency', label: 'Medical Emergency', icon: Stethoscope, desc: 'Cardiac arrest, trauma, vital danger' },
  { id: 'Flood', label: 'Flood', icon: Waves, desc: 'Rising rivers, flash flooding, surges' },
  { id: 'Building Collapse', label: 'Building Collapse', icon: Building2, desc: 'Structural failure, debris, cave-in' },
  { id: 'Other Emergencies', label: 'Other Emergencies', icon: HelpCircle, desc: 'Gas leaks, chemical spills, power grid' },
];

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export default function CitizenReportPage() {
  const navigate = useNavigate();
  const { citizen } = useCitizenAuth();
  const videoInputRef = useRef(null);

  // ─── Form Fields ──────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [peopleAffected, setPeopleAffected] = useState(0);

  // Optional Contact – defaults to verified citizen profile
  const [contactName, setContactName] = useState(citizen?.name || '');
  const [contactPhone, setContactPhone] = useState(citizen?.phone || '');
  const [contactEmail, setContactEmail] = useState('');

  // Contextual Risk Questions
  const [peopleTrapped, setPeopleTrapped] = useState('Unknown');
  const [immediateDanger, setImmediateDanger] = useState('Unknown');
  const [injuries, setInjuries] = useState('Unknown');

  // ─── UI States ─────────────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [geoMessage, setGeoMessage] = useState('');

  // ─── Two-step flow state ───────────────────────────────────────
  const [step, setStep] = useState(1); // 1 = form, 2 = video upload
  const [draftId, setDraftId] = useState(null);

  // ─── Video Upload State ───────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  // ─── Geolocation Handler ──────────────────────────────────────
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
        if (!location) setLocation(`GPS Coordinates [${lat}, ${lon}]`);
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

  const handleMapSelect = ({ lat, lng }) => {
    setLatitude(lat);
    setLongitude(lng);
    setGeoStatus('success');
    setGeoMessage(`Coordinates selected on map: ${lat}, ${lng}`);
    if (!location) setLocation(`Location Pin [${lat}, ${lng}]`);
  };

  // ─── Client-Side Form Validation ─────────────────────────────
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

  // ─── Step 1: Submit Form Details → Create Draft ──────────────
  const handleSubmitDetails = async (e) => {
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
        setDraftId(response.incident.id);
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Incident submission error:', err);
      if (err.response?.data?.errors) {
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

  // ─── Video File Validation ────────────────────────────────────
  const validateVideoFile = (file) => {
    if (!file) return 'Please select a video file.';
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_VIDEO_SIZE_MB} MB.`;
    }
    // Check by MIME type (browser-reported)
    const isValidType = ALLOWED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/');
    if (!isValidType) {
      return `Unsupported file type: "${file.type}". Please upload an MP4, WebM, or QuickTime video.`;
    }
    return null;
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear previous state
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoError('');
    setUploadProgress(0);
    setUploadDone(false);

    const err = validateVideoFile(file);
    if (err) {
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoError(err);
      return;
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoError('');
    setUploadProgress(0);
    setUploadDone(false);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // ─── Step 2: Upload Video → Activate Incident ────────────────
  const handleVideoUpload = async () => {
    if (!videoFile || !draftId || isUploading) return;

    const err = validateVideoFile(videoFile);
    if (err) {
      setVideoError(err);
      return;
    }

    setIsUploading(true);
    setVideoError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);

      await api.post(`/incidents/${draftId}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(pct);
        }
      });

      setUploadDone(true);
      setTimeout(() => {
        navigate(`/report/success/${draftId}`);
      }, 800);
    } catch (err) {
      console.error('Video upload error:', err);
      setVideoError(
        err.response?.data?.error || 'Video upload failed. Please try again or use a different file.'
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // ─── STEP 2 RENDER: Video Upload ─────────────────────────────
  if (step === 2) {
    const canUpload = videoFile && !videoError && !isUploading && !uploadDone;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Success banner for step 1 */}
        <div className="bg-severity-low/10 border border-severity-low/40 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-severity-low/20 flex items-center justify-center shrink-0 text-severity-low">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-severity-low">Report Details Saved</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Draft incident created —{' '}
              <span className="font-mono text-gold">{draftId}</span>
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Your report will be activated and queued for authority review after you upload the incident video.
            </p>
          </div>
        </div>

        {/* Safety Warning */}
        <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-amber-300">
            ⚠️ Only record if it is safe to do so. Do not put yourself in danger.
          </p>
        </div>

        {/* Video Upload Section */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gold flex items-center gap-2">
              <Video className="w-5 h-5" />
              Upload Incident Video <span className="text-severity-critical">*</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Required to activate your report. Max {MAX_VIDEO_SIZE_MB} MB. Formats: MP4, WebM, QuickTime.
            </p>
          </div>

          {/* File picker */}
          {!videoFile ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gold/30 rounded-xl p-8 cursor-pointer hover:border-gold/60 hover:bg-gold/5 transition-all group">
              <Upload className="w-10 h-10 text-gold/50 group-hover:text-gold/80 mb-3 transition-colors" />
              <span className="text-sm font-semibold text-zinc-300 group-hover:text-white">
                Click to select video
              </span>
              <span className="text-xs text-zinc-500 mt-1">or drag & drop</span>
              <span className="text-[11px] text-zinc-600 mt-2">MP4, WebM, MOV — max {MAX_VIDEO_SIZE_MB} MB</span>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              {/* Video preview */}
              <div className="relative rounded-xl overflow-hidden border border-gold/30 bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-64 object-contain"
                  preload="metadata"
                />
              </div>

              {/* File info */}
              <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#181818] rounded-lg px-3 py-2 border border-zinc-800">
                <span className="truncate max-w-[200px] font-mono">{videoFile.name}</span>
                <span>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  disabled={isUploading}
                  className="ml-3 p-1 rounded text-zinc-500 hover:text-severity-critical hover:bg-severity-critical/10 transition-colors disabled:opacity-30"
                  title="Remove video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {videoError && (
            <div className="p-3 rounded-lg bg-severity-critical/10 border border-severity-critical/30 text-severity-critical text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{videoError}</span>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Uploading video...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Done */}
          {uploadDone && (
            <div className="p-3 rounded-lg bg-severity-low/10 border border-severity-low/30 text-severity-low text-sm flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Video uploaded! Redirecting to your report...
            </div>
          )}

          {/* Upload Button */}
          <button
            type="button"
            onClick={handleVideoUpload}
            disabled={!canUpload}
            className="w-full px-6 py-4 rounded-xl bg-gold text-black font-extrabold text-sm uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Uploading {uploadProgress}%...</span>
              </>
            ) : uploadDone ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Upload Complete</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Video & Activate Report</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-zinc-500 text-center">
            Your video is stored securely and only accessible to verified emergency authorities.
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP 1 RENDER: Incident Details Form ────────────────────
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

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center text-xs font-bold">1</div>
          <span className="text-xs font-semibold text-gold">Incident Details</span>
        </div>
        <div className="h-px flex-1 bg-zinc-700" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-zinc-600 text-zinc-500 flex items-center justify-center text-xs font-bold">2</div>
          <span className="text-xs text-zinc-500">Video Evidence</span>
        </div>
      </div>

      {errors.form && (
        <div className="mb-6 p-4 rounded-xl bg-severity-critical/15 border border-severity-critical/40 text-severity-critical text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmitDetails} className="space-y-8">
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

          {/* Interactive Leaflet Map Coordinate Picker */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Or Click/Drag Pin on Map:</span>
              <span>{latitude && longitude ? `Lat: ${latitude}, Lng: ${longitude}` : 'No coordinate set'}</span>
            </div>
            <IncidentMap
              isPicker={true}
              pickerLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
              onLocationSelect={handleMapSelect}
              center={latitude && longitude ? [latitude, longitude] : [13.6288, 79.4192]}
              height="280px"
            />
          </div>
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
                placeholder="+91-98490-12345"
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
            <br />
            <span className="text-zinc-500">Step 2 will require you to upload a video of the incident.</span>
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[220px] px-8 py-4 rounded-xl bg-gold text-black font-extrabold text-sm uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Saving Report Details...</span>
              </>
            ) : (
              <span>Continue to Video Upload →</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
