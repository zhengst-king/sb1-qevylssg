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
  // Initialize sort settings from localStorage
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'imdb_rating' | 'user_rating' | 'date_added'>(() => {
    const saved = localStorage.getItem('tv-sort-by');  // ✅ CORRECT KEY
    return (saved as typeof sortBy) || 'date_added';
  });

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('tv-sort-order');  // ✅ CORRECT KEY
    return (saved as 'asc' | 'desc') || 'desc';
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load filters from localStorage on initial mount
    try {
      const savedFilters = localStorage.getItem('watchlist-filters-tv');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        // Update year range max to current value
        parsed.yearRange.max = Math.max(parsed.yearRange.max, new Date().getFullYear() + 5);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse saved filters:', error);
    }
  
    // Return default filters if no saved filters or error
    return {
      yearRange: { min: 1900, max: new Date().getFullYear() + 5 },
      imdbRating: { min: 0, max: 10 },
      genres: [],
      directors: [],
      actors: '',
      countries: [],
      myRating: { min: 1, max: 10 },
      status: 'All'
    };
  });

  // Save sort settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tv-sort-by', sortBy);
    localStorage.setItem('tv-sort-order', sortOrder);
  }, [sortBy, sortOrder]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const currentYear = new Date().getFullYear() + 5;
    if (filters.yearRange.min !== 1900 || filters.yearRange.max !== currentYear) count++;
    if (filters.imdbRating.min !== 0 || filters.imdbRating.max !== 10) count++;
    if (filters.genres.length > 0) count++;
    if (filters.directors.length > 0) count++;
    if (filters.actors.trim() !== '') count++;
    if (filters.countries.length > 0) count++;
    if (filters.myRating.min !== 1 || filters.myRating.max !== 10) count++;
    if (filters.status !== 'All') count++;
    return count;
  }, [filters]);

  // Wrapper function to save filters to localStorage when they change
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    try {
      localStorage.setItem('watchlist-filters-tv', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Failed to save TV filters to localStorage:', error);
    }
  };

  // Single unified event handler for all dropdowns and modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSortDropdown(false);
        setShowFilterPanel(false);
        if (showEpisodesModal) {
          handleCloseEpisodes();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
    
      // Check if click is outside sort dropdown
      if (showSortDropdown && !target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    
      // Check if click is outside filter panel
      if (showFilterPanel && !target.closest('.filter-dropdown')) {
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown, showFilterPanel, showEpisodesModal]);

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      // Status filter
      if (filters.status !== 'All' && movie.status !== filters.status) {
        return false;
      }
      
      // Year filter
      if (movie.year) {
        if (movie.year < filters.yearRange.min || movie.year > filters.yearRange.max) {
          return false;
        }
      }
      
      // IMDb rating filter
      if (movie.imdb_score !== null && movie.imdb_score !== undefined) {
        const score = Number(movie.imdb_score);
        if (score < filters.imdbRating.min || score > filters.imdbRating.max) {
          return false;
        }
      }
      
      // User rating filter
      if (movie.user_rating !== null && movie.user_rating !== undefined) {
        if (movie.user_rating < filters.myRating.min || movie.user_rating > filters.myRating.max) {
          return false;
        }
      }
      
      // Genre filter
      if (filters.genres.length > 0) {
        if (!movie.genre) return false;
        const movieGenres = movie.genre.split(', ').map(g => g.trim());
        const hasMatchingGenre = filters.genres.some(filterGenre =>
          movieGenres.some(movieGenre => 
            movieGenre.toLowerCase().includes(filterGenre.toLowerCase())
          )
        );
        if (!hasMatchingGenre) {
          return false;
        }
      }
      
      // Director filter
      if (filters.directors.length > 0) {
        if (!movie.director) return false;
        const movieDirector = movie.director.trim().toLowerCase();
        const hasMatchingDirector = filters.directors.some(filterDirector =>
          movieDirector.includes(filterDirector.toLowerCase())
        );
        if (!hasMatchingDirector) return false;
      }
      
      // Country filter
      if (filters.countries.length > 0) {
        if (!movie.country) return false;
        const countrySeparators = [', ', ',', ' / ', '/', ' | ', '|'];
        let movieCountries = [movie.country.trim()];
        countrySeparators.forEach(separator => {
          const newList: string[] = [];
          movieCountries.forEach(country => {
            if (country.includes(separator)) {
              newList.push(...country.split(separator).map(c => c.trim()));
            } else {
              newList.push(country);
            }
          });
          movieCountries = newList;
        });
        const hasMatchingCountry = filters.countries.some(filterCountry =>
          movieCountries.includes(filterCountry)
        );
        if (!hasMatchingCountry) return false;
      }
      
      // Actor filter
      if (filters.actors.trim()) {
        if (!movie.actors || movie.actors.trim() === '' || movie.actors === 'N/A') {
          return false;
        }
        const searchTerm = filters.actors.toLowerCase().trim();
        const movieActors = movie.actors.toLowerCase();
        if (!movieActors.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [movies, filters]);

  // Calculate counts based on all movies EXCEPT status filter (so counts don't become 0)
  const movieCounts = useMemo(() => {
    // Apply all filters except status to get base filtered set
    const baseFiltered = movies.filter(movie => {
      // Year filter
      if (movie.year) {
        if (movie.year < filters.yearRange.min || movie.year > filters.yearRange.max) {
          return false;
        }
      }
    
      // IMDb rating filter
      if (movie.imdb_score !== null && movie.imdb_score !== undefined) {
        const score = Number(movie.imdb_score);
        if (score < filters.imdbRating.min || score > filters.imdbRating.max) {
          return false;
        }
      }
    
      // User rating filter
      if (movie.user_rating !== null && movie.user_rating !== undefined) {
        if (movie.user_rating < filters.myRating.min || movie.user_rating > filters.myRating.max) {
          return false;
        }
      }
    
      // Genre filter
      if (filters.genres.length > 0 && movie.genre) {
        const movieGenres = movie.genre.split(', ').map(g => g.trim());
        const hasMatchingGenre = filters.genres.some(filterGenre =>
          movieGenres.includes(filterGenre)
        );
        if (!hasMatchingGenre) {
          return false;
        }
      }
    
      // Director filter
      if (filters.directors.length > 0 && movie.director) {
        const hasMatchingDirector = filters.directors.some(filterDirector =>
          movie.director.toLowerCase().includes(filterDirector.toLowerCase())
        );
        if (!hasMatchingDirector) {
          return false;
        }
      }
    
      // Countries filter
      if (filters.countries.length > 0 && movie.country) {
        const hasMatchingCountry = filters.countries.some(filterCountry =>
          movie.country.toLowerCase().includes(filterCountry.toLowerCase())
        );
        if (!hasMatchingCountry) {
          return false;
        }
      }
    
      // Actors filter
      if (filters.actors.trim() !== '' && movie.actors) {
        const searchTerm = filters.actors.toLowerCase().trim();
        const movieActors = movie.actors.toLowerCase();
        if (!movieActors.includes(searchTerm)) {
          return false;
        }
      }
    
      return true;
    });
  
    return {
      total: baseFiltered.length,
      toWatch: baseFiltered.filter(m => m.status === 'To Watch').length,
      watching: baseFiltered.filter(m => m.status === 'Watching').length,
      paused: baseFiltered.filter(m => m.status === 'Paused').length,
      watched: baseFiltered.filter(m => m.status === 'Watched').length,
      toWatchAgain: baseFiltered.filter(m => m.status === 'To Watch Again').length,
      upcoming: baseFiltered.filter(m => m.status === 'Upcoming').length,
    };
  }, [movies, filters]);

  const sortedMovies = useMemo(() => {
    const sorted = [...filteredMovies].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
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
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [filteredMovies, sortBy, sortOrder]);

  // 🔍 DEBUG LOGGING - Add these console logs right after sortedMovies
  useEffect(() => {
    console.log('🎬 TV SERIES SORT DEBUG:', {
      sortBy,
      sortOrder,
      filteredCount: filteredMovies.length,
      sortedCount: sortedMovies.length,
      firstThreeTitles: sortedMovies.slice(0, 3).map(m => ({
        title: m.title,
        year: m.year,
        imdb: m.imdb_score,
        user: m.user_rating,
        created: m.created_at
      }))
    });
  }, [sortBy, sortOrder, filteredMovies, sortedMovies]);

  // Export TV Series to CSV
  const downloadTVSeriesCSV = (series: Movie[]) => {
    // Sort by rating
    const sortedSeries = [...series].sort((a, b) => {
      const aRating = a.user_rating || a.imdb_score || 0;
      const bRating = b.user_rating || b.imdb_score || 0;
      return bRating - aRating;
    });

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      let str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // CSV Headers
    const headers = [
      'Title',
      'Year',
      'Genre',
      'Country',
      'Language',
      'Runtime',
      'Rated',
      'Released',
      'Director/Creator',
      'Writer',
      'Actors',
      'My Rating',
      'IMDb Rating',
      'Metascore',
      'IMDb Votes',
      'Status',
      'Date Watched',
      'User Review',
      'Total Seasons',
      'Plot',
      'Awards',
      'IMDb ID',
      'IMDb URL',
      'Poster URL',
      'Date Added'
    ];

    // Generate CSV rows
    const rows = sortedSeries.map(show => [
      escapeCSV(show.title),
      escapeCSV(show.year),
      escapeCSV(show.genre),
      escapeCSV(show.country),
      escapeCSV(show.language),
      escapeCSV(show.runtime),
      escapeCSV(show.rated),
      escapeCSV(show.released),
      escapeCSV(show.director),
      escapeCSV(show.writer),
      escapeCSV(show.actors),
      escapeCSV(show.user_rating),
      escapeCSV(show.imdb_score),
      escapeCSV(show.metascore),
      escapeCSV(show.imdb_votes),
      escapeCSV(show.status),
      escapeCSV(show.date_watched),
      escapeCSV(show.user_review),
      escapeCSV(show.total_seasons),
      escapeCSV(show.plot),
      escapeCSV(show.awards),
      escapeCSV(show.imdb_id),
      escapeCSV(show.imdb_url),
      escapeCSV(show.poster_url),
      escapeCSV(show.created_at ? new Date(show.created_at).toISOString().split('T')[0] : '')
    ].join(','));

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_tv_series_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStatusFilter = (status: FilterState['status']) => {
    const newFilters = { ...filters, status };
    handleFiltersChange(newFilters);
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');  // ← USE CALLBACK!
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
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <Tv className="h-8 w-8 text-purple-600" />
                My TV Series
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Filter Button */}
              <div className="relative filter-dropdown">
                <button
                  onClick={() => {
                    setShowFilterPanel(!showFilterPanel);
                    setShowSortDropdown(false);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                  {showFilterPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showFilterPanel && (
                  <div className="absolute top-full left-0 mt-2 w-[600px] z-20">
                    <FilterPanel 
                      movies={movies} 
                      onFiltersChange={handleFiltersChange} 
                      pageType="tv-series"
                      storageKey="watchlist-filters-tv"
                    />
                  </div>
                )}
              </div>

              {/* Sort Button */}
              <div className="relative sort-dropdown">
                <button
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterPanel(false);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span>Sort</span>
                  {showSortDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-20">
                    <div className="p-4 space-y-2">
                      <button
                        onClick={() => handleSortChange('date_added')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'date_added'
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Date Added {sortBy === 'date_added' && (sortOrder === 'desc' ? '(Newest first)' : '(Oldest first)')}
                      </button>
                      
                      <button
                        onClick={() => handleSortChange('title')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'title'
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Title {sortBy === 'title' && (sortOrder === 'asc' ? '(A-Z)' : '(Z-A)')}
                      </button>
                      
                      <button
                        onClick={() => handleSortChange('year')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'year'
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Year {sortBy === 'year' && (sortOrder === 'desc' ? '(Newest first)' : '(Oldest first)')}
                      </button>
                      
                      <button
                        onClick={() => handleSortChange('imdb_rating')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'imdb_rating'
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        IMDb Rating {sortBy === 'imdb_rating' && (sortOrder === 'desc' ? '(High to Low)' : '(Low to High)')}
                      </button>
                      
                      <button
                        onClick={() => handleSortChange('user_rating')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'user_rating'
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        My Rating {sortBy === 'user_rating' && (sortOrder === 'desc' ? '(High to Low)' : '(Low to High)')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button
                onClick={() => downloadTVSeriesCSV(movies)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export Lists</span>
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded">
                  {movies.length}
                </span>
              </button>

              {/* Import Button */}
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Import Lists</span>
              </button>

              {/* Add Button */}
              <button
                onClick={handleAddItem}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Series</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards / Filter Buttons */}
        {movies.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
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
                onClick={() => handleStatusFilter('Upcoming')}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Upcoming'
                    ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-500'
                    : 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                }`}
              >
                <div className="text-2xl font-bold text-orange-700">{movieCounts.upcoming}</div>
                <div className="text-sm text-orange-600">Upcoming</div>
              </button>

              <button
                onClick={() => handleStatusFilter('Paused')}
                className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                  filters.status === 'Paused'
                    ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-500'
                    : 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                }`}
              >
                <div className="text-2xl font-bold text-orange-700">{movieCounts.paused}</div>
                <div className="text-sm text-orange-600">Paused</div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
            <div className="fixed inset-4 md:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <EnhancedEpisodesBrowserPage 
                series={selectedSeries} 
                onBack={handleCloseEpisodes}
                onUpdateStatus={handleUpdateStatus}
                onUpdateRating={handleUpdateRating}
                onUpdateMovie={handleUpdateMovie}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}