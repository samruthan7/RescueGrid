import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertCircle, Search, LayoutDashboard, LogOut, Lock } from 'lucide-react';
import { authService } from '../services/api';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/authority/login');
  };

  const isLinkActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-gold/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/40 flex items-center justify-center text-gold group-hover:border-gold transition-colors shadow-[0_0_10px_rgba(212,175,55,0.2)]">
            <Shield className="w-5 h-5 text-gold" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-gold block leading-tight">RescueGrid</span>
            <span className="text-[10px] text-zinc-400 tracking-wider uppercase block">Emergency Operations</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/report"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isLinkActive('/report')
                ? 'bg-gold text-black font-semibold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                : 'text-white hover:text-gold hover:bg-surface-subtle'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Report Emergency</span>
            <span className="sm:hidden">Report</span>
          </Link>

          <Link
            to="/track"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isLinkActive('/track')
                ? 'bg-gold/20 text-gold border border-gold/40'
                : 'text-white hover:text-gold hover:bg-surface-subtle'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Track Incident</span>
            <span className="sm:hidden">Track</span>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-800">
              <Link
                to="/authority"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isLinkActive('/authority') && !isLinkActive('/authority/login')
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'text-white hover:text-gold hover:bg-surface-subtle'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-gold" />
                <span className="hidden md:inline">Authority Dashboard</span>
                <span className="md:hidden">Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out of Authority Session"
                className="p-1.5 rounded-md text-zinc-400 hover:text-severity-critical hover:bg-surface-subtle transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/authority/login"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ml-1 transition-all ${
                isLinkActive('/authority/login')
                  ? 'border border-gold text-gold bg-gold/10'
                  : 'text-zinc-300 hover:text-gold hover:bg-surface-subtle'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Authority Login</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
