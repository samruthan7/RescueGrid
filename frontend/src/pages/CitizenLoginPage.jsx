import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, User, Phone, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext';

export default function CitizenLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useCitizenAuth();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/report';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (!cleanPhone) {
      setError('Please enter your 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanName, cleanPhone);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Citizen login error:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to log in. Please check your phone number and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/40 mx-auto flex items-center justify-center text-gold shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            <Shield className="w-7 h-7" />
          </div>
          <span className="text-xs uppercase tracking-widest text-gold font-bold">Verified Citizen Access</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gold tracking-tight">
            Citizen Emergency Portal
          </h1>
          <p className="text-xs text-zinc-300 max-w-xs mx-auto">
            Log in with your name & mobile number to report emergencies and track live response dispatch.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-severity-critical/15 border border-severity-critical/40 text-severity-critical text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-surface rounded-2xl border border-gold/20 p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs uppercase tracking-wider text-zinc-300 font-semibold block">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gold absolute left-3.5 top-3.5" />
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="e.g. Venkat Raman"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#181818] border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>

            {/* Indian Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs uppercase tracking-wider text-zinc-300 font-semibold block">
                Mobile Number (India) *
              </label>
              <div className="relative flex rounded-xl border border-zinc-700 focus-within:border-gold transition-colors overflow-hidden">
                <span className="inline-flex items-center px-3.5 bg-[#121212] border-r border-zinc-700 text-gold font-mono text-xs font-bold select-none">
                  🇮🇳 +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="9849012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#181818] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                10-digit Indian mobile. Auto-normalizes to E.164 (+91...).
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gold text-black font-extrabold text-sm uppercase tracking-wider hover:bg-gold-light transition-all shadow-[0_0_16px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Verifying Citizen Session...</span>
                </>
              ) : (
                <>
                  <span>Continue to Emergency Dispatch</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Notice */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-start gap-2 text-[11px] text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
              <span>Zero passwords to remember. Instant access with your mobile identity.</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
              <span>Full privacy: Your contact details are never exposed on public maps.</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link to="/" className="text-xs text-zinc-400 hover:text-gold transition-colors">
            ← Return to RescueGrid Home
          </Link>
        </div>
      </div>
    </div>
  );
}
