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

  useEffect(() => {
    // Only test once when component mounts and user is authenticated
    let hasTestedOnce = false;
    
    if (isAuthenticated && !hasTestedOnce) {
      hasTestedOnce = true;
      testSupabaseEdgeFunction();
    }
  }, []); // Empty dependency array to run only once

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
        console.warn('[Supabase Edge] Edge Function may not be deployed or Claude API key not configured in Supabase dashboard');
        setClaudeConfigured(false);
      } else if (data && data.movies && data.tv_series) {
        console.log('[Supabase Edge] Test successful!');
        setClaudeConfigured(true);
      } else {
        console.warn('[Supabase Edge] Unexpected response format:', data);
        setClaudeConfigured(false);
      }
    } catch (error) {
      console.error('[Supabase Edge] Connection error - Edge Function may not be deployed:', error);
      setClaudeConfigured(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setMovies([]);
    setHasSearched(true);

    try {
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
          console.warn(`Failed to fetch details for ${item.Title}:`, error);
          // Skip this movie if we can't get details
        }
      }
      
      setMovies(detailedMovies);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const getClaudeRecommendations = async (isMovies: boolean) => {
    if (!isAuthenticated || !user) {
      setAiError('Please sign in to get AI recommendations');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      // Get user's watchlist data
      const { data: moviesData, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('media_type', 'movie');

      const { data: tvData, error: tvError } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('media_type', 'series');

      if (moviesError || tvError) {
        throw new Error('Failed to fetch watchlist data');
      }

      const watchlistData = {
        movies: moviesData || [],
        tv_series: tvData || []
      };

      console.log('[AI] Requesting recommendations for:', isMovies ? 'movies' : 'TV series');
      console.log('[AI] Watchlist data:', watchlistData);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('recommendations', {
        body: { watchlistData }
      });

      if (error) {
        console.error('[AI] Edge Function error:', error);
        throw new Error(error.message || 'Failed to get recommendations from service');
      }

      if (!data || !data.movies || !data.tv_series) {
        throw new Error('Invalid response format from recommendation service');
      }

      console.log('[AI] Recommendations received:', data);
      setRecommendations(data);
      
      if (isMovies) {
        setShowingMovieRecs(true);
        setShowingTVRecs(false);
      } else {
        setShowingTVRecs(true);
        setShowingMovieRecs(false);
      }

    } catch (err) {
      console.error('[AI] Recommendation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const getMovieRecommendations = () => getClaudeRecommendations(true);
  const getTVRecommendations = () => getClaudeRecommendations(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <span>{aiLoading ? 'Getting Recommendations...' : 'Get Movie Recommendations'}</span>
              </button>
              
              <button
                onClick={getTVRecommendations}
                disabled={aiLoading || !isAuthenticated || !claudeConfigured}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <TrendingUp className="h-5 w-5" />
                <span>{aiLoading ? 'Getting Recommendations...' : 'Get TV Recommendations'}</span>
              </button>
            </div>

            {!isAuthenticated && (
              <p className="text-sm text-gray-500 mt-4">
                Sign in to get personalized AI recommendations based on your watchlist
              </p>
            )}
          </div>

          {/* AI Error Display */}
          {aiError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{aiError}</p>
              </div>
            </div>
          )}

          {/* AI Recommendations Display */}
          {(showingMovieRecs || showingTVRecs) && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Brain className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-bold text-slate-900">
                  {showingMovieRecs ? 'Movie Recommendations' : 'TV Series Recommendations'}
                </h3>
              </div>
              
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

        {/* ✅ FIXED: Search Results with proper imdbUrl prop */}
        <div className="space-y-8">
          {movies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              posterUrl={movie.Poster !== 'N/A' ? movie.Poster : null}
              imdbUrl={movie.imdbID ? `https://www.imdb.com/title/${movie.imdbID}/` : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}