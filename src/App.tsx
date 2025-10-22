// src/App.tsx
import React, { useState, useEffect } from 'react';
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
import { useAuth } from './hooks/useAuth';
import { FranchisePage } from './components/FranchisePage';
import { LandingPage } from './components/LandingPage';
import HowItWorksPage from './components/HowItWorksPage';
import FeaturesPage from './components/FeaturesPage';
import TestimonialsPage from './components/TestimonialsPage';

// Updated PageType with 'my-spots' removed
type PageType = 
  | 'search' 
  | 'movies' 
  | 'tv-series' 
  | 'collections' 
  | 'new2me'
  | 'franchises'
  | 'my-stars'
  | 'characters' 
  | 'my-tags'
  | 'calendars'
  | 'analytics'
  | 'settings';

type AuthMode = 'signin' | 'signup';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('search');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const { isAuthenticated, loading } = useAuth();

  // FIX: Initialize episode discovery system on app startup
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

    // Run initialization after a short delay to avoid blocking initial render
    const timer = setTimeout(initializeEpisodeSystem, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handlePageChange = (page: PageType) => {
    if (!isAuthenticated && page !== 'search') {
      handleShowAuth('signin');
      return;
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'search':
        return <SearchPage />;
      case 'movies':
        return <MovieWatchlistPage />;
      case 'tv-series':
        return <TVSeriesWatchlistPage />;
      case 'collections':
        return <MyCollectionsPage />;
      case 'new2me':
        return <SmartRecommendationsContainer />;
      case 'franchises':
        return <FranchisePage />;
      case 'my-stars':
        return <MyStarsPage />;
      case 'characters':
        return <CharactersPage />;
      case 'my-tags':
        return <MyTagsPage />;
      case 'calendars':
        return <CalendarsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <SearchPage />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // NEW: Show landing page if user is not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show main app if user is authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        onSignInClick={() => handleShowAuth('signin')} // Updated
      />
      
      <main>
        {renderPage()}
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

export default App;