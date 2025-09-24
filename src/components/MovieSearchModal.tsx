// src/components/MovieSearchModal.tsx
import React, { useState } from 'react';
import { Search, X, Film, AlertCircle } from 'lucide-react';
import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { MovieCard } from './MovieCard';

interface MovieSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MovieSearchModal({ isOpen, onClose }: MovieSearchModalProps) {
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
      console.log('[MovieSearchModal] Searching for:', query);
      const searchResults = await omdbApi.searchMovies(query);
      
      if (searchResults.Response === 'False') {
        throw new Error(searchResults.Error || 'No results found');
      }

      // Fetch detailed information for each movie
      const searchItems = searchResults.Search || [];
      const detailedMovies: OMDBMovieDetails[] = [];
      
      for (const item of searchItems) {
        try {
          const details = await omdbApi.getMovieDetails(item.imdbID);
          if (details.Response === 'True') {
            detailedMovies.push(details);
          }
        } catch (error) {
          console.warn(`[MovieSearchModal] Failed to fetch details for ${item.Title}:`, error);
          // Skip this movie if we can't get details
        }
      }
      
      setMovies(detailedMovies);
      console.log('[MovieSearchModal] Found', detailedMovies.length, 'detailed movies');
    } catch (err) {
      console.error('[MovieSearchModal] Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setMovies([]);
    setHasSearched(false);
    setError(null);
  };

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Search Movies</h2>
            <p className="text-sm text-slate-600 mt-1">Search and add movies to your collection</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for movies and TV series..."
                className="block w-full pl-10 pr-12 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-slate-900 placeholder-slate-500 transition-all duration-200"
                disabled={loading}
              />
              
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Movies & TV Series'}
            </button>
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
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
              <p className="text-slate-600">Searching for movies...</p>
            </div>
          )}

          {/* Search Results Empty State */}
          {!loading && hasSearched && movies.length === 0 && !error && (
            <div className="text-center py-12">
              <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No movies or TV series found.</p>
              <p className="text-slate-400">Try a different search term.</p>
            </div>
          )}

          {/* Search Results */}
          {movies.length > 0 && (
            <div className="p-6 space-y-6">
              <div className="text-sm text-slate-600 mb-4">
                Found {movies.length} result{movies.length === 1 ? '' : 's'} for "{query}"
              </div>
              
              {movies.map((movie) => (
                <MovieCard
                  key={movie.imdbID}
                  movie={movie}
                  posterUrl={movie.Poster !== 'N/A' ? movie.Poster : null}
                  imdbUrl={movie.imdbID ? `https://www.imdb.com/title/${movie.imdbID}/` : null}
                />
              ))}
            </div>
          )}

          {/* Initial State */}
          {!hasSearched && !loading && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Search for movies and TV series</p>
              <p className="text-slate-400">Enter a title above to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}