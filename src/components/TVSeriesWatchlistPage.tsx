// src/components/TVSeriesWatchlistPage.tsx
// FIXED: Corrected function parameter passing to match EnhancedTVSeriesCard expectations
import React, { useState, useMemo, useEffect } from 'react';
import { EnhancedTVSeriesCard } from './EnhancedTVSeriesCard';
import { EnhancedEpisodesBrowserPage } from './EnhancedEpisodesBrowserPage';
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
        (filters.actors === '' || (movie.actors && movie.actors.toLowerCase().includes(filters.actors.toLowerCase()))) &&
        (filters.genres.length === 0 || filters.genres.some(genre => movie.genre?.toLowerCase().includes(genre.toLowerCase()))) &&
        (filters.directors.length === 0 || filters.directors.some(dir => movie.director?.toLowerCase().includes(dir.toLowerCase()))) &&
        (filters.countries.length === 0 || filters.countries.some(country => movie.country?.toLowerCase().includes(country.toLowerCase())))
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
    const filtered = filteredMovies.filter(movie => 
      filters.status === 'All' || movie.status === filters.status
    );

    return [...filtered].sort((a, b) => {
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
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredMovies, sortBy, sortOrder, filters.status]);

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

  // FIXED: Updated handlers to match EnhancedTVSeriesCard expectations
  const handleUpdateStatus = async (movieId: string, status: Movie['status']) => {
    try {
      await updateMovie(movieId, { status });
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const handleUpdateRating = async (movieId: string, rating: number | null) => {
    try {
      await updateMovie(movieId, { user_rating: rating });
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  };

  const handleUpdateMovie = async (movieId: string, updates: Partial<Movie>) => {
    try {
      await updateMovie(movieId, updates);
    } catch (error) {
      console.error('Error updating movie:', error);
      throw error;
    }
  };

  const handleDelete = async (movieId: string) => {
    try {
      await deleteMovie(movieId);
    } catch (error) {
      console.error('Error deleting movie:', error);
      throw error;
    }
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
          <p className="text-slate-600">Please sign in to manage your TV series watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-slate-600">Loading TV series...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-red-800 font-medium">Error Loading TV Series</h3>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Tv className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-slate-900">My TV Series</h1>
            </div>
            <p className="text-slate-600">Track and organize your TV series collection</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-slate-900">{movieCounts.total}</div>
            <div className="text-sm text-slate-600">Total Series</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-blue-600">{movieCounts.toWatch}</div>
            <div className="text-sm text-slate-600">To Watch</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-yellow-600">{movieCounts.watching}</div>
            <div className="text-sm text-slate-600">Watching</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-green-600">{movieCounts.watched}</div>
            <div className="text-sm text-slate-600">Watched</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-purple-600">{movieCounts.toWatchAgain}</div>
            <div className="text-sm text-slate-600">Rewatch</div>
          </div>
        </div>

        {/* Status Filter & Sort Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <div className="flex items-center space-x-1">
                {(['All', 'To Watch', 'Watching', 'Watched', 'To Watch Again'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      filters.status === status
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">Sort by:</span>
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <span className="capitalize">
                    {sortBy === 'date_added' ? 'Date Added' : 
                     sortBy === 'imdb_rating' ? 'IMDb Rating' : 
                     sortBy === 'user_rating' ? 'My Rating' : sortBy}
                  </span>
                  {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                {showSortDropdown && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                    {[
                      { key: 'title', label: 'Title' },
                      { key: 'year', label: 'Year' },
                      { key: 'imdb_rating', label: 'IMDb Rating' },
                      { key: 'user_rating', label: 'My Rating' },
                      { key: 'date_added', label: 'Date Added' }
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => handleSortChange(option.key as typeof sortBy)}
                        className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          availableGenres={Array.from(new Set(movies.flatMap(m => m.genre?.split(', ') || [])))}
          availableDirectors={Array.from(new Set(movies.flatMap(m => m.director?.split(', ') || [])))}
          availableCountries={Array.from(new Set(movies.flatMap(m => m.country?.split(', ') || [])))}
        />

        {/* Series List */}
        {sortedMovies.length === 0 ? (
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