// src/components/MovieWatchlistPage.tsx
import React, { useState, useMemo } from 'react';
import { WatchlistCard } from './WatchlistCard';
import { FilterPanel } from './FilterPanel';
import { ImportListsModal } from './ImportListsModal';
import { MovieSearchModal } from './MovieSearchModal';
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Film, AlertCircle, Download, Upload, Plus } from 'lucide-react';
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

export function MovieWatchlistPage() {
  const { isAuthenticated } = useAuth();
  const { movies, loading, error, updateMovie, deleteMovie, refetch } = useMovies('movie');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'imdb_rating' | 'user_rating' | 'date_added'>('date_added'); // NEW: Sorting state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // NEW: Sort direction
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

  // NEW: Apply sorting to filtered movies
  const sortedMovies = useMemo(() => {
    const sorted = [...filteredMovies].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'year':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'imdb_rating':
          aValue = a.imdb_score || 0;
          bValue = b.imdb_score || 0;
          break;
        case 'user_rating':
          aValue = a.user_rating || 0;
          bValue = b.user_rating || 0;
          break;
        case 'date_added':
        default:
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [filteredMovies, sortBy, sortOrder]);

  // Calculate movie counts by status for statistics
  const movieCounts = useMemo(() => {
    return {
      total: movies.length, // NEW: Total count for "All" button
      toWatch: movies.filter(m => m.status === 'To Watch').length,
      watching: movies.filter(m => m.status === 'Watching').length,
      watched: movies.filter(m => m.status === 'Watched').length,
      toWatchAgain: movies.filter(m => m.status === 'To Watch Again').length,
    };
  }, [movies]);

  const downloadMovieWatchlist = (movies: Movie[]) => {
    const sortedMovies = [...movies].sort((a, b) => {
      const aRating = a.user_rating || a.imdb_score || 0;
      const bRating = b.user_rating || b.imdb_score || 0;
      return bRating - aRating;
    });

    const data = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        totalCount: movies.length,
        exportType: 'movie_watchlist',
        sortedBy: 'user_rating_desc'
      },
      movies: sortedMovies.map(movie => ({
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
    a.download = `my_movies_${new Date().toISOString().split('T')[0]}.json`;
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

  const handleMovieAdded = () => {
    // Refresh the movies list when a movie is successfully added
    console.log('[MovieWatchlistPage] Movie added, refreshing list...');
    refetch();
  };

  const handleAddItem = () => {
    setShowSearchModal(true);
  };

  // NEW: Handle status filter button clicks
  const handleStatusFilter = (status: 'All' | Movie['status']) => {
    setFilters(prev => ({ ...prev, status }));
  };

  // NEW: Handle sorting changes
  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with default order
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'title' ? 'asc' : 'desc'); // Title defaults to A-Z, others to highest first
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign in to view your movies</h2>
          <p className="text-slate-600">You need to be signed in to manage your movie watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your movies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Error loading movies</h2>
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
                  <Film className="h-8 w-8 text-blue-600" />
                  My Movies
                </h1>
                <p className="text-slate-600 mt-2">
                  Manage your personal collection of movies
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Export Lists Button */}
                {movies.length > 0 && (
                  <button
                    onClick={() => downloadMovieWatchlist(movies)}
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
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards / Filter Buttons */}
        {movies.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {/* All Status Button */}
              <button
                onClick={() => handleStatusFilter('All')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'All'
                    ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl font-bold text-slate-700">{movieCounts.total}</div>
                <div className="text-sm text-slate-600">All Movies</div>
              </button>

              {/* To Watch Button */}
              <button
                onClick={() => handleStatusFilter('To Watch')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'To Watch'
                    ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-500'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl font-bold text-blue-700">{movieCounts.toWatch}</div>
                <div className="text-sm text-blue-600">To Watch</div>
              </button>

              {/* Currently Watching Button */}
              <button
                onClick={() => handleStatusFilter('Watching')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Watching'
                    ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500'
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                }`}
              >
                <div className="text-2xl font-bold text-amber-700">{movieCounts.watching}</div>
                <div className="text-sm text-amber-600">Currently Watching</div>
              </button>

              {/* Watched Button */}
              <button
                onClick={() => handleStatusFilter('Watched')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Watched'
                    ? 'bg-green-100 border-green-400 ring-2 ring-green-500'
                    : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                }`}
              >
                <div className="text-2xl font-bold text-green-700">{movieCounts.watched}</div>
                <div className="text-sm text-green-600">Watched</div>
              </button>

              {/* To Watch Again Button */}
              <button
                onClick={() => handleStatusFilter('To Watch Again')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'To Watch Again'
                    ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-500'
                    : 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                }`}
              >
                <div className="text-2xl font-bold text-purple-700">{movieCounts.toWatchAgain}</div>
                <div className="text-sm text-purple-600">To Watch Again</div>
              </button>
            </div>

            {/* Advanced Filters and Sorting */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <FilterPanel movies={movies} onFiltersChange={setFilters} />
              </div>
              
              {/* NEW: Sorting Controls */}
              <div className="lg:w-80">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Sort By</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSortChange('date_added')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'date_added'
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      Date Added {sortBy === 'date_added' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => handleSortChange('title')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'title'
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      Title {sortBy === 'title' && (sortOrder === 'asc' ? 'A-Z' : 'Z-A')}
                    </button>
                    <button
                      onClick={() => handleSortChange('year')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'year'
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      Year {sortBy === 'year' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => handleSortChange('imdb_rating')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'imdb_rating'
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      IMDb Rating {sortBy === 'imdb_rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => handleSortChange('user_rating')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'user_rating'
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      My Rating {sortBy === 'user_rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {movies.length === 0 && !loading && (
          <div className="text-center py-16">
            <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">Your movie watchlist is empty</h3>
            <p className="text-slate-500">Start by searching for movies and adding them to your watchlist.</p>
          </div>
        )}

        {/* Movies List */}
        <div className="space-y-6">
          {sortedMovies.map((movie) => (
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
        {movies.length > 0 && sortedMovies.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No movies match your filters</h3>
            <p className="text-slate-500">Try adjusting your filter criteria to see more results.</p>
          </div>
        )}

        {/* Modals */}
        <ImportListsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          pageType="movies"
        />

        <MovieSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onMovieAdded={handleMovieAdded}
        />
      </div>
    </div>
  );
}