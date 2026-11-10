import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, Key, ArrowRight, Loader2, Info } from 'lucide-react';
import { incidentApi, authService } from '../services/api';

export default function AuthorityLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = new URLSearchParams(location.search);
  const sessionExpired = searchParams.get('sessionExpired');

  const handlePreFill = () => {
    setUsername('admin');
    setPassword('rescuegrid2026!');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await incidentApi.login(username, password);
      authService.setAuth(data.token, data.user);
      navigate('/authority');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Invalid credentials. Please click "Quick Fill Demo Credentials".'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-surface rounded-2xl border border-gold/30 p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold mx-auto shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            <Shield className="w-7 h-7" />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-gold font-bold">Authorized Operations</span>
          <h1 className="text-2xl font-bold text-gold tracking-tight">Authority Portal Login</h1>
          <p className="text-xs text-zinc-400">
            Emergency Command & Operations Center evaluation portal.
          </p>
        </div>

        {/* Demo Notice Disclaimer */}
        <div className="p-3.5 rounded-xl bg-gold/10 border border-gold/25 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 text-gold font-semibold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Hackathon Evaluation Environment</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            This demo utilizes JWT tokens against configured environment credentials. It does not claim to replace production multi-factor civil defense authentication.
          </p>
          <button
            type="button"
            onClick={handlePreFill}
            className="w-full py-1.5 px-3 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Quick Fill Demo Credentials (admin / rescuegrid2026!)</span>
          </button>
        </div>

        {sessionExpired && (
          <div className="p-3 rounded-lg bg-severity-medium/15 border border-severity-medium/40 text-severity-medium text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Your session has expired. Please log in again to continue.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-severity-critical/15 border border-severity-critical/40 text-severity-critical text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-zinc-300 font-semibold block">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-gold absolute left-3.5 top-3" />
              <input
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#181818] border border-zinc-700 focus:border-gold rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-zinc-300 font-semibold block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gold absolute left-3.5 top-3" />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#181818] border border-zinc-700 focus:border-gold rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gold text-black font-extrabold text-xs uppercase tracking-wider hover:bg-gold-light transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 pt-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <ArrowRight className="w-4 h-4 text-black" />
            )}
            <span>{loading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/" className="text-xs text-zinc-400 hover:text-gold transition-colors">
            &larr; Return to Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
