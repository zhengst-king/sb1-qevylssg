import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { SearchPage } from './components/SearchPage';
import { MovieWatchlistPage } from './components/MovieWatchlistPage';
import { TVSeriesWatchlistPage } from './components/TVSeriesWatchlistPage';
import { AISuggestsPage } from './components/AISuggestsPage';
import { SettingsPage } from './components/SettingsPage'; // Add this import
import { useAuth } from './hooks/useAuth';

// Update the PageType to include 'settings'
type PageType = 'search' | 'movies' | 'tv-series' | 'ai-suggests' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('search');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  const handlePageChange = (page: PageType) => {
    // Redirect to sign in for protected pages (settings is protected too)
    if (!isAuthenticated && (page === 'movies' || page === 'tv-series' || page === 'ai-suggests' || page === 'settings')) {
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
      
      {currentPage === 'search' && <SearchPage />}
      {currentPage === 'movies' && <MovieWatchlistPage />}
      {currentPage === 'tv-series' && <TVSeriesWatchlistPage />}
      {currentPage === 'ai-suggests' && <AISuggestsPage />}
      {currentPage === 'settings' && <SettingsPage />} {/* Add this line */}
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

export default App;