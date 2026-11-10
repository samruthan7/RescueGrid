import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import EmergencyBanner from './components/EmergencyBanner';

import LandingPage from './pages/LandingPage';
import CitizenReportPage from './pages/CitizenReportPage';
import ReportSuccessPage from './pages/ReportSuccessPage';
import TrackIncidentPage from './pages/TrackIncidentPage';
import CitizenLoginPage from './pages/CitizenLoginPage';
import CitizenMyReportsPage from './pages/CitizenMyReportsPage';
import AuthorityLoginPage from './pages/AuthorityLoginPage';
import AuthorityDashboardPage from './pages/AuthorityDashboardPage';
import { authService } from './services/api';
import { CitizenAuthProvider, useCitizenAuth } from './context/CitizenAuthContext';
import AssistantChat from './components/AssistantChat';

// Route Guard for Protected Authority Portal
function ProtectedAuthorityRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/authority/login" replace />;
  }
  return children;
}

// Route Guard for Protected Citizen Operations (Reporting & Personal Reports)
function CitizenProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useCitizenAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/citizen/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return children;
}

function AppContent() {
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
          <Route path="/citizen/login" element={<CitizenLoginPage />} />
          <Route path="/track" element={<TrackIncidentPage />} />
          <Route path="/report/success/:id" element={<ReportSuccessPage />} />
          <Route path="/authority/login" element={<AuthorityLoginPage />} />

          {/* Protected Citizen Routes */}
          <Route
            path="/report"
            element={
              <CitizenProtectedRoute>
                <CitizenReportPage />
              </CitizenProtectedRoute>
            }
          />
          <Route
            path="/citizen/reports"
            element={
              <CitizenProtectedRoute>
                <CitizenMyReportsPage />
              </CitizenProtectedRoute>
            }
          />
          <Route
            path="/citizen/my-reports"
            element={<Navigate to="/citizen/reports" replace />}
          />

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

      {/* Citizen AI Assistant (floating, only shown when authenticated) */}
      <AssistantChat />
    </div>
  );
}

export default function App() {
  return (
    <CitizenAuthProvider>
      <AppContent />
    </CitizenAuthProvider>
  );
}
