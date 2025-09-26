// src/components/TVSeriesWatchlistPage.tsx
// Final version using all the enhanced components with new features
import React, { useState, useMemo, useEffect } from 'react';
import { EnhancedTVSeriesCard } from './EnhancedTVSeriesCard'; // NEW: Enhanced card with delete, streaming, creators
import { EnhancedEpisodesBrowserPage } from './EnhancedEpisodesBrowserPage'; // NEW: Enhanced episodes with background cache
import { FilterPanel } from './FilterPanel';
import { ImportListsModal } from './ImportListsModal';
import { MovieSearchModal } from './MovieSearchModal';
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Tv, AlertCircle, Download, Upload, Plus, ChevronDown, ChevronUp, Play } from 'lucide-react';
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
  const { movies, loading, error, updateMovie, deleteMovie, refetch } = useMovies('series');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Movie | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'imdb_rating' | 'user_rating' | 'date_added'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    yearRange: { min: 1900, max: new Date().getFullYear() + 5 },
    imdbRating: { min: 0, max: 10 },
    genres: [],
    directors: [],
    actors: '',
    countries: [],
    myRating: { min: 1, max: 10 },
    status: 'All'
  });

  const filteredMovies = useMovieFilters(movies, filters);

  // Calculate counts based on filtered results
  const movieCounts = useMemo(() => {
    const baseFiltered = movies.filter(movie => {
      return (
        movie.year >= filters.yearRange.min &&
        movie.year <= filters.yearRange.max &&
        (movie.imdb_score ?? 0) >= filters.imdbRating.min &&
        (movie.imdb_score ?? 10) <= filters.imdbRating.max &&
        (filters.genres.length === 0 || filters.genres.some(genre => movie.genres?.includes(genre))) &&
        (filters.directors.length === 0 || filters.directors.some(director => movie.director?.includes(director))) &&
        (filters.actors === '' || movie.actors?.toLowerCase().includes(filters.actors.toLowerCase())) &&
        (filters.countries.length === 0 || filters.countries.some(country => movie.country?.includes(country))) &&
        (movie.user_rating === null || movie.user_rating === undefined || 
         (movie.user_rating >= filters.myRating.min && movie.user_rating <= filters.myRating.max))
      );
    });

    return {
      total: baseFiltered.length,
      toWatch: baseFiltered.filter(m => m.status === 'To Watch').length,
      watching: baseFiltered.filter(m => m.status === 'Watching').length,
      watched: baseFiltered.filter(m => m.status === 'Watched').length,
      toWatchAgain: baseFiltered.filter(m => m.status === 'To Watch Again').length,
    };
  }, [movies, filters]);

  const sortedMovies = useMemo(() => {
    return [...filteredMovies].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'year':
          aValue = a.year ?? 0;
          bValue = b.year ?? 0;
          break;
        case 'imdb_rating':
          aValue = a.imdb_score ?? 0;
          bValue = b.imdb_score ?? 0;
          break;
        case 'user_rating':
          aValue = a.user_rating ?? 0;
          bValue = b.user_rating ?? 0;
          break;
        case 'date_added':
        default:
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredMovies, sortBy, sortOrder]);

  const handleStatusFilter = (status: FilterState['status']) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'title' ? 'asc' : 'desc');
    }
    setShowSortDropdown(false);
  };

  const handleUpdateStatus = async (movieId: string, status: Movie['status']) => {
    await updateMovie(movieId, { status });
  };

  const handleUpdateRating = async (movieId: string, rating: number | null) => {
    await updateMovie(movieId, { user_rating: rating });
  };

  const handleUpdateMovie = async (movieId: string, updates: Partial<Movie>) => {
    await updateMovie(movieId, updates);
  };

  const handleDelete = async (movieId: string) => {
    await deleteMovie(movieId);
  };

  const handleAddItem = () => {
    setShowSearchModal(true);
  };

  const handleSeriesAdded = () => {
    refetch();
    setShowSearchModal(false);
  };

  const handleViewEpisodes = (series: Movie) => {
    setSelectedSeries(series);
    setShowEpisodesModal(true);
  };

  const handleCloseEpisodes = () => {
    setShowEpisodesModal(false);
    setSelectedSeries(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600">Please sign in to view your TV series collection.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-8 border border-red-200 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibual text-slate-900 mb-2">Error Loading TV Series</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <Tv className="h-8 w-8 text-purple-600" />
              <span>My TV Series</span>
            </h1>
            <p className="text-slate-600 mt-2">
              Track and organize your television series collection with enhanced features
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter Toggle */}
            {movies.length > 0 && (
              <button
                onClick={() => document.getElementById('filter-panel')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {filteredMovies.length !== movies.length && (
                  <span className="bg-purple-600 text-white px-2 py-1 rounded-full ml-1 text-xs">
                    {filteredMovies.length}
                  </span>
                )}
              </button>
            )}

            {/* Sort Dropdown */}
            {movies.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span>Sort</span>
                  {showSortDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={() => handleSortChange('date_added')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'date_added'
                            ? 'bg-purple-100 text-purple-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Date Added {sortBy === 'date_added' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => handleSortChange('title')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'title'
                            ? 'bg-purple-100 text-purple-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Title {sortBy === 'title' && (sortOrder === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                      <button
                        onClick={() => handleSortChange('year')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'year'
                            ? 'bg-purple-100 text-purple-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Year {sortBy === 'year' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => handleSortChange('imdb_rating')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'imdb_rating'
                            ? 'bg-purple-100 text-purple-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        IMDb Rating {sortBy === 'imdb_rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => handleSortChange('user_rating')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'user_rating'
                            ? 'bg-purple-100 text-purple-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        My Rating {sortBy === 'user_rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import Lists</span>
            </button>

            <button
              onClick={handleAddItem}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Series</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards / Filter Buttons */}
        {movies.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <button
                onClick={() => handleStatusFilter('All')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'All'
                    ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl font-bold text-slate-700">{movieCounts.total}</div>
                <div className="text-sm text-slate-600">All Series</div>
              </button>

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

              <button
                onClick={() => handleStatusFilter('Watching')}
                className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Watching'
                    ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-500'
                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300'
                }`}
              >
                <div className="text-2xl font-bold text-yellow-700">{movieCounts.watching}</div>
                <div className="text-sm text-yellow-600">Watching</div>
              </button>

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

            {/* Filter Panel */}
            <div id="filter-panel">
              <FilterPanel
                movies={movies}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </>
        )}

        {/* Main Content */}
        {movies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-center">
              <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No TV series yet</h2>
              <p className="text-slate-600 mb-6">Start building your TV series collection by adding your first show.</p>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Your First TV Series</span>
              </button>
            </div>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-center">
              <Filter className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No series match your filters</h2>
              <p className="text-slate-600 mb-6">Try adjusting your filters to see more results.</p>
              <button
                onClick={() => setFilters({
                  yearRange: { min: 1900, max: new Date().getFullYear() + 5 },
                  imdbRating: { min: 0, max: 10 },
                  genres: [],
                  directors: [],
                  actors: '',
                  countries: [],
                  myRating: { min: 1, max: 10 },
                  status: 'All'
                })}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Filter className="h-5 w-5" />
                <span>Clear All Filters</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMovies.map((movie) => (
              <EnhancedTVSeriesCard
                key={movie.id}
                movie={movie}
                onUpdateStatus={handleUpdateStatus}
                onUpdateRating={handleUpdateRating}
                onUpdateMovie={handleUpdateMovie}
                onDelete={handleDelete}
                onViewEpisodes={handleViewEpisodes}
              />
            ))}
          </div>
        )}

        {/* Import Lists Modal */}
        {showImportModal && (
          <ImportListsModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            pageType="tv-series"
            onImportSuccess={refetch}
          />
        )}

        {/* Search Modal for adding TV series */}
        {showSearchModal && (
          <MovieSearchModal
            isOpen={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            onMovieAdded={handleSeriesAdded}
          />
        )}

        {/* Enhanced Episodes Browser Modal */}
        {showEpisodesModal && selectedSeries && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCloseEpisodes} />
            <div className="fixed inset-4 md:inset-8 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <EnhancedEpisodesBrowserPage 
                series={selectedSeries} 
                onBack={handleCloseEpisodes}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}