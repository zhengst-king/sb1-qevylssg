// src/components/Navigation.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Layers
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
  onSignInClick: () => void;
}

export function Navigation({ onSignInClick }: NavigationProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current page from URL path
  const currentPath = location.pathname;

  const handleNavigation = (path: string) => {
    if (!isAuthenticated && path !== '/search') {
      onSignInClick();
      return;
    }
    navigate(path);
  };

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-800 shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white">Tagflix</h1>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {/* Home (Search) */}
              <button
                onClick={() => handleNavigation('/search')}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/search')
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title="Home"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Movies */}
              <button
                onClick={() => handleNavigation('/movies')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/movies')
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
                onClick={() => handleNavigation('/tv-series')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/tv-series')
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My TV Series"
              >
                <Tv className="h-5 w-5" />
              </button>

              {/* Collections */}
              <button
                onClick={() => handleNavigation('/collections')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/collections')
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="My Collections"
              >
                <Disc3 className="h-5 w-5" />
              </button>

              {/* New2Me (Recommendations) */}
              <button
                onClick={() => handleNavigation('/new2me')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/new2me')
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="New2Me Recommendations"
              >
                <Sparkles className="h-5 w-5" />
              </button>

              {/* Franchises */}
              <button
                onClick={() => handleNavigation('/franchises')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/franchises')
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
                onClick={() => handleNavigation('/my-stars')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/my-stars')
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
                onClick={() => handleNavigation('/characters')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/characters')
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
                onClick={() => handleNavigation('/my-tags')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/my-tags')
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
                onClick={() => handleNavigation('/calendars')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/calendars')
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
                onClick={() => handleNavigation('/analytics')}
                disabled={!isAuthenticated}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/analytics')
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isAuthenticated 
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Analytics"
              >
                <BarChart3 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Settings Button - Right side */}
          <div className="flex items-center">
            <button
              onClick={() => isAuthenticated ? handleNavigation('/settings') : onSignInClick()}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive('/settings')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={isAuthenticated ? "Settings" : "Sign in to access settings"}
            >
              <Settings className="h-5 w-5" />
            </button>
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