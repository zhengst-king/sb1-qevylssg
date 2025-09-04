import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Filter, Search } from 'lucide-react';
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

interface FilterPanelProps {
  movies: Movie[];
  onFiltersChange: (filters: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  yearRange: { min: 1900, max: 2025 },
  imdbRating: { min: 0, max: 10 },
  genres: [],
  directors: [],
  actors: '',
  countries: [],
  myRating: { min: 1, max: 10 },
  status: 'All'
};

export function FilterPanel({ movies, onFiltersChange }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [directorSearch, setDirectorSearch] = useState('');

  // Extract unique values from movies
  const filterOptions = useMemo(() => {
    const genres = new Set<string>();
    const directors = new Set<string>();
    const countries = new Set<string>();

    movies.forEach(movie => {
      if (movie.genre) {
        movie.genre.split(', ').forEach(g => genres.add(g.trim()));
      }
      if (movie.director) {
        directors.add(movie.director.trim());
      }
      if (movie.country) {
        countries.add(movie.country.trim());
      }
    });

    return {
      genres: Array.from(genres).sort(),
      directors: Array.from(directors).sort(),
      countries: Array.from(countries).sort()
    };
  }, [movies]);

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('watchlist-filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters(parsed);
        onFiltersChange(parsed);
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
  }, [onFiltersChange]);

  // Save filters to localStorage and notify parent
  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    localStorage.setItem('watchlist-filters', JSON.stringify(newFilters));
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    updateFilters(DEFAULT_FILTERS);
    setDirectorSearch('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.yearRange.min !== DEFAULT_FILTERS.yearRange.min || 
        filters.yearRange.max !== DEFAULT_FILTERS.yearRange.max) count++;
    if (filters.imdbRating.min !== DEFAULT_FILTERS.imdbRating.min || 
        filters.imdbRating.max !== DEFAULT_FILTERS.imdbRating.max) count++;
    if (filters.genres.length > 0) count++;
    if (filters.directors.length > 0) count++;
    if (filters.actors.trim()) count++;
    if (filters.countries.length > 0) count++;
    if (filters.myRating.min !== DEFAULT_FILTERS.myRating.min || 
        filters.myRating.max !== DEFAULT_FILTERS.myRating.max) count++;
    if (filters.status !== DEFAULT_FILTERS.status) count++;
    return count;
  }, [filters]);

  const filteredDirectors = useMemo(() => {
    return filterOptions.directors.filter(director =>
      director.toLowerCase().includes(directorSearch.toLowerCase())
    );
  }, [filterOptions.directors, directorSearch]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-slate-600" />
          <span className="font-medium text-slate-900">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Status</label>
              <div className="space-y-2">
                {(['All', 'To Watch', 'Watching', 'Watched', 'To Watch Again'] as const).map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={filters.status === status}
                      onChange={(e) => updateFilters({ ...filters, status: e.target.value as FilterState['status'] })}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Year Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Year Range</label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1900"
                    max="2025"
                    value={filters.yearRange.min}
                    onChange={(e) => updateFilters({
                      ...filters,
                      yearRange: { ...filters.yearRange, min: parseInt(e.target.value) || 1900 }
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="From"
                  />
                  <input
                    type="number"
                    min="1900"
                    max="2025"
                    value={filters.yearRange.max}
                    onChange={(e) => updateFilters({
                      ...filters,
                      yearRange: { ...filters.yearRange, max: parseInt(e.target.value) || 2025 }
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>

            {/* IMDb Rating */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                IMDb Rating: {filters.imdbRating.min} - {filters.imdbRating.max}
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.imdbRating.min}
                  onChange={(e) => updateFilters({
                    ...filters,
                    imdbRating: { ...filters.imdbRating, min: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.imdbRating.max}
                  onChange={(e) => updateFilters({
                    ...filters,
                    imdbRating: { ...filters.imdbRating, max: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            </div>

            {/* My Rating */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                My Rating: {filters.myRating.min} - {filters.myRating.max}
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={filters.myRating.min}
                  onChange={(e) => updateFilters({
                    ...filters,
                    myRating: { ...filters.myRating, min: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={filters.myRating.max}
                  onChange={(e) => updateFilters({
                    ...filters,
                    myRating: { ...filters.myRating, max: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Genres</label>
              <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                {filterOptions.genres.map(genre => (
                  <label key={genre} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.genres.includes(genre)}
                      onChange={(e) => {
                        const newGenres = e.target.checked
                          ? [...filters.genres, genre]
                          : filters.genres.filter(g => g !== genre);
                        updateFilters({ ...filters, genres: newGenres });
                      }}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{genre}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Directors */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Directors</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={directorSearch}
                    onChange={(e) => setDirectorSearch(e.target.value)}
                    placeholder="Search directors..."
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                  {filteredDirectors.map(director => (
                    <label key={director} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.directors.includes(director)}
                        onChange={(e) => {
                          const newDirectors = e.target.checked
                            ? [...filters.directors, director]
                            : filters.directors.filter(d => d !== director);
                          updateFilters({ ...filters, directors: newDirectors });
                        }}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{director}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Countries */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Countries</label>
              <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                {filterOptions.countries.map(country => (
                  <label key={country} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.countries.includes(country)}
                      onChange={(e) => {
                        const newCountries = e.target.checked
                          ? [...filters.countries, country]
                          : filters.countries.filter(c => c !== country);
                        updateFilters({ ...filters, countries: newCountries });
                      }}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{country}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actors */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Cast/Actors</label>
              <input
                type="text"
                value={filters.actors}
                onChange={(e) => updateFilters({ ...filters, actors: e.target.value })}
                placeholder="Search by actor name..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}