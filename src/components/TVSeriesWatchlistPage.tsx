// src/components/TVSeriesWatchlistPage.tsx
// DEBUG VERSION - Step 3: Add useMovieFilters hook
import React, { useState } from 'react';
import { Tv, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';

interface FilterState {
  yearRange: { min: number; max: number };
  imdbRating: { min: number; max: number };
  genres: string[];
  directors: string[];
  actors: string;
  countries: string[];
  myRating: { min: number; max: number };
  status: 'All' | Movie['status'];
}

export function TVSeriesWatchlistPage() {
  const { isAuthenticated } = useAuth();
  const { movies, loading, error } = useMovies('series');

  const [filters, setFilters] = useState<FilterState>({
    yearRange: { min: 1900, max: new Date().getFullYear() },
    imdbRating: { min: 0, max: 10 },
    genres: [],
    directors: [],
    actors: '',
    countries: [],
    myRating: { min: 0, max: 10 },
    status: 'All'
  });

  const { filteredMovies } = useMovieFilters(movies, filters);

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
              My TV Series - DEBUG STEP 3
            </h1>
            <p className="text-slate-600 mt-2">
              Testing useMovieFilters hook...
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Debug Status - Step 3</h2>
          <div className="space-y-2">
            <p>✅ Component rendered successfully</p>
            <p>✅ useAuth hook working</p>
            <p>✅ Authentication status: {isAuthenticated ? 'Logged in' : 'Not logged in'}</p>
            <p>✅ useMovies hook working</p>
            <p>✅ Loading state: {loading ? 'Loading...' : 'Not loading'}</p>
            <p>✅ Error state: {error ? error : 'No errors'}</p>
            <p>✅ Movies count: {movies?.length || 0} TV series found</p>
            <p>✅ useMovieFilters hook imported</p>
            <p>✅ Filtered movies count: {filteredMovies?.length || 0} after filtering</p>
            <p>✅ Filter state initialized: {JSON.stringify(filters.status)} status filter</p>
            {movies && movies.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold">First TV series:</p>
                <p className="text-sm text-gray-600">{movies[0].title} ({movies[0].year})</p>
              </div>
            )}
            {filteredMovies && filteredMovies.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold">First filtered TV series:</p>
                <p className="text-sm text-gray-600">{filteredMovies[0].title} ({filteredMovies[0].year})</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}