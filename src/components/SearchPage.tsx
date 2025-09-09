// src/components/SearchPage.tsx (Using Supabase Edge Functions)
import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { MovieCard } from './MovieCard';
import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { AlertCircle, Film, Brain, Sparkles, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ClaudeRecommendation {
  title: string;
  reason: string;
  imdbID?: string;
}

interface ClaudeRecommendations {
  movies: ClaudeRecommendation[];
  tv_series: ClaudeRecommendation[];
}

export function SearchPage() {
  const { user, isAuthenticated } = useAuth();
  const [movies, setMovies] = useState<OMDBMovieDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<ClaudeRecommendations>({
    movies: [],
    tv_series: []
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showingMovieRecs, setShowingMovieRecs] = useState(false);
  const [showingTVRecs, setShowingTVRecs] = useState(false);
  const [claudeConfigured, setClaudeConfigured] = useState(false);

  // Test Supabase Edge Functions on mount
  useEffect(() => {
    if (isAuthenticated) {
      testSupabaseEdgeFunction();
    }
  }, [isAuthenticated]);

  const testSupabaseEdgeFunction = async () => {
    console.log('[Supabase Edge] Testing Edge Function connection...');
    
    try {
      // Test with minimal data
      const testData = {
        watchlistData: {
          movies: [{
            title: "Test Movie",
            user_rating: 8,
            status: "Watched",
            imdb_id: "tt0111161"
          }],
          tv_series: []
        }
      };

      console.log('[Supabase Edge] Calling recommendations function...');
      
      const { data, error } = await supabase.functions.invoke('recommendations', {
        body: testData
      });

      console.log('[Supabase Edge] Response:', { data, error });

      if (error) {
        console.error('[Supabase Edge] Test failed:', error);
        // Don't set claudeConfigured to false immediately - the function might not be deployed
        console.warn('[Supabase Edge] Edge Function may not be deployed or configured properly');
        setClaudeConfigured(false);
      } else if (data && data.movies && data.tv_series) {
        console.log('[Supabase Edge] Test successful!');
        setClaudeConfigured(true);
      } else {
        console.error('[Supabase Edge] Invalid response format:', data);
        setClaudeConfigured(false);
      }
    } catch (error) {
      console.error('[Supabase Edge] Test error:', error);
      // Edge Function might not be deployed in development environment
      console.warn('[Supabase Edge] This is expected in local development without deployed Edge Functions');
      setClaudeConfigured(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query) {
      setMovies([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      console.log('Starting search for:', query);
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
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to search movies';
      
      if (errorMessage === 'Too many results.') {
        try {
          const exactSearchResults = await omdbApi.searchMovies(`"${query}"`);
          const detailedExactMovies = await Promise.all(
            exactSearchResults.Search.slice(0, 5).map(async (movie) => {
              try {
                return await omdbApi.getMovieDetails(movie.imdbID);
              } catch (error) {
                console.error(`Failed to fetch details for exact movie ${movie.imdbID}:`, error);
                return null;
              }
            })
          );
          setMovies(detailedExactMovies.filter((movie): movie is OMDBMovieDetails => movie !== null));
        } catch (exactSearchError) {
          const exactErrorMessage = exactSearchError instanceof Error ? 
            exactSearchError.message : 'Unknown error';
          if (exactErrorMessage.includes('Too many results')) {
            setError(`"${query}" is too broad a search term. Please be more specific by adding a year (e.g., "Batman 2022") or using the full movie title.`);
          } else {
            setError(`Search failed: ${exactErrorMessage}. Try being more specific with your search terms.`);
          }
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getClaudeRecommendations = async (showMovies: boolean = true) => {
    console.log('[Claude Recs] Starting recommendation request via Supabase...');
    
    if (!user) {
      setAiError('Please sign in to get personalized recommendations');
      return;
    }

    if (!claudeConfigured) {
      console.error('[Claude Recs] Supabase Edge Functions not working');
      setAiError('Claude AI service is not available. The Edge Function connection failed.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setShowingMovieRecs(false);
    setShowingTVRecs(false);

    try {
      console.log('[Claude Recs] Fetching user watchlist...');
      
      // Get user's watchlist from Supabase
      const { data: userMovies, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id);

      console.log('[Claude Recs] Watchlist data:', userMovies);

      if (moviesError) {
        console.error('[Claude Recs] Supabase error:', moviesError);
        throw new Error(`Failed to fetch watchlist: ${moviesError.message}`);
      }

      if (!userMovies || userMovies.length === 0) {
        throw new Error('No watchlist data found. Please add some movies and rate them first.');
      }

      // Prepare watchlist data for Claude
      const movies = userMovies
        .filter(m => m.media_type === 'movie' && m.user_rating && m.user_rating > 0)
        .map(m => ({
          title: m.title,
          user_rating: m.user_rating,
          status: m.status,
          date_watched: m.date_watched,
          imdb_id: m.imdb_id
        }));

      const tv_series = userMovies
        .filter(m => m.media_type === 'series' && m.user_rating && m.user_rating > 0)
        .map(m => ({
          title: m.title,
          user_rating: m.user_rating,
          status: m.status,
          date_watched: m.date_watched,
          imdb_id: m.imdb_id
        }));

      console.log('[Claude Recs] Prepared data:', { movies: movies.length, tv_series: tv_series.length });

      if (movies.length === 0 && tv_series.length === 0) {
        throw new Error('No rated movies or TV series found. Please rate some items in your watchlist first.');
      }

      const requestData = {
        watchlistData: { movies, tv_series }
      };
      
      console.log('[Claude Recs] Calling Supabase Edge Function...');
      
      // Call Supabase Edge Function (which calls Claude internally)
      const { data, error } = await supabase.functions.invoke('recommendations', {
        body: requestData
      });
      
      console.log('[Claude Recs] Supabase response:', { data, error });

      if (error) {
        console.error('[Claude Recs] Supabase Edge Function error:', error);
        throw new Error(`Recommendation service error: ${error.message}`);
      }

      if (!data || !data.movies || !data.tv_series) {
        console.error('[Claude Recs] Invalid response format:', data);
        throw new Error('Invalid response format from recommendation service');
      }
      
      console.log('[Claude Recs] Received recommendations:', data);
      
      setRecommendations(data);
      
      if (showMovies) {
        setShowingMovieRecs(true);
      } else {
        setShowingTVRecs(true);
      }
    } catch (error) {
      console.error('[Claude Recs] Failed to get recommendations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get recommendations';
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const getMovieRecommendations = () => getClaudeRecommendations(true);
  const getTVRecommendations = () => getClaudeRecommendations(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Film className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Discover Movies</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Search for specific movies or get instant AI recommendations based on your watchlist
          </p>
        </div>
        
        <div className="mb-12">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* AI Recommendation Section */}
        <div className="mb-12 bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Brain className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">AI Recommendation</h2>
            </div>
            <p className="text-slate-600 max-w-xl mx-auto mb-6">
              Get instant Claude AI recommendations based on your watchlist and ratings
            </p>

            {/* Configuration Status */}
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${claudeConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                Claude AI Service: {claudeConfigured ? 'Connected via Supabase' : 'Connection Failed'}
              </span>
            </div>

            {/* AI Recommendation Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={getMovieRecommendations}
                disabled={aiLoading || !isAuthenticated || !claudeConfigured}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <Sparkles className="h-5 w-5" />
                <span>{aiLoading ? 'Getting Recommendations...' : 'Movies You May Like'}</span>
              </button>
              
              <button
                onClick={getTVRecommendations}
                disabled={aiLoading || !isAuthenticated || !claudeConfigured}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <TrendingUp className="h-5 w-5" />
                <span>{aiLoading ? 'Getting Recommendations...' : 'TV You May Like'}</span>
              </button>

            </div>

            {!isAuthenticated && (
              <p className="text-sm text-gray-500 mt-4">
                Sign in to get personalized AI recommendations
              </p>
            )}

            {!claudeConfigured && isAuthenticated && (
              <p className="text-sm text-red-500 mt-4">
                Edge Function connection failed. Check your Supabase setup.
              </p>
            )}
          </div>

          {/* AI Error Display */}
          {aiError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">AI Recommendation Error</p>
                  <p className="text-red-600 text-sm mt-1">{aiError}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Loading State */}
          {aiLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Claude AI is analyzing your preferences...</p>
            </div>
          )}

          {/* AI Recommendations Display */}
          {(showingMovieRecs || showingTVRecs) && !aiLoading && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
                {showingMovieRecs ? 'Movie Recommendations' : 'TV Series Recommendations'}
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(showingMovieRecs ? recommendations.movies : recommendations.tv_series).map((rec, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-slate-900 mb-2">{rec.title}</h4>
                    <p className="text-sm text-slate-600 mb-3">{rec.reason}</p>
                    {rec.imdbID && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">IMDb ID: {rec.imdbID}</p>
                        <a 
                          href={`https://www.imdb.com/title/${rec.imdbID}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View on IMDb →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {(showingMovieRecs ? recommendations.movies : recommendations.tv_series).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500">No recommendations available. Add more rated items to your watchlist for better suggestions.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Error Display */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
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
            <p className="text-slate-500 text-lg">No movies or TV series found. Try a different search term.</p>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-8">
          {movies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              posterUrl={movie.Poster !== 'N/A' ? movie.Poster : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}