// src/components/Navigation.tsx
import React from 'react';
import { 
  Search, 
  Film, 
  Tv, 
  Disc3, 
  Sparkles, 
  Star,
  Users,
  MapPin,
  Tag,
  Calendar,
  BarChart3,
  Settings, 
  User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type PageType = 
  | 'search' 
  | 'movies' 
  | 'tv-series' 
  | 'collections' 
  | 'new2me'
  | 'my-stars'
  | 'characters'
  | 'my-spots'
  | 'my-tags'
  | 'calendars'
  | 'analytics'
  | 'settings';

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  onSignInClick: () => void;
}

export function Navigation({ currentPage, onPageChange, onSignInClick }: NavigationProps) {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="bg-slate-800 shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white">CineList</h1>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {/* Home (previously Search) */}
              <button
                onClick={() => onPageChange('search')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'search'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Home</span>
              </button>

              {/* Movies */}
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

              {/* TV Series */}
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

              {/* My Discs (previously Collections) */}
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
                <span>My Discs</span>
              </button>

              {/* New2Me */}
              <button
                onClick={() => onPageChange('new2me')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'new2me'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>New2Me</span>
              </button>

              {/* My Stars */}
              <button
                onClick={() => onPageChange('my-stars')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'my-stars'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <Star className="h-4 w-4" />
                <span>My Stars</span>
              </button>

              {/* Characters */}
              <button
                onClick={() => onPageChange('characters')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'characters'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Characters</span>
              </button>

              {/* My Spots */}
              <button
                onClick={() => onPageChange('my-spots')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'my-spots'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span>My Spots</span>
              </button>

              {/* My Tags */}
              <button
                onClick={() => onPageChange('my-tags')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'my-tags'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <Tag className="h-4 w-4" />
                <span>My Tags</span>
              </button>

              {/* Calendars */}
              <button
                onClick={() => onPageChange('calendars')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentPage === 'calendars'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Calendars</span>
              </button>

              {/* Analytics */}
              <button
                onClick={() => onPageChange('analytics')}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
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

              {/* Settings */}
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
            </div>
          </div>

          {/* User Section - Only Sign In button when not authenticated */}
          <div className="ml-4 pl-4 border-l border-slate-600">
            {!isAuthenticated && (
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

      {/* Mobile Navigation */}
      <div className="md:hidden bg-slate-700 px-4 py-2">
        <div className="text-slate-300 text-sm">
          Mobile navigation coming soon...
        </div>
      </div>
    </nav>
  );
}