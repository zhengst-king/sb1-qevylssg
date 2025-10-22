// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { SearchPage } from './components/SearchPage';
import { MovieWatchlistPage } from './components/MovieWatchlistPage';
import { TVSeriesWatchlistPage } from './components/TVSeriesWatchlistPage';
import { MyCollectionsPage } from './components/MyCollectionsPage';
import { SettingsPage } from './components/SettingsPage';
import { SmartRecommendationsContainer } from './components/SmartRecommendationsContainer';
import { MyStarsPage } from './components/MyStarsPage';
import { CharactersPage } from './components/CharactersPage';
import { MyTagsPage } from './components/MyTagsPage';
import { CalendarsPage } from './components/CalendarsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { FranchisePage } from './components/FranchisePage';
import { LandingPage } from './components/LandingPage';
import HowItWorksPage from './components/HowItWorksPage';
import FeaturesPage from './components/FeaturesPage';
import TestimonialsPage from './components/TestimonialsPage';
import { useAuth } from './hooks/useAuth';

type AuthMode = 'signin' | 'signup';

// Protected Route wrapper - redirects to landing if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Main App Layout for authenticated users
function AuthenticatedApp() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleShowAuth = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation onSignInClick={handleShowAuth} />
      
      <main>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movies" element={<MovieWatchlistPage />} />
          <Route path="/tv-series" element={<TVSeriesWatchlistPage />} />
          <Route path="/collections" element={<MyCollectionsPage />} />
          <Route path="/new2me" element={<SmartRecommendationsContainer />} />
          <Route path="/franchises" element={<FranchisePage />} />
          <Route path="/my-stars" element={<MyStarsPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/my-tags" element={<MyTagsPage />} />
          <Route path="/calendars" element={<CalendarsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </main>

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');

  // Initialize episode discovery system on app startup
  useEffect(() => {
    const initializeEpisodeSystem = async () => {
      console.log('🚀 Initializing episode discovery system...');
      
      try {
        const { integrationService } = await import('./services/integrationService');
        const result = await integrationService.initialize();
        
        if (result.success) {
          console.log('✅ Episode discovery system initialized successfully!');
          console.log(`📊 Processed ${result.seriesProcessed || 0} TV series`);
          console.log(`🎬 Discovered ${result.episodesDiscovered || 0} episodes`);
        } else {
          console.warn('⚠️ Episode system initialization had issues:', result.message);
        }
      } catch (error) {
        console.error('❌ Failed to initialize episode system:', error);
      }
    };

    const timer = setTimeout(initializeEpisodeSystem, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes - Landing & Marketing Pages */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/search" replace />
            ) : (
              <LandingPage onShowAuth={handleShowAuth} />
            )
          } 
        />
        <Route path="/how-it-works" element={<HowItWorksPage onShowAuth={handleShowAuth} />} />
        <Route path="/features" element={<FeaturesPage onShowAuth={handleShowAuth} />} />
        <Route path="/testimonials" element={<TestimonialsPage onShowAuth={handleShowAuth} />} />
        
        {/* Protected Routes - Main App */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <AuthenticatedApp />
            </ProtectedRoute>
          } 
        />
      </Routes>

      {/* Auth Modal - Available everywhere */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
        />
      )}
    </Router>
  );
}

export default App;