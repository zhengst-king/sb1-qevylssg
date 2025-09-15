// src/App.tsx
import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { SearchPage } from './components/SearchPage';
import { MovieWatchlistPage } from './components/MovieWatchlistPage';
import { TVSeriesWatchlistPage } from './components/TVSeriesWatchlistPage';
import { MyCollectionsPage } from './components/MyCollectionsPage';
import { SettingsPage } from './components/SettingsPage';
import { SmartRecommendationsWithActions } from './components/SmartRecommendationsWithActions';
import { RecommendationPreferencesManager } from './components/RecommendationPreferencesManager';
import { useAuth } from './hooks/useAuth';

// Updated PageType to include recommendation preferences as separate page (Optional)
// You can use either approach:
// Approach 1: Integrate into Settings page (RECOMMENDED - cleaner navigation)
// Approach 2: Separate page (shown in comments below)

// For Approach 1 (Integration into Settings - RECOMMENDED):
type PageType = 'search' | 'movies' | 'tv-series' | 'collections' | 'settings' | 'recommendations';

// For Approach 2 (Separate page - OPTIONAL):
// type PageType = 'search' | 'movies' | 'tv-series' | 'collections' | 'settings' | 'recommendations' | 'rec-preferences';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('search');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  const handlePageChange = (page: PageType) => {
    // Redirect to sign in for protected pages
    const protectedPages: PageType[] = [
      'movies', 
      'tv-series', 
      'collections', 
      'settings', 
      'recommendations'
      // 'rec-preferences' // Add this if using Approach 2
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
      <Navigation 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        onSignInClick={() => setShowAuthModal(true)}
      />
      
      {/* Main Page Routing */}
      {currentPage === 'search' && <SearchPage />}
      {currentPage === 'movies' && <MovieWatchlistPage />}
      {currentPage === 'tv-series' && <TVSeriesWatchlistPage />}
      {currentPage === 'collections' && <MyCollectionsPage />}
      {currentPage === 'settings' && <SettingsPage />}
      {currentPage === 'recommendations' && <SmartRecommendationsWithActions />}
      
      {/* 
      APPROACH 2: Uncomment this line if you want recommendation preferences as a separate page
      {currentPage === 'rec-preferences' && <RecommendationPreferencesManager />} 
      */}
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

export default App;