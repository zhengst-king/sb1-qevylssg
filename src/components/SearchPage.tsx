import React, { useState } from 'react';
import { SearchBar } from './SearchBar';
import { MovieCard } from './MovieCard';
import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { AlertCircle, Film, Bot, Tv, Sparkles } from 'lucide-react';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';

export function SearchPage() {
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
      /series.*like/i
    ];
    return aiPatterns.some(pattern => pattern.test(query));
  };
  const [movies, setMovies] = useState<OMDBMovieDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'traditional' | 'ai'>('traditional');
  const [aiResponse, setAiResponse] = useState<string>('');
  const { user } = useAuth();

  const handleSearch = async (query: string) => {
    if (!query) {
      setMovies([]);
      setHasSearched(false);
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
        setLoading(false);
        return;
      }
      
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
      
      if (errorMessage === 'Too many results.' || errorMessage.includes('Your search returned too many results')) {
        // Try exact search with quotes
        try {
          console.log('Too many results, trying exact search for:', `"${query}"`);
          const exactSearchResults = await omdbApi.searchMovies(`"${query}"`);
          console.log('Exact search results received:', exactSearchResults);
          
          // Get detailed information for each movie
          const detailedMovies = await Promise.all(
            exactSearchResults.Search.slice(0, 10).map(async (movie) => {
              try {
                console.log('Fetching details for:', movie.imdbID);
                return await omdbApi.getMovieDetails(movie.imdbID);
              } catch (error) {
                console.error(`Failed to fetch details for movie ${movie.imdbID}:`, error);
                return null;
              }
            })
          );

          console.log('Detailed movies from exact search:', detailedMovies);
          const validMovies = detailedMovies.filter((movie): movie is OMDBMovieDetails => movie !== null);
          
          if (validMovies.length > 0) {
            setMovies(validMovies);
            setError(null); // Clear error since we found results
          } else {
            setError(`No exact matches found for "${query}". Try being more specific by adding a year (e.g., "Batman 2022") or using the full movie title.`);
          }
        } catch (exactSearchError) {
          console.error('Exact search also failed:', exactSearchError);
          const exactErrorMessage = exactSearchError instanceof Error ? exactSearchError.message : 'Unknown error';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Film className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Discover Movies</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Search through millions of movies and TV series to build your personal watchlists
          </p>
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
            <p className="text-slate-600">Searching for movies...</p>
          </div>
        )}

        {!loading && hasSearched && movies.length === 0 && !error && (
          <div className="text-center py-12">
            <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No movies or TV series found. Try a different search term.</p>
          </div>
        )}

        <div className="space-y-8">
          {movies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              posterUrl={movie.Poster !== 'N/A' ? movie.Poster : null}
              imdbUrl={omdbApi.getIMDbUrl(movie.imdbID)}
            />
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