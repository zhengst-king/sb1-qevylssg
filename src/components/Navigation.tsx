// src/components/Navigation.tsx
import React from 'react';
import { Search, Film, Tv, Star, User, LogOut, Settings, Disc3, Sparkles, BarChart3, History } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';

type PageType = 'search' | 'movies' | 'tv-series' | 'collections' | 'settings' | 'recommendations' | 'analytics' | 'history';

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
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
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
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
                currentPage === 'movies'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Film className="h-4 w-4" />
              <span>Movies</span>
            </button>
            
            <button
              onClick={() => onPageChange('tv-series')}
              disabled={!isAuthenticated}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
                currentPage === 'tv-series'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <Tv className="h-4 w-4" />
              <span>TV Series</span>
            </button>

            <button
              onClick={() => onPageChange('collections')}
              disabled={!isAuthenticated}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
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
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
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

            {/* NEW: Analytics Button */}
            <button
              onClick={() => onPageChange('analytics')}
              disabled={!isAuthenticated}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
                currentPage === 'analytics'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>

            {/* NEW: History Button */}
            <button
              onClick={() => onPageChange('history')}
              disabled={!isAuthenticated}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
                currentPage === 'history'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAuthenticated 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>

            <button
              onClick={() => onPageChange('settings')}
              disabled={!isAuthenticated}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
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