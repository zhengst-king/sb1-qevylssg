// src/components/Navigation.tsx
import React from 'react';
import { Search, Film, Tv, Star, User, LogOut, Settings, Disc3, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';

// Clean PageType - back to original
type PageType = 'search' | 'movies' | 'tv-series' | 'collections' | 'settings' | 'recommendations';

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  onSignInClick: () => void;
}

export function Navigation({ currentPage, onPageChange, onSignInClick }: NavigationProps) {
  const { user, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
            <h1 className="text-xl font-bold text-white">CineList</h1>
          </div>
          
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              onClick={() => onPageChange('search')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentPage === 'search'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
            
            <button
              onClick={() => onPageChange('movies')}
              disabled={!isAuthenticated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentPage === 'movies'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Film className="h-4 w-4" />
              <span>My Movies</span>
            </button>
            
            <button
              onClick={() => onPageChange('tv-series')}
              disabled={!isAuthenticated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentPage === 'tv-series'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Tv className="h-4 w-4" />
              <span>My TV Series</span>
            </button>

            <button
              onClick={() => onPageChange('collections')}
              disabled={!isAuthenticated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentPage === 'collections'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Disc3 className="h-4 w-4" />
              <span>Collections</span>
            </button>

            <button
              onClick={() => onPageChange('recommendations')}
              disabled={!isAuthenticated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentPage === 'recommendations'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Smart Recs</span>
            </button>

            <button
              onClick={() => onPageChange('settings')}
              disabled={!isAuthenticated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                currentPage === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            
            <div className="ml-4 pl-4 border-l border-slate-600">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-slate-300 text-sm">
                    {user?.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 px-3 py-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignInClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  <User className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}