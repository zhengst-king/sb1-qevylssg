// src/components/TVSeriesWatchlistPage.tsx
import React, { useState, useMemo } from 'react';
import { WatchlistCard } from './WatchlistCard';
import { FilterPanel } from './FilterPanel';
import { ImportListsModal } from './ImportListsModal';
import { MovieSearchModal } from './MovieSearchModal'; // NEW: Import the same search modal
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Tv, AlertCircle, Download, Upload, Plus } from 'lucide-react';
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
  const { movies, loading, error, updateMovie, deleteMovie, refetch } = useMovies('series'); // NEW: Added refetch
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false); // NEW: Search modal state
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

  // Calculate TV series counts by status for statistics
  const movieCounts = useMemo(() => {
    return {
      toWatch: movies.filter(m => m.status === 'To Watch').length,
      watching: movies.filter(m => m.status === 'Watching').length,
      watched: movies.filter(m => m.status === 'Watched').length,
      toWatchAgain: movies.filter(m => m.status === 'To Watch Again').length,
    };
  }, [movies]);

  const downloadTVWatchlist = (movies: Movie[]) => {
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
        id: movie.id,
        title: movie.title,
        imdbID: movie.imdb_id,
        mediaType: movie.media_type,
        year: movie.year,
        genre: movie.genre,
        country: movie.country,
        language: movie.language,
        runtime: movie.runtime,
        rated: movie.rated,
        released: movie.released,
        director: movie.director,
        writer: movie.writer,
        actors: movie.actors,
        myRating: movie.user_rating,
        imdbRating: movie.imdb_score,
        metascore: movie.metascore,
        imdbVotes: movie.imdb_votes,
        status: movie.status,
        dateWatched: movie.date_watched,
        userReview: movie.user_review,
        posterUrl: movie.poster_url,
        imdbUrl: movie.imdb_url,
        website: movie.website,
        plot: movie.plot,
        awards: movie.awards,
        boxOffice: movie.box_office,
        production: movie.production,
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

  // NEW: Callback to refresh TV series list when item is added
  const handleSeriesAdded = () => {
    console.log('[TVSeriesWatchlistPage] TV Series added, refreshing list...');
    refetch();
  };

  // NEW: Updated to open search modal instead of alert
  const handleAddItem = () => {
    setShowSearchModal(true);
  };

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
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                  <Tv className="h-8 w-8 text-purple-600" />
                  My TV Series
                </h1>
                <p className="text-slate-600 mt-2">
                  Manage your personal collection of TV series
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Export Lists Button */}
                {movies.length > 0 && (
                  <button
                    onClick={() => downloadTVWatchlist(movies)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Lists</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full ml-1">
                      {movies.length}
                    </span>
                  </button>
                )}

                {/* Import Lists Button */}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Lists</span>
                </button>

                {/* Add Item Button */}
                <button
                  onClick={handleAddItem}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {movies.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{movieCounts.toWatch}</div>
                <div className="text-sm text-blue-600">To Watch</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-700">{movieCounts.watching}</div>
                <div className="text-sm text-amber-600">Currently Watching</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{movieCounts.watched}</div>
                <div className="text-sm text-green-600">Watched</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-700">{movieCounts.toWatchAgain}</div>
                <div className="text-sm text-purple-600">To Watch Again</div>
              </div>
            </div>

            {/* Advanced Filters */}
            <FilterPanel movies={movies} onFiltersChange={setFilters} />
          </>
        )}

        {/* Empty State */}
        {movies.length === 0 && !loading && (
          <div className="text-center py-16">
            <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">Your TV series watchlist is empty</h3>
            <p className="text-slate-500">Start by searching for TV series and adding them to your watchlist.</p>
          </div>
        )}

        {/* TV Series List */}
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

        {/* No Results State */}
        {movies.length > 0 && filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No TV series match your filters</h3>
            <p className="text-slate-500">Try adjusting your filter criteria to see more results.</p>
          </div>
        )}

        {/* Modals */}
        <ImportListsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          pageType="tv-series"
        />

        {/* NEW: Search Modal - Same as movies but for TV series */}
        <MovieSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onMovieAdded={handleSeriesAdded}
        />
      </div>
    </div>
  );
}