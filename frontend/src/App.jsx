import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import EmergencyBanner from './components/EmergencyBanner';

import LandingPage from './pages/LandingPage';
import CitizenReportPage from './pages/CitizenReportPage';
import ReportSuccessPage from './pages/ReportSuccessPage';
import TrackIncidentPage from './pages/TrackIncidentPage';
import AuthorityLoginPage from './pages/AuthorityLoginPage';
import AuthorityDashboardPage from './pages/AuthorityDashboardPage';
import { authService } from './services/api';

// Route Guard for Protected Authority Portal
function ProtectedAuthorityRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/authority/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans selection:bg-gold selection:text-black">
      {/* Persistent Life Safety Banner */}
      <EmergencyBanner />

      {/* Main App Navigation */}
      <Navbar />

      {/* Primary Viewport */}
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<CitizenReportPage />} />
          <Route path="/report/success/:id" element={<ReportSuccessPage />} />
          <Route path="/track" element={<TrackIncidentPage />} />
          <Route path="/authority/login" element={<AuthorityLoginPage />} />

          {/* Protected Authority Routes */}
          <Route
            path="/authority"
            element={
              <ProtectedAuthorityRoute>
                <AuthorityDashboardPage />
              </ProtectedAuthorityRoute>
            }
          />
          <Route
            path="/authority/incidents/:id"
            element={
              <ProtectedAuthorityRoute>
                <AuthorityDashboardPage />
              </ProtectedAuthorityRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
