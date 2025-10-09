// src/components/FilterPanel.tsx
// FIXED: Added storageKey prop to prevent filter state conflicts between pages

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  pageType?: 'movies' | 'tv-series';
  storageKey?: string; // ✅ ADDED: Allow different storage keys for each page
}

// Dynamic year calculation (current year + 5)
const getCurrentYear = () => new Date().getFullYear();
const getMaxYear = () => getCurrentYear() + 5;

const DEFAULT_FILTERS: FilterState = {
  yearRange: { min: 1900, max: getMaxYear() },
  imdbRating: { min: 0, max: 10 },
  genres: [],
  directors: [],
  actors: '',
  countries: [],
  myRating: { min: 1, max: 10 },
  status: 'All'
};

export function FilterPanel({ 
  movies, 
  onFiltersChange, 
  pageType = 'movies',
  storageKey = 'watchlist-filters' // ✅ FIXED: Default value but can be overridden
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [directorSearch, setDirectorSearch] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks to collapse filter panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

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
        // Handle various country separators
        const countrySeparators = [', ', ',', ' / ', '/', ' | ', '|'];
        let countryList = [movie.country.trim()];
        
        // Split by each separator
        countrySeparators.forEach(separator => {
          const newList: string[] = [];
          countryList.forEach(country => {
            if (country.includes(separator)) {
              newList.push(...country.split(separator).map(c => c.trim()));
            } else {
              newList.push(country);
            }
          });
          countryList = newList;
        });
        
        // Add each individual country
        countryList.forEach(country => {
          if (country && country !== 'N/A') {
            countries.add(country);
          }
        });
      }
    });

    return {
      genres: Array.from(genres).sort(),
      directors: Array.from(directors).sort(),
      countries: Array.from(countries).sort()
    };
  }, [movies]);

  // ✅ FIXED: Load filters from localStorage using the correct storageKey
  useEffect(() => {
    const savedFilters = localStorage.getItem(storageKey);
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        // Update year range max to current dynamic value
        parsed.yearRange.max = Math.max(parsed.yearRange.max, getMaxYear());
        setFilters(parsed);
        // Sync directorSearch with the saved director filter
        if (parsed.directors && parsed.directors.length > 0) {
          setDirectorSearch(parsed.directors[0]);
        }
        onFiltersChange(parsed);
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
  }, [onFiltersChange, storageKey]); // ✅ ADDED: storageKey as dependency

  // Sync directorSearch when filters.directors changes
  useEffect(() => {
    if (filters.directors.length > 0) {
      setDirectorSearch(filters.directors[0]);
    } else {
      setDirectorSearch('');
    }
  }, [filters.directors]);

  // ✅ FIXED: Save filters to localStorage using the correct storageKey
  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    localStorage.setItem(storageKey, JSON.stringify(newFilters)); // ✅ FIXED: Use storageKey prop
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = { ...DEFAULT_FILTERS, yearRange: { min: 1900, max: getMaxYear() } };
    updateFilters(clearedFilters);
    setDirectorSearch('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.yearRange.min !== DEFAULT_FILTERS.yearRange.min || 
        filters.yearRange.max !== getMaxYear()) count++;
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

  // Director filtering logic for search bar
  const handleDirectorSearch = (searchTerm: string) => {
    setDirectorSearch(searchTerm);
    if (searchTerm.trim()) {
      updateFilters({ ...filters, directors: [searchTerm] });
    } else {
      updateFilters({ ...filters, directors: [] });
    }
  };

  // Conditional labels based on page type
  const directorLabel = pageType === 'tv-series' ? 'Creator' : 'Director';
  const directorPlaceholder = pageType === 'tv-series' 
    ? 'Search by creator name...' 
    : 'Search by director name...';

  return (
    <div ref={filterRef} className="bg-white rounded-xl shadow-lg border border-slate-200 mb-8">
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
        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Release Year: {filters.yearRange.min} - {filters.yearRange.max}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1900"
                max={getMaxYear()}
                step="1"
                value={filters.yearRange.min}
                onChange={(e) => updateFilters({
                  ...filters,
                  yearRange: { ...filters.yearRange, min: parseInt(e.target.value) }
                })}
                className="w-full"
              />
              <input
                type="range"
                min="1900"
                max={getMaxYear()}
                step="1"
                value={filters.yearRange.max}
                onChange={(e) => updateFilters({
                  ...filters,
                  yearRange: { ...filters.yearRange, max: parseInt(e.target.value) }
                })}
                className="w-full"
              />
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

          {/* Directors/Creators */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">{directorLabel}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={directorSearch}
                onChange={(e) => handleDirectorSearch(e.target.value)}
                placeholder={directorPlaceholder}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={filters.actors}
                onChange={(e) => updateFilters({ ...filters, actors: e.target.value })}
                placeholder="Search by actor name..."
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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