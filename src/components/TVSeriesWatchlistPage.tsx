// src/components/TVSeriesWatchlistPage.tsx
// Fixed version with list/row layout like Movies page and working buttons
import React, { useState, useMemo } from 'react';
import { WatchlistCard } from './WatchlistCard';
import { FilterPanel } from './FilterPanel';
import { ImportListsModal } from './ImportListsModal';
import { MovieSearchModal } from './MovieSearchModal';
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Tv, AlertCircle, Download, Upload, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
    const baseFilteredMovies = movies.filter(movie => {
      const yearInRange = movie.year >= filters.yearRange.min && movie.year <= filters.yearRange.max;
      const imdbInRange = !movie.imdb_score || (movie.imdb_score >= filters.imdbRating.min && movie.imdb_score <= filters.imdbRating.max);
      const genreMatch = filters.genres.length === 0 || filters.genres.some(genre => movie.genre?.toLowerCase().includes(genre.toLowerCase()));
      const directorMatch = filters.directors.length === 0 || filters.directors.some(director => movie.director?.toLowerCase().includes(director.toLowerCase()));
      const actorMatch = !filters.actors || movie.actors?.toLowerCase().includes(filters.actors.toLowerCase());
      const countryMatch = filters.countries.length === 0 || filters.countries.some(country => movie.country?.toLowerCase().includes(country.toLowerCase()));
      
      return yearInRange && imdbInRange && genreMatch && directorMatch && actorMatch && countryMatch;
    });

    return {
      total: baseFilteredMovies.length,
      toWatch: baseFilteredMovies.filter(m => m.status === 'To Watch').length,
      watching: baseFilteredMovies.filter(m => m.status === 'Watching').length,
      watched: baseFilteredMovies.filter(m => m.status === 'Watched').length,
      onHold: baseFilteredMovies.filter(m => m.status === 'On Hold').length,
      dropped: baseFilteredMovies.filter(m => m.status === 'Dropped').length,
    };
  }, [movies, filters]);

  // Sort filtered movies
  const sortedMovies = useMemo(() => {
    const sorted = [...filteredMovies];
    
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'year':
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
        case 'imdb_rating':
          aVal = a.imdb_score || 0;
          bVal = b.imdb_score || 0;
          break;
        case 'user_rating':
          aVal = a.user_rating || 0;
          bVal = b.user_rating || 0;
          break;
        case 'date_added':
        default:
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          break;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredMovies, sortBy, sortOrder]);

  // Download TV series list
  const downloadTVWatchlist = (series: Movie[]) => {
    const data = {
      exportDate: new Date().toISOString(),
      totalSeries: series.length,
      series: series.map(show => ({
        title: show.title,
        year: show.year,
        status: show.status,
        userRating: show.user_rating,
        imdbScore: show.imdb_score,
        genre: show.genre,
        director: show.director,
        actors: show.actors,
        plot: show.plot,
        country: show.country,
        language: show.language,
        runtime: show.runtime,
        posterUrl: show.poster_url,
        imdbUrl: show.imdb_url,
        dateAdded: show.created_at,
        dateWatched: show.date_watched,
        userReview: show.user_review
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Please sign in</h2>
          <p className="text-slate-600">You need to be signed in to view your TV series.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-slate-600">Loading your TV series...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Error loading TV series</h2>
            <p className="text-slate-600">{error}</p>
          </div>
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
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Watching'
                    ? 'bg-green-100 border-green-400 ring-2 ring-green-500'
                    : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                }`}
              >
                <div className="text-2xl font-bold text-green-700">{movieCounts.watching}</div>
                <div className="text-sm text-green-600">Currently Watching</div>
              </button>

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

            {/* Advanced Filters and Sorting */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <FilterPanel movies={movies} onFiltersChange={setFilters} />
              </div>
              
              <div className="lg:w-80 sort-dropdown">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <Filter className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-slate-900">Sort By</span>
                      <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {sortBy === 'date_added' && 'Date Added'}
                        {sortBy === 'title' && 'Title'}
                        {sortBy === 'year' && 'Year'}
                        {sortBy === 'imdb_rating' && 'IMDb Rating'}
                        {sortBy === 'user_rating' && 'My Rating'}
                        {sortBy === 'title' ? (sortOrder === 'asc' ? ' A-Z' : ' Z-A') : (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                      </span>
                    </div>
                    {showSortDropdown ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
                  </button>

                  {showSortDropdown && (
                    <div className="px-6 pb-6 space-y-2 border-t border-slate-200">
                      <div className="pt-4 space-y-1">
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
          </>
        )}

        {/* Main Content - FIXED: Changed from grid to space-y list layout like Movies page */}
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
        ) : sortedMovies.length === 0 ? (
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
              <div key={movie.id} className="bg-white rounded-xl shadow-sm border border-slate-200">
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
                />
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

        {/* Search Modal for adding TV series */}
        {showSearchModal && (
          <MovieSearchModal
            onClose={() => setShowSearchModal(false)}
            onMovieAdded={handleSeriesAdded}
            defaultSearchType="series"
          />
        )}
      </div>
    </div>
  );
}