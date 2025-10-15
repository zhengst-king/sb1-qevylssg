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
  Tag,
  Calendar,
  BarChart3,
  Settings, 
  User,
  Layers
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

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
            <h1 className="text-2xl font-bold text-white">Tagflix</h1>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {/* Home (previously Search) */}
              <button
                onClick={() => onPageChange('search')}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'search'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title="Home"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Movies */}
              <button
                onClick={() => onPageChange('movies')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'movies'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My Movies"
              >
                <Film className="h-5 w-5" />
              </button>

              {/* TV Series */}
              <button
                onClick={() => onPageChange('tv-series')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'tv-series'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My TV Series"
              >
                <Tv className="h-5 w-5" />
              </button>

              {/* My Discs (previously Collections) */}
              <button
                onClick={() => onPageChange('collections')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'collections'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My Discs"
              >
                <Disc3 className="h-5 w-5" />
              </button>

              {/* New2Me */}
              <button
                onClick={() => onPageChange('new2me')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'new2me'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="New2Me"
              >
                <Sparkles className="h-5 w-5" />
              </button>

              {/* Franchises - Changed icon to Layers */}
              <button
                onClick={() => onPageChange('franchises')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'franchises'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Franchises"
              >
                <Layers className="h-5 w-5" />
              </button>

              {/* My Stars */}
              <button
                onClick={() => onPageChange('my-stars')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'my-stars'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My Stars"
              >
                <Star className="h-5 w-5" />
              </button>

              {/* Characters */}
              <button
                onClick={() => onPageChange('characters')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'characters'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Characters"
              >
                <Users className="h-5 w-5" />
              </button>

              {/* My Tags */}
              <button
                onClick={() => onPageChange('my-tags')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'my-tags'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My Tags"
              >
                <Tag className="h-5 w-5" />
              </button>

              {/* Calendars */}
              <button
                onClick={() => onPageChange('calendars')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'calendars'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Calendars"
              >
                <Calendar className="h-5 w-5" />
              </button>

              {/* Analytics */}
              <button
                onClick={() => onPageChange('analytics')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'analytics'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Analytics"
              >
                <BarChart3 className="h-5 w-5" />
              </button>

              {/* Settings */}
              <button
                onClick={() => onPageChange('settings')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'settings'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sign In / User Button */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <button
                onClick={() => onPageChange('settings')}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                title="Profile"
              >
                <User className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={onSignInClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button placeholder */}
          <div className="md:hidden">
            {/* Mobile menu button would go here */}
          </div>
        </div>
      </div>
    </nav>
  );
}