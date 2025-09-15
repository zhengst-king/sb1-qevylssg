// src/App.tsx
import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { SearchPage } from './components/SearchPage';
import { MovieWatchlistPage } from './components/MovieWatchlistPage';
import { TVSeriesWatchlistPage } from './components/TVSeriesWatchlistPage';
import { MyCollectionsPage } from './components/MyCollectionsPage';
import { SettingsPage } from './components/SettingsPage';
import { SmartRecommendationsContainer } from './components/SmartRecommendationsContainer';
import { useAuth } from './hooks/useAuth';

// Clean PageType - back to the original structure
type PageType = 'search' | 'movies' | 'tv-series' | 'collections' | 'settings' | 'recommendations';

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
      {currentPage === 'recommendations' && <SmartRecommendationsContainer />}
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

export default App;