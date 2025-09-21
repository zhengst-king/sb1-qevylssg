// src/components/TVSeriesWatchlistPage.tsx
import React, { useState, useMemo } from 'react';
import { WatchlistCard } from './WatchlistCard';
import { FilterPanel } from './FilterPanel';
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Tv, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

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
  const { movies, loading, error, updateMovie, deleteMovie } = useMovies('series');
  const [filters, setFilters] = useState<FilterState>({
    yearRange: { min: 1900, max: 2025 },
    imdbRating: { min: 0, max: 10 },
    genres: [],
    directors: [],
    actors: '',
    countries: [],
    myRating: { min: 1, max: 10 },
    status: 'All'
  });

  const filteredMovies = useMovieFilters(movies, filters);

  const downloadTVWatchlist = (movies: Movie[]) => {
    // Sort by user rating descending (highest rated first), then by IMDb rating
    const sortedMovies = [...movies].sort((a, b) => {
      const aRating = a.user_rating || a.imdb_score || 0;
      const bRating = b.user_rating || b.imdb_score || 0;
      return bRating - aRating;
    });

    const data = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        totalCount: movies.length,
        exportType: 'tv_series_watchlist',
        sortedBy: 'user_rating_desc'
      },
      tvSeries: sortedMovies.map(movie => ({
        // Core identification
        id: movie.id,
        title: movie.title,
        imdbID: movie.imdb_id,
        mediaType: movie.media_type,
        
        // Basic series info
        year: movie.year,
        genre: movie.genre,
        country: movie.country,
        language: movie.language,
        runtime: movie.runtime,
        rated: movie.rated,
        released: movie.released,
        
        // People
        director: movie.director,
        writer: movie.writer,
        actors: movie.actors,
        
        // Ratings and scores
        myRating: movie.user_rating,
        imdbRating: movie.imdb_score,
        metascore: movie.metascore,
        imdbVotes: movie.imdb_votes,
        
        // User tracking
        status: movie.status,
        dateWatched: movie.date_watched,
        userReview: movie.user_review,
        
        // URLs and media
        posterUrl: movie.poster_url,
        imdbUrl: movie.imdb_url,
        website: movie.website,
        
        // Additional info
        plot: movie.plot,
        awards: movie.awards,
        boxOffice: movie.box_office,
        production: movie.production,
        
        // Timestamps
        createdAt: movie.created_at,
        statusUpdatedAt: movie.status_updated_at,
        ratingUpdatedAt: movie.rating_updated_at,
        lastModifiedAt: movie.last_modified_at
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_tv_series_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateStatus = async (id: string, status: Movie['status']) => {
    await updateMovie(id, { status });
  };

  const handleUpdateRating = async (id: string, user_rating: number | null) => {
    await updateMovie(id, { user_rating });
  };

  const handleUpdateMovie = async (id: string, updates: Partial<Movie>) => {
    await updateMovie(id, updates);
  };

  const movieCounts = useMemo(() => {
    return {
      total: movies.length,
      toWatch: movies.filter(m => m.status === 'To Watch').length,
      watching: movies.filter(m => m.status === 'Watching').length,
      watched: movies.filter(m => m.status === 'Watched').length,
      toWatchAgain: movies.filter(m => m.status === 'To Watch Again').length,
    };
  }, [movies]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-600 mb-2">Sign in required</h3>
          <p className="text-slate-500">Please sign in to view your TV series watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your TV series watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header - Matching MyCollections style */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                <Tv className="h-8 w-8 text-purple-600 mr-3" />
                My TV Series
              </h1>
              <p className="text-slate-600 mt-2">
                Manage your personal collection of TV series
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Download Button */}
              {movies.length > 0 && (
                <button
                  onClick={() => downloadTVWatchlist(movies)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download My List</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full ml-1">
                    {movies.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {movies.length > 0 && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-slate-200">
                <div className="text-2xl font-bold text-slate-900">{movieCounts.total}</div>
                <div className="text-sm text-slate-600">Total Series</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center shadow-sm border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{movieCounts.toWatch}</div>
                <div className="text-sm text-purple-600">To Watch</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center shadow-sm border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{movieCounts.watching}</div>
                <div className="text-sm text-yellow-600">Watching</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center shadow-sm border border-green-200">
                <div className="text-2xl font-bold text-green-700">{movieCounts.watched}</div>
                <div className="text-sm text-green-600">Watched</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center shadow-sm border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{movieCounts.toWatchAgain}</div>
                <div className="text-sm text-purple-600">To Watch Again</div>
              </div>
            </div>

            {/* Advanced Filters */}
            <FilterPanel movies={movies} onFiltersChange={setFilters} />
          </>
        )}

        {movies.length === 0 && !loading && (
          <div className="text-center py-16">
            <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">Your TV series watchlist is empty</h3>
            <p className="text-slate-500">Start by searching for TV series and adding them to your watchlist.</p>
          </div>
        )}

        <div className="space-y-6">
          {filteredMovies.map((movie) => (
            <WatchlistCard
              key={movie.id}
              movie={movie}
              onUpdateStatus={handleUpdateStatus}
              onUpdateRating={handleUpdateRating}
              onUpdateMovie={handleUpdateMovie}
              onDelete={deleteMovie}
            />
          ))}
        </div>

        {movies.length > 0 && filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No TV series match your filters</h3>
            <p className="text-slate-500">Try adjusting your filter criteria to see more results.</p>
          </div>
        )}
      </div>
    </div>
  );
}