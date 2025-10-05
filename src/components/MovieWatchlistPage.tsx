// src/components/MovieWatchlistPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { WatchlistCard } from './WatchlistCard';
import { FilterPanel } from './FilterPanel';
import { ImportListsModal } from './ImportListsModal';
import { MovieSearchModal } from './MovieSearchModal';
import { MovieDetailsPage } from './MovieDetailsPage';
import { useMovies } from '../hooks/useMovies';
import { useMovieFilters } from '../hooks/useMovieFilters';
import { Movie } from '../lib/supabase';
import { Filter, Film, AlertCircle, Download, Upload, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  // Movie Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  // Initialize sort settings from localStorage
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'imdb_rating' | 'user_rating' | 'date_added'>(() => {
    const saved = localStorage.getItem('movie-sort-by');
    return (saved as typeof sortBy) || 'date_added';
  });

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('movie-sort-order');
    return (saved as 'asc' | 'desc') || 'desc';
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load filters from localStorage on initial mount
    const savedFilters = localStorage.getItem('watchlist-filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        // Update year range max to current value
        parsed.yearRange.max = Math.max(parsed.yearRange.max, new Date().getFullYear() + 5);
        return parsed;
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
    return {
      yearRange: { min: 1900, max: new Date().getFullYear() + 5 },
      imdbRating: { min: 0, max: 10 },
      genres: [],
      directors: [],
      actors: '',
      countries: [],
      myRating: { min: 0, max: 10 },
      status: 'All'
    };
  });

  // Save sort settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('movie-sort-by', sortBy);
    localStorage.setItem('movie-sort-order', sortOrder);
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

  // Close dropdowns on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSortDropdown(false);
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sort-dropdown') && !target.closest('.filter-dropdown')) {
        setShowSortDropdown(false);
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Custom filtering logic (more comprehensive than useMovieFilters)
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
      watched: baseFiltered.filter(m => m.status === 'Watched').length,
      toWatchAgain: baseFiltered.filter(m => m.status === 'To Watch Again').length,
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

  // Movie Details Modal Handlers
  const handleViewDetails = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedMovie(null);
  };

  const handleModalBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseDetails();
    }
  };

  const handleUpdateStatus = async (id: string, status: Movie['status']) => {
    await updateMovie(id, { status });
    
    // Update selected movie if it's the one being updated
    if (selectedMovie && selectedMovie.id === id) {
      setSelectedMovie({ ...selectedMovie, status });
    }
  };

  const handleUpdateRating = async (id: string, user_rating: number | null) => {
    await updateMovie(id, { user_rating });
    
    // Update selected movie if it's the one being updated
    if (selectedMovie && selectedMovie.id === id) {
      setSelectedMovie({ ...selectedMovie, user_rating });
    }
  };

  const handleUpdateMovie = async (id: string, updates: Partial<Movie>) => {
    await updateMovie(id, updates);
    
    // Update selected movie if it's the one being updated
    if (selectedMovie && selectedMovie.id === id) {
      setSelectedMovie({ ...selectedMovie, ...updates });
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    await deleteMovie(movieId);
    
    // Close modal if the deleted movie was being viewed
    if (selectedMovie && selectedMovie.id === movieId) {
      handleCloseDetails();
    }
  };

  const handleMovieAdded = () => {
    console.log('[MovieWatchlistPage] Movie added, refreshing list...');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign in to access your movies</h2>
          <p className="text-slate-600">Please sign in to view and manage your movie watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your movies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
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
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <Film className="h-8 w-8 text-blue-600" />
                My Movies
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
                    <FilterPanel movies={movies} onFiltersChange={setFilters} />
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
                        IMDb Rating {sortBy === 'imdb_rating' && (sortOrder === 'desc' ? '(Highest first)' : '(Lowest first)')}
                      </button>
                      
                      <button
                        onClick={() => handleSortChange('user_rating')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === 'user_rating'
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        My Rating {sortBy === 'user_rating' && (sortOrder === 'desc' ? '(Highest first)' : '(Lowest first)')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Import Lists</span>
              </button>

              <button
                onClick={handleAddItem}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>
          
          <p className="text-slate-600">
            Manage your personal collection of movies
          </p>
        </div>

        {/* Statistics Cards / Filter Buttons */}
        {movies.length > 0 && (
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
                <div className="text-sm text-slate-600">All Movies</div>
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
        )}

        {/* Movies Grid */}
        <div className="space-y-6">
          {sortedMovies.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
              <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No movies found</h3>
              <p className="text-slate-600 mb-4">
                {movies.length === 0 
                  ? "You haven't added any movies to your watchlist yet."
                  : "No movies match your current filters."
                }
              </p>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Movie
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedMovies.map((movie) => (
                <WatchlistCard
                  key={movie.id}
                  movie={movie}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateRating={handleUpdateRating}
                  onUpdateMovie={handleUpdateMovie}
                  onDelete={handleDeleteMovie}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <ImportListsModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onMoviesImported={handleMovieAdded}
          />
        )}

        {/* Search Modal */}
        {showSearchModal && (
          <MovieSearchModal
            isOpen={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            onMovieAdded={handleMovieAdded}
          />
        )}

        {/* Movie Details Modal */}
        {showDetailsModal && selectedMovie && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={handleModalBackgroundClick}
            />
            <div className="fixed inset-4 md:inset-8 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <MovieDetailsPage 
                movie={selectedMovie} 
                onBack={handleCloseDetails}
                onUpdateStatus={handleUpdateStatus}
                onUpdateRating={handleUpdateRating}
                onUpdateMovie={handleUpdateMovie}
                onDelete={handleDeleteMovie}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}