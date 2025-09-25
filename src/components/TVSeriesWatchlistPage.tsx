// src/components/TVSeriesWatchlistPage.tsx
import React, { useState, useMemo } from 'react';
import { WatchlistCard } from './WatchlistCard';
import { FilterPanel } from './FilterPanel';
import { ImportListsModal } from './ImportListsModal';
import { MovieSearchModal } from './MovieSearchModal';
import { EpisodeBrowser } from './EpisodeBrowser'; // NEW: Episode Browser
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Tv, AlertCircle, Download, Upload, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
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
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'imdb_rating' | 'user_rating' | 'date_added'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // NEW: Episode Browser state
  const [selectedSeries, setSelectedSeries] = useState<Movie | null>(null);
  const [showEpisodeBrowser, setShowEpisodeBrowser] = useState(false);

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

  // Download watchlist as JSON
  const downloadTVWatchlist = (movies: Movie[]) => {
    const data = {
      exportDate: new Date().toISOString(),
      totalSeries: movies.length,
      tvSeries: movies.map(movie => ({
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        director: movie.director,
        actors: movie.actors,
        plot: movie.plot,
        country: movie.country,
        language: movie.language,
        userRating: movie.user_rating,
        status: movie.status,
        dateWatched: movie.date_watched,
        userReview: movie.user_review,
        imdbID: movie.imdb_id,
        imdbRating: movie.imdb_score,
        metascore: movie.metascore,
        imdbVotes: movie.imdb_votes,
        posterUrl: movie.poster_url,
        imdbUrl: movie.imdb_url,
        website: movie.website,
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

  const handleSeriesAdded = () => {
    console.log('[TVSeriesWatchlistPage] TV Series added, refreshing list...');
    refetch();
  };

  const handleAddItem = () => {
    setShowSearchModal(true);
  };

  const handleStatusFilter = (status: 'All' | Movie['status']) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'title' ? 'asc' : 'desc');
    }
    setShowSortDropdown(false);
  };

  // NEW: Episode browser handlers
  const handleViewEpisodes = (series: Movie) => {
    setSelectedSeries(series);
    setShowEpisodeBrowser(true);
  };

  const handleCloseEpisodeBrowser = () => {
    setShowEpisodeBrowser(false);
    setSelectedSeries(null);
  };

  // Handle outside clicks for sort dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);

  // Filter and sort movies
  const filteredAndSortedMovies = useMemo(() => {
    let result = [...filteredMovies];

    // Sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
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
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [filteredMovies, sortBy, sortOrder]);

  // Calculate movie counts
  const movieCounts = useMemo(() => {
    return {
      total: movies.length,
      toWatch: movies.filter(m => m.status === 'To Watch').length,
      watching: movies.filter(m => m.status === 'Watching').length,
      watched: movies.filter(m => m.status === 'Watched').length,
      onHold: movies.filter(m => m.status === 'On Hold').length,
      dropped: movies.filter(m => m.status === 'Dropped').length
    };
  }, [movies]);

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
                <div className="text-sm text-slate-600">All Series</div>
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
                    ? 'bg-green-100 border-green-400 ring-2 ring-green-500'
                    : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                }`}
              >
                <div className="text-2xl font-bold text-green-700">{movieCounts.watching}</div>
                <div className="text-sm text-green-600">Currently Watching</div>
              </button>

              {/* Watched Button */}
              <button
                onClick={() => handleStatusFilter('Watched')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Watched'
                    ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-500'
                    : 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                }`}
              >
                <div className="text-2xl font-bold text-purple-700">{movieCounts.watched}</div>
                <div className="text-sm text-purple-600">Watched</div>
              </button>

              {/* On Hold/Dropped Combined */}
              <button
                onClick={() => handleStatusFilter('On Hold')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'On Hold'
                    ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-500'
                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300'
                }`}
              >
                <div className="text-2xl font-bold text-yellow-700">{movieCounts.onHold + movieCounts.dropped}</div>
                <div className="text-sm text-yellow-600">On Hold/Dropped</div>
              </button>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                      showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                  </button>

                  <div className="text-sm text-slate-600">
                    Showing {filteredAndSortedMovies.length} of {movies.length} series
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="relative sort-dropdown">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm">
                      Sort by: {sortBy === 'date_added' ? 'Date Added' : sortBy === 'imdb_rating' ? 'IMDb Rating' : sortBy === 'user_rating' ? 'My Rating' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                    </span>
                    {showSortDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                      <div className="py-1">
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
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="mb-6">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  movies={movies}
                />
              </div>
            )}
          </>
        )}

        {/* Main Content */}
        {movies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-center">
              <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No TV series yet</h2>
              <p className="text-slate-600 mb-6">Start building your TV series collection by adding your first series.</p>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Your First TV Series</span>
              </button>
            </div>
          </div>
        ) : filteredAndSortedMovies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-center">
              <Filter className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No series match your filters</h2>
              <p className="text-slate-600 mb-6">Try adjusting your filters to see more results.</p>
              <button
                onClick={() => setFilters({
                  yearRange: { min: 1900, max: new Date().getFullYear() },
                  imdbRating: { min: 0, max: 10 },
                  genres: [],
                  directors: [],
                  actors: '',
                  countries: [],
                  myRating: { min: 0, max: 10 },
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedMovies.map((movie) => (
              <div key={movie.id} className="relative">
                <WatchlistCard
                  movie={movie}
                  onUpdateStatus={(status) => handleUpdateStatus(movie.id, status)}
                  onUpdateRating={(rating) => handleUpdateRating(movie.id, rating)}
                  onUpdateMovie={(updates) => handleUpdateMovie(movie.id, updates)}
                  onDelete={() => {
                    if (confirm('Are you sure you want to delete this TV series?')) {
                      deleteMovie(movie.id);
                    }
                  }}
                  className="h-full"
                />
                
                {/* NEW: Episodes Browser Button */}
                <button
                  onClick={() => handleViewEpisodes(movie)}
                  className="absolute top-3 right-3 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-lg transition-colors group z-10"
                  title="Browse Episodes"
                >
                  <Tv className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Import Lists Modal */}
        {showImportModal && (
          <ImportListsModal
            onClose={() => setShowImportModal(false)}
            onImportComplete={refetch}
          />
        )}

        {/* NEW: Search Modal for adding TV series */}
        {showSearchModal && (
          <MovieSearchModal
            onClose={() => setShowSearchModal(false)}
            onMovieAdded={handleSeriesAdded}
            defaultSearchType="series" // Force search type to series
          />
        )}

        {/* NEW: Episode Browser Modal */}
        {showEpisodeBrowser && selectedSeries && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Tv className="h-6 w-6 text-purple-600" />
                  {selectedSeries.title} - Episodes
                </h2>
                <button
                  onClick={handleCloseEpisodeBrowser}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <EpisodeBrowser
                  seriesImdbId={selectedSeries.imdb_id}
                  seriesTitle={selectedSeries.title}
                  onEpisodeSelect={(episode) => {
                    console.log('Selected episode:', episode);
                    // Optional: Add episode to collection, show details, etc.
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}