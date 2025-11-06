// src/components/MovieSearchModal.tsx
// UPDATED VERSION - Uses TMDB instead of OMDB for better upcoming movie coverage

import React, { useState, useEffect } from 'react';
import { Search, X, Film, AlertCircle } from 'lucide-react';
import { TMDBAdapter } from '../lib/tmdbAdapter';
import { OMDBMovieDetails } from '../lib/omdb';
import { MovieCard } from './MovieCard';

interface MovieSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded?: () => void;
  contentType?: 'movie' | 'series' | 'all';
}

export function MovieSearchModal({ isOpen, onClose, onMovieAdded, contentType = 'all' }: MovieSearchModalProps) {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<OMDBMovieDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setMovies([]);
    setHasSearched(true);

    try {
      console.log('[MovieSearchModal] Searching TMDB for:', query);
      
      // Use TMDB adapter to search both movies and TV series
      const results = await TMDBAdapter.searchAll(query, contentType);
      
      if (results.length === 0) {
        setError(`No ${contentType === 'movie' ? 'movies' : contentType === 'series' ? 'TV series' : 'movies or TV series'} found for your search.`);
      } else {
        setMovies(results);
        console.log('[MovieSearchModal] Found', results.length, 'results from TMDB');
      }
    } catch (err) {
      console.error('[MovieSearchModal] Search error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An error occurred while searching. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClose = () => {
    setQuery('');
    setMovies([]);
    setError(null);
    setHasSearched(false);
    onClose();
  };

  // Handle Escape key to close modal
   useEffect(() => {
     const handleEscape = (e: KeyboardEvent) => {
       if (e.key === 'Escape' && isOpen) {
         setQuery('');
         setMovies([]);
         setError(null);
         setHasSearched(false);
         onClose();
       }
     };

     document.addEventListener('keydown', handleEscape);

     return () => {
       document.removeEventListener('keydown', handleEscape);
     };
   }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-10 lg:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header with Search */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              Search {contentType === 'movie' ? 'Movies' : contentType === 'series' ? 'TV Series' : 'Movies & TV Series'}
            </h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by title (e.g., Avatar, The Last of Us)..."
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoFocus
              />
            </div>
            <button
              type="submit"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                loading || !query.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-white text-blue-600 hover:bg-gray-50 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? 'Searching...' : `Search ${contentType === 'movie' ? 'Movies' : contentType === 'series' ? 'TV Series' : 'Movies & TV Series'}`}
            </button>
          </form>

          {/* Powered by TMDB Badge */}
          <div className="mt-3 flex items-center justify-end">
            <span className="text-white/80 text-sm">
              Powered by The Movie Database (TMDB)
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto max-h-[90vh]">
          {/* Search Error Display */}
          {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Search Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">
                Searching TMDB for {contentType === 'movie' ? 'movies' : contentType === 'series' ? 'TV series' : 'movies and TV series'}...
              </p>
              <p className="text-slate-500 text-sm mt-2">Including upcoming releases</p>
            </div>
          )}

          {/* Search Results Empty State */}
          {!loading && hasSearched && movies.length === 0 && !error && (
            <div className="text-center py-12">
              <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">
                No {contentType === 'movie' ? 'movies' : contentType === 'series' ? 'TV series' : 'movies or TV series'} found.
              </p>
              <p className="text-slate-400">Try a different search term.</p>
            </div>
          )}

          {/* Search Results */}
          {movies.length > 0 && (
            <div className="p-6 space-y-6">
              <div className="text-sm text-slate-600 mb-4 flex items-center justify-between">
                <span>Found {movies.length} result{movies.length === 1 ? '' : 's'} for "{query}"</span>
                <span className="text-xs text-slate-500">
                  ✓ Includes upcoming releases
                </span>
              </div>
              
              {movies.map((movie, index) => (
                <MovieCard
                  key={movie.imdbID || `${movie.Title}-${index}`}
                  movie={movie}
                  posterUrl={movie.Poster !== 'N/A' ? movie.Poster : null}
                  imdbUrl={movie.imdbID && movie.imdbID !== 'N/A' ? `https://www.imdb.com/title/${movie.imdbID}/` : null}
                  onMovieAdded={onMovieAdded}
                />
              ))}
            </div>
          )}

          {/* Initial State */}
          {!hasSearched && !loading && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">
                Search for {contentType === 'movie' ? 'movies' : contentType === 'series' ? 'TV series' : 'movies and TV series'}
              </p>
              <p className="text-slate-400">Enter a title above to get started</p>
              <div className="mt-6 space-y-2 text-sm text-slate-500">
                <p>✓ Search includes upcoming and unreleased titles</p>
                {contentType === 'all' && <p>✓ Both movies and TV series</p>}
                <p>✓ Comprehensive {contentType === 'movie' ? 'movie' : contentType === 'series' ? 'TV' : 'movie'} database</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}