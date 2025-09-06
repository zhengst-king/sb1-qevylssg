import React, { useState } from 'react';
import { SearchBar } from './SearchBar';
import { MovieCard } from './MovieCard';
import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { aiService } from '../services/aiService';
import { AlertCircle, Film, Bot, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function SearchPage() {
  const [movies, setMovies] = useState<OMDBMovieDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'traditional' | 'ai'>('traditional');
  const [aiResponse, setAiResponse] = useState<string>('');
  const { user } = useAuth();

  // Quick action handlers
  const handleQuickAction = async (actionType: 'movies' | 'tv' | 'popular') => {
    let query = '';
    
    switch (actionType) {
      case 'movies':
        query = 'Recommend popular movies that are highly rated and critically acclaimed';
        break;
      case 'tv':
        query = 'Recommend popular TV series that are highly rated and worth binge-watching';
        break;
      case 'popular':
        query = 'Recommend trending movies and shows that are popular right now';
        break;
    }
    
    await handleSearch(query);
  };

  // AI query detection patterns
  const detectAIQuery = (query: string): boolean => {
    const aiPatterns = [
      /recommend.*movies?/i,
      /find.*movies?.*like/i,
      /suggest.*movies?/i,
      /what.*should.*watch/i,
      /movies?.*about/i,
      /scary.*movies?/i,
      /funny.*movies?/i,
      /action.*movies?/i,
      /comedy.*movies?/i,
      /tv.*shows?/i,
      /series.*like/i,
      /popular.*movies?/i,
      /trending.*movies?/i,
      /highly.*rated/i,
      /critically.*acclaimed/i,
      /worth.*binge/i
    ];
    return aiPatterns.some(pattern => pattern.test(query));
  };

  const handleSearch = async (query: string) => {
    if (!query) {
      setMovies([]);
      setHasSearched(false);
      setAiResponse('');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setAiResponse('');

    // Detect if this should be an AI query
    const isAIQuery = detectAIQuery(query);
    setSearchMode(isAIQuery ? 'ai' : 'traditional');

    try {
      if (isAIQuery) {
        console.log('[SearchPage] Processing AI query:', query);
        const aiResult = await aiService.getRecommendations(query, user?.id);
        setAiResponse(aiResult.response);
        setMovies(aiResult.movies);
      } else {
        console.log('[SearchPage] Processing traditional search:', query);
        const searchResults = await omdbApi.searchMovies(query);
        console.log('Search results received:', searchResults);
        
        // Get detailed information for each movie
        const detailedMovies = await Promise.all(
          searchResults.Search.slice(0, 10).map(async (movie) => {
            try {
              console.log('Fetching details for:', movie.imdbID);
              return await omdbApi.getMovieDetails(movie.imdbID);
            } catch (error) {
              console.error(`Failed to fetch details for movie ${movie.imdbID}:`, error);
              return null;
            }
          })
        );

        console.log('Detailed movies received:', detailedMovies);
        setMovies(detailedMovies.filter((movie): movie is OMDBMovieDetails => movie !== null));
      }
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to search movies';
      
      if (errorMessage === 'Too many results.') {
        setError('Please be more specific in your search.');
      } else if (errorMessage.includes('Request limit reached')) {
        setError('Search limit reached. Please try again later.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Film className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Discover Movies</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Search for specific movies or get instant AI recommendations
          </p>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <button
              onClick={() => handleQuickAction('movies')}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Film className="h-5 w-5" />
              <span>Movies You May Like</span>
            </button>
            
            <button
              onClick={() => handleQuickAction('tv')}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Bot className="h-5 w-5" />
              <span>TV You May Like</span>
            </button>
            
            <button
              onClick={() => handleQuickAction('popular')}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Sparkles className="h-5 w-5" />
              <span>What's Trending</span>
            </button>
          </div>
        </div>
        
        <div className="mb-12">
          <SearchBar onSearch={handleSearch} loading={loading} />
          
          {/* AI Response Display */}
          {aiResponse && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-start space-x-3">
                <Bot className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">AI Recommendation</h3>
                  <p className="text-slate-700">{aiResponse}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Search Mode Indicator */}
          {hasSearched && (
            <div className="flex justify-center mt-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                searchMode === 'ai' 
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {searchMode === 'ai' ? (
                  <>
                    <Bot className="h-4 w-4" />
                    <span>AI Recommendations</span>
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4" />
                    <span>Search Results</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">
              {searchMode === 'ai' ? 'AI is thinking...' : 'Searching for movies...'}
            </p>
          </div>
        )}

        {!loading && hasSearched && movies.length === 0 && !error && (
          <div className="text-center py-12">
            <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No movies found</h3>
            <p className="text-slate-600 mb-6">
              {searchMode === 'ai' 
                ? "Try a different request or ask for specific genres."
                : "Try a different search term or check your spelling."
              }
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleQuickAction('movies')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Get Movie Recommendations
              </button>
              <button
                onClick={() => handleQuickAction('tv')}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                Get TV Recommendations
              </button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {movies.map((movie) => (
            <div key={movie.imdbID} className="relative">
              <MovieCard
                movie={movie}
                posterUrl={movie.Poster !== 'N/A' ? movie.Poster : null}
                imdbUrl={omdbApi.getIMDbUrl(movie.imdbID)}
              />
              
              {/* AI Pick Badge */}
              {(movie as any).aiReason && (
                <div className="absolute top-4 left-4 bg-purple-600 text-white text-xs px-2 py-1 rounded-full shadow-lg z-10">
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>AI Pick</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {movies.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500">
              Movie data provided by{' '}
              <a
                href="http://www.omdbapi.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                The Open Movie Database (OMDb)
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}