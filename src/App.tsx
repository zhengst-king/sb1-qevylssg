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
import { MySpotsPage } from './components/MySpotsPage';
import { MyTagsPage } from './components/MyTagsPage';
import { CalendarsPage } from './components/CalendarsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { useAuth } from './hooks/useAuth';

// Updated PageType with new pages
type PageType = 
  | 'search' 
  | 'movies' 
  | 'tv-series' 
  | 'collections' 
  | 'new2me'
  | 'my-stars'
  | 'my-spots'
  | 'my-tags'
  | 'calendars'
  | 'analytics'
  | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('search');
  const [showAuthModal, setShowAuthModal] = useState(false);
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
          console.log('🔄 Background job processor is now running');
        } else {
          console.error('❌ Episode discovery system failed to initialize:', result.message);
          console.error('🚨 Episode discovery will not work until this is fixed');
        }
      } catch (error) {
        console.error('💥 Critical error initializing episode system:', error);
      }
    };

    initializeEpisodeSystem();
  }, []); // Empty dependency array to run only once on mount

  const handlePageChange = (page: PageType) => {
    // Redirect to sign in for protected pages
    const protectedPages: PageType[] = [
      'movies', 
      'tv-series', 
      'collections', 
      'new2me',
      'my-stars',
      'my-spots',
      'my-tags',
      'calendars',
      'analytics',
      'settings'
    ];
    
    if (!isAuthenticated && protectedPages.includes(page)) {
      setShowAuthModal(true);
      return;
    }
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Navigation */}
      <div className="sticky top-0 z-50">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={handlePageChange}
          onSignInClick={() => setShowAuthModal(true)}
        />
      </div>
      
      {/* Main Content Container with top padding for sticky nav */}
      <div className="pt-4">
        {/* Main Page Routing */}
        {currentPage === 'search' && <SearchPage />}
        {currentPage === 'movies' && <MovieWatchlistPage />}
        {currentPage === 'tv-series' && <TVSeriesWatchlistPage />}
        {currentPage === 'collections' && <MyCollectionsPage />}
        {currentPage === 'new2me' && <SmartRecommendationsContainer />}
        {currentPage === 'my-stars' && <MyStarsPage />}
        {currentPage === 'my-spots' && <MySpotsPage />}
        {currentPage === 'my-tags' && <MyTagsPage />}
        {currentPage === 'calendars' && <CalendarsPage />}
        {currentPage === 'analytics' && <AnalyticsPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

export default App;