import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Brain, Database, Download, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMovies } from '../hooks/useMovies';
import { DynamicRecommendationEngine, DynamicRecommendation, DynamicRecommendationLists } from '../ai/DynamicRecommendationEngine';
import { RecommendationCard } from './RecommendationCard';
import { supabase, testSupabaseConnection } from '../lib/supabase';
import { OMDbSimilaritySearcher, type SimilarMovie } from '../services/SimilarityEngine';

export function AISuggestsPage() {
  const { user, isAuthenticated } = useAuth();
  const { addMovie } = useMovies();
  const [recommendations, setRecommendations] = useState<DynamicRecommendationLists>({
    releasedMovies: [],
    releasedTVSeries: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [userStats, setUserStats] = useState<{
    totalMovies: number;
    totalTVSeries: number;
    topGenres: string[];
    averageRating: number;
    lastRefresh: string | null;
  }>({
    totalMovies: 0,
    totalTVSeries: 0,
    topGenres: [],
    averageRating: 0,
    lastRefresh: null
  });
  const [dynamicEngine] = useState(() => new DynamicRecommendationEngine());
  const [testResults, setTestResults] = useState<SimilarMovie[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  // Test similarity engine
  const testSimilarity = async () => {
    setTestLoading(true);
    setTestResults([]);
    
    console.clear(); // Clear console for clean debugging
    
    const searcher = new OMDbSimilaritySearcher();
    
    // Use a movie from your actual watchlist
    const testMovie = {
      title: "Iron Man",
      imdbID: "tt0371746",
      director: "Jon Favreau", 
      actors: "Robert Downey Jr., Gwyneth Paltrow, Terrence Howard",
      genre: "Action, Adventure, Sci-Fi",
      year: 2008
    };
    
    try {
      const similar = await searcher.findSimilarMovies(testMovie);
      setTestResults(similar);
      console.log('=== FINAL RESULTS ===');
      console.log(`Found ${similar.length} similar movies to ${testMovie.title}`);
      similar.forEach(movie => {
        console.log(`- ${movie.title} (${movie.year}) - ${movie.similarityReason}`);
      });
      
    } catch (error) {
      console.error('Test failed:', error);
      alert(`Test failed: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // Test Supabase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      console.log('[AISuggestsPage] Testing Supabase connection...');
      const result = await testSupabaseConnection();
      
      if (result.success) {
        setConnectionStatus('connected');
        console.log('[AISuggestsPage] Supabase connection successful');
      } else {
        setConnectionStatus('failed');
        setError(`Supabase connection failed: ${result.error}`);
        console.error('[AISuggestsPage] Supabase connection failed:', result.error);
      }
    };

    checkConnection();
  }, []);

  const fetchRecommendations = async () => {
    if (connectionStatus === 'failed') {
      setError('Cannot generate recommendations: Supabase database connection failed');
      return;
    }

    if (!user) {
      setError('Please sign in to get personalized recommendations');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebugInfo('Analyzing your watchlist preferences with ML...');

    try {
      // Clear cache to force fresh recommendations  
      dynamicEngine.clearCache();
      
      // Get user's watchlist for stats
      const { data: userMovies } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id);
      
      if (userMovies) {
        // Calculate user stats
        const movies = userMovies.filter(m => m.media_type === 'movie');
        const tvSeries = userMovies.filter(m => m.media_type === 'series');
        
        // Extract top genres
        const genreCounts: Record<string, number> = {};
        userMovies.forEach(movie => {
          if (movie.genre) {
            movie.genre.split(', ').forEach(genre => {
              genreCounts[genre.trim()] = (genreCounts[genre.trim()] || 0) + 1;
            });
          }
        });
        
        const topGenres = Object.entries(genreCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([genre]) => genre);
        
        // Calculate average rating
        const ratingsWithValues = userMovies
          .map(m => m.user_rating || m.imdb_score)
          .filter((rating): rating is number => rating !== null && rating !== undefined);
        
        const averageRating = ratingsWithValues.length > 0
          ? ratingsWithValues.reduce((sum, rating) => sum + rating, 0) / ratingsWithValues.length
          : 0;
        
        setUserStats({
          totalMovies: movies.length,
          totalTVSeries: tvSeries.length,
          topGenres,
          averageRating,
          lastRefresh: new Date().toISOString()
        });
      }
      
      const recs = await dynamicEngine.generateRecommendations(user.id);
      setRecommendations(recs);
      
      const totalRecs = recs.releasedMovies.length + recs.releasedTVSeries.length;
      
      // Get engine info for debug display
      const engineInfo = dynamicEngine.getEngineInfo();
      const omdbStats = engineInfo.omdbUsage;
      
      setDebugInfo(`Generated ${totalRecs} recommendations. OMDb usage: ${omdbStats.requestCount}/${omdbStats.dailyLimit} requests today.${engineInfo.fallbackMode ? ' (Fallback mode active)' : ''}`);
      
    } catch (error) {
      console.error('Dynamic recommendations fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide helpful error messages for rate limit issues
      if (errorMessage.includes('Daily API limit reached')) {
        setError('OMDb API daily limit reached (1000 requests). Recommendations will be available again tomorrow. You can still use your existing watchlists.');
      } else if (errorMessage.includes('Request limit reached')) {
        setError('OMDb API rate limit exceeded. Please wait a few minutes before requesting new recommendations.');
      } else {
        setError(`Failed to generate dynamic recommendations: ${errorMessage}`);
      }
      
      setDebugInfo(`Error: ${errorMessage}`);
      
      // Fallback to empty recommendations
      setRecommendations({
        releasedMovies: [],
        releasedTVSeries: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadRecommendationList = (recommendations: DynamicRecommendation[], listType: string) => {
    const data = recommendations.map(rec => ({
      title: rec.title,
      year: rec.year,
      genre: rec.genre,
      imdbRating: rec.imdbRating,
      imdbID: rec.imdbID,
      poster: rec.poster,
      recommendationReason: rec.reason,
      dynamicScore: rec.score,
      confidence: rec.confidence,
      type: rec.type,
      listType: listType,
      downloadedAt: new Date().toISOString()
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recommendations_${listType}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddToWatchlist = async (recommendation: DynamicRecommendation) => {
    if (!user) {
      alert('Please sign in to add titles to your watchlist.');
      return;
    }

    try {
      const movieData = {
        title: recommendation.title,
        genre: recommendation.genre !== 'N/A' ? recommendation.genre : undefined,
        year: recommendation.year !== 'N/A' ? parseInt(recommendation.year) : undefined,
        imdb_score: recommendation.imdbRating !== 'N/A' ? parseFloat(recommendation.imdbRating) : undefined,
        imdb_id: recommendation.imdbID,
        poster_url: recommendation.poster !== 'N/A' ? recommendation.poster : undefined,
        media_type: recommendation.type === 'series' ? 'series' : 'movie',
        status: 'To Watch' as const,
        imdb_url: `https://www.imdb.com/title/${recommendation.imdbID}/`
      };

      await addMovie(movieData);
      
      // Clear cache to trigger fresh analysis with new data
      dynamicEngine.clearUserCache(user.id);
      
      // Remove from recommendations
      setRecommendations(prev => {
        const newRecs = { ...prev };
        if (recommendation.type === 'movie') {
          newRecs.releasedMovies = newRecs.releasedMovies.filter(r => r.imdbID !== recommendation.imdbID);
        } else {
          newRecs.releasedTVSeries = newRecs.releasedTVSeries.filter(r => r.imdbID !== recommendation.imdbID);
        }
        return newRecs;
      });
      
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      alert(`Failed to add "${recommendation.title}" to watchlist. Please try again.`);
    }
  };

  const handleNotInterested = async (recommendation: DynamicRecommendation) => {
    if (!user) return;

    try {
      await dynamicEngine.addToNotInterested(
        user.id, 
        recommendation.imdbID, 
        recommendation.type === 'series' ? 'tv' : 'movie'
      );
      
      // Remove from recommendations immediately
      setRecommendations(prev => {
        const newRecs = { ...prev };
        if (recommendation.type === 'movie') {
          newRecs.releasedMovies = newRecs.releasedMovies.filter(r => r.imdbID !== recommendation.imdbID);
        } else {
          newRecs.releasedTVSeries = newRecs.releasedTVSeries.filter(r => r.imdbID !== recommendation.imdbID);
        }
        return newRecs;
      });
      
    } catch (error) {
      console.error('Failed to mark as not interested:', error);
      alert('Failed to update preferences. Please try again.');
    }
  };

  const handleUndo = async (recommendation: DynamicRecommendation) => {
    if (!user) return;

    try {
      await dynamicEngine.removeFromNotInterested(user.id, recommendation.imdbID);
      
      // Add back to recommendations
      setRecommendations(prev => {
        const newRecs = { ...prev };
        if (recommendation.type === 'movie') {
          newRecs.releasedMovies = [...newRecs.releasedMovies, recommendation];
        } else {
          newRecs.releasedTVSeries = [...newRecs.releasedTVSeries, recommendation];
        }
        return newRecs;
      });
      
    } catch (error) {
      console.error('Failed to undo:', error);
      alert('Failed to undo action. Please try again.');
    }
  };

  // Auto-fetch recommendations when user signs in
  useEffect(() => {
    if (isAuthenticated && user && connectionStatus === 'connected') {
      fetchRecommendations();
    }
  }, [isAuthenticated, user, connectionStatus]);

  // Show connection error state
  if (connectionStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Database className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Database Connection Error</h2>
          <p className="text-slate-600 mb-4">
            Unable to connect to Supabase database. Please check your configuration.
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">AI-Powered Recommendations</h2>
          <p className="text-slate-600">Please sign in to get personalized movie and TV recommendations powered by machine learning</p>
        </div>
      </div>
    );
  }

  const totalRecommendations = recommendations.releasedMovies.length + 
                              recommendations.releasedTVSeries.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-slate-900">Dynamic AI Recommendations</h1>
          </div>
          <p className="text-lg text-slate-600 mb-6">
            Adaptive algorithm that learns from your unique viewing preferences and ratings
          </p>
          
          {/* Debug Panel Toggle */}
          {isAuthenticated && (
            <div className="mb-4">
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="inline-flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {showDebugPanel ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                Debug Info
              </button>
            </div>
          )}
          
          {/* Debug Panel */}
          {showDebugPanel && isAuthenticated && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
              <h3 className="text-sm font-medium text-slate-800 mb-3">Dynamic ML Analysis Debug Info</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Total Watchlist Items:</span>
                  <span className="ml-2 font-medium text-slate-800">{userStats.totalMovies}</span>
                </div>
                <div>
                  <span className="text-slate-600">Average Rating:</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {userStats.averageRating > 0 ? userStats.averageRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-600">Top Genres:</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {userStats.topGenres.length > 0 ? userStats.topGenres.join(', ') : 'None detected'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-600">Last Refresh:</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {userStats.lastRefresh ? new Date(userStats.lastRefresh).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Button */}
          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analyzing with Dynamic ML...' : 'Refresh Dynamic Recommendations'}
          </button>
          
          {/* Test Similarity Engine Button */}
          <button
            onClick={testSimilarity}
            disabled={testLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-lg hover:shadow-xl transition-all duration-200 ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testLoading ? 'Testing...' : 'Test Similarity Engine'}
          </button>
        </div>

        {/* Debug Panel */}
        {isAuthenticated && (
          <div className="mb-6">
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              {showDebugPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Debug Info</span>
            </button>
          </div>
        )}

        {/* Test Loading State */}
        {testLoading && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800">Testing similarity engine with "Iron Man"...</span>
            </div>
          </div>
        )}

        {/* Test Results Display */}
        {testResults.length > 0 && (
          <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              Test Results: Found {testResults.length} Similar Movies to "Iron Man"
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Debug Table with Raw Data */}
            <div className="bg-white rounded border overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-left">Rating</th>
                    <th className="px-3 py-2 text-left">Genre</th>
                    <th className="px-3 py-2 text-left">Similarity Reason</th>
                    <th className="px-3 py-2 text-left">IMDb Link</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((movie, index) => (
                    <tr key={movie.imdbID} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {movie.title || 'Unknown Title'}
                      </td>
                      <td className="px-3 py-2">
                        {movie.year || 'N/A'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={parseFloat(movie.imdbRating) < 7 ? 'text-red-600 font-bold' : 'text-green-600'}>
                          {movie.imdbRating || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {movie.genre ? movie.genre.split(',').slice(0, 2).join(', ') : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-blue-600">
                        {movie.similarityReason}
                      </td>
                      <td className="px-3 py-2">
                        {movie.imdbID ? (
                          <a 
                            href={`https://www.imdb.com/title/${movie.imdbID}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 underline"
                          >
                            View IMDb
                          </a>
                        ) : 'No Link'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Quality Analysis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
              <h4 className="font-medium text-yellow-800 mb-2">Quality Analysis:</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>Average Rating: <strong>{(testResults.reduce((sum, m) => sum + (parseFloat(m.imdbRating) || 0), 0) / testResults.length).toFixed(1)}/10</strong></p>
                <p>Low Rated Movies (&lt;7.0): <strong>{testResults.filter(m => parseFloat(m.imdbRating) < 7).length}</strong></p>
                <p>Your Watchlist Average: <strong>8.8/10</strong> (much higher quality preference)</p>
              </div>
            </div>
            
            {/* Raw Debug Data */}
            <details className="mb-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Show Raw Debug Data
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </details>
            
            <div className="text-sm text-green-700">
              Engine found movies but quality filter needs adjustment to match your high standards (8+ ratings).
            </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Dynamic Recommendation Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-indigo-400 rounded-full mt-2"></div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-indigo-800">Dynamic ML Analysis Status</h3>
                <p className="text-sm text-indigo-700 mt-1">{debugInfo}</p>
                {debugInfo.includes('Fallback mode') && (
                  <p className="text-xs text-indigo-600 mt-1">
                    Rate limit reached. Using cached data and reduced API calls.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Running dynamic analysis on your unique preferences...</p>
          </div>
        )}

        {/* Recommendations Sections */}
        {!isLoading && totalRecommendations > 0 && (
          <div className="space-y-12">
            {/* Movies */}
            {recommendations.releasedMovies.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    <Brain className="h-6 w-6 text-blue-500 mr-2" />
                    Movies You Might Like ({recommendations.releasedMovies.length})
                  </h2>
                  <button
                    onClick={() => downloadRecommendationList(recommendations.releasedMovies, 'released_movies')}
                    className="inline-flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Download list as JSON"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download List
                  </button>
                </div>
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {recommendations.releasedMovies.map((rec) => (
                    <RecommendationCard
                      key={rec.imdbID}
                      recommendation={rec}
                      onAddToWatchlist={handleAddToWatchlist}
                      onNotInterested={handleNotInterested}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TV Series */}
            {recommendations.releasedTVSeries.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    <Brain className="h-6 w-6 text-green-500 mr-2" />
                    TV Series You Might Like ({recommendations.releasedTVSeries.length})
                  </h2>
                  <button
                    onClick={() => downloadRecommendationList(recommendations.releasedTVSeries, 'released_tv_series')}
                    className="inline-flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Download list as JSON"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download List
                  </button>
                </div>
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {recommendations.releasedTVSeries.map((rec) => (
                    <RecommendationCard
                      key={rec.imdbID}
                      recommendation={rec}
                      onAddToWatchlist={handleAddToWatchlist}
                      onNotInterested={handleNotInterested}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && totalRecommendations === 0 && !error && (
          <div className="text-center py-16">
            <Brain className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No ML recommendations available</h3>
            <p className="text-slate-500 mb-4">
              Add some movies and TV series to your watchlist and rate them to train the ML model
            </p>
            <p className="text-sm text-slate-400">
              The dynamic algorithm analyzes your ratings, genres, and viewing patterns to suggest content you'll love
            </p>
          </div>
        )}
      </div>
    </div>
  );
}