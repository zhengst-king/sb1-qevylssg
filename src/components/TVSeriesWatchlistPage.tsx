// src/components/TVSeriesWatchlistPage.tsx
// DEBUG VERSION - Step 3B: Debug which filter is removing movies
import React, { useState } from 'react';
import { Tv, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';

export function TVSeriesWatchlistPage() {
  const { isAuthenticated } = useAuth();
  const { movies, loading, error } = useMovies('series');

  // Test each filter individually to find the culprit
  const debugFilters = (movies: Movie[]) => {
    if (!movies || movies.length === 0) return {};

    const results: any = {};

    // Test year filter
    const yearFilterMin = 1900;
    const yearFilterMax = new Date().getFullYear();
    const yearFiltered = movies.filter(movie => {
      if (movie.year) {
        return movie.year >= yearFilterMin && movie.year <= yearFilterMax;
      }
      return true; // Include if no year
    });
    results.yearFilter = `${yearFiltered.length}/${movies.length} (${yearFilterMin}-${yearFilterMax})`;

    // Test IMDB rating filter
    const imdbFiltered = movies.filter(movie => {
      if (movie.imdb_score !== null && movie.imdb_score !== undefined) {
        const score = Number(movie.imdb_score);
        return score >= 0 && score <= 10;
      }
      return true; // Include if no rating
    });
    results.imdbFilter = `${imdbFiltered.length}/${movies.length} (0-10 IMDB)`;

    // Test user rating filter - THIS IS LIKELY THE CULPRIT
    const userRatingFiltered = movies.filter(movie => {
      if (movie.user_rating !== null && movie.user_rating !== undefined) {
        return movie.user_rating >= 0 && movie.user_rating <= 10;
      }
      return true; // Include if no user rating
    });
    results.userRatingFilter = `${userRatingFiltered.length}/${movies.length} (0-10 user rating)`;

    // Test if movies have user_rating field
    const moviesWithUserRating = movies.filter(m => m.user_rating !== null && m.user_rating !== undefined);
    const moviesWithoutUserRating = movies.filter(m => m.user_rating === null || m.user_rating === undefined);
    results.userRatingData = `${moviesWithUserRating.length} have ratings, ${moviesWithoutUserRating.length} don't`;

    // Test genres filter (empty array should pass all)
    const genreFiltered = movies.filter(movie => {
      const filterGenres: string[] = []; // Empty like our filter
      if (filterGenres.length > 0 && movie.genre) {
        const movieGenres = movie.genre.split(', ').map(g => g.trim());
        return filterGenres.some(filterGenre => movieGenres.includes(filterGenre));
      }
      return true; // Pass all if no genre filter
    });
    results.genreFilter = `${genreFiltered.length}/${movies.length} (no genre filter)`;

    // Test empty arrays and strings
    const emptyArrayFiltered = movies.filter(movie => {
      const emptyDirectors: string[] = [];
      const emptyCountries: string[] = [];
      const emptyActors = '';

      // These should all pass
      return (emptyDirectors.length === 0) && 
             (emptyCountries.length === 0) && 
             (emptyActors.trim() === '');
    });
    results.emptyArrayFilter = `${emptyArrayFiltered.length}/${movies.length} (empty arrays/strings)`;

    return results;
  };

  // Step 1: Just render basic content
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign in to view your TV series</h2>
          <p className="text-slate-600">You need to be signed in to manage your TV series watchlist.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your TV series...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Error loading TV series</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Basic Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <Tv className="h-8 w-8 text-purple-600" />
              My TV Series - DEBUG STEP 3B
            </h1>
            <p className="text-slate-600 mt-2">
              Analyzing which filter is removing all TV series...
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Debug Status - Step 3B: Filter Analysis</h2>
          <div className="space-y-2">
            <p>✅ Component rendered successfully</p>
            <p>✅ useAuth hook working</p>
            <p>✅ Authentication status: {isAuthenticated ? 'Logged in' : 'Not logged in'}</p>
            <p>✅ useMovies hook working</p>
            <p>✅ Loading state: {loading ? 'Loading...' : 'Not loading'}</p>
            <p>✅ Error state: {error ? error : 'No errors'}</p>
            <p>✅ Movies count: {movies?.length || 0} TV series found</p>
            
            {movies && movies.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-red-600 mb-2">🔍 FILTER DEBUG RESULTS:</p>
                {(() => {
                  const debugResults = debugFilters(movies);
                  return (
                    <div className="space-y-1 text-sm">
                      <p>📅 Year filter result: {debugResults.yearFilter}</p>
                      <p>⭐ IMDB filter result: {debugResults.imdbFilter}</p>
                      <p>👤 User rating filter result: {debugResults.userRatingFilter}</p>
                      <p>📊 User rating data: {debugResults.userRatingData}</p>
                      <p>🎭 Genre filter result: {debugResults.genreFilter}</p>
                      <p>📝 Empty arrays filter result: {debugResults.emptyArrayFilter}</p>
                    </div>
                  );
                })()}
                
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="font-semibold text-blue-800">Sample TV Series Data:</p>
                  <div className="text-xs mt-2">
                    <p>Title: {movies[0].title}</p>
                    <p>Year: {movies[0].year || 'null'}</p>
                    <p>IMDB Score: {movies[0].imdb_score || 'null'}</p>
                    <p>User Rating: {movies[0].user_rating || 'null'}</p>
                    <p>Status: {movies[0].status || 'null'}</p>
                    <p>Genre: {movies[0].genre || 'null'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}