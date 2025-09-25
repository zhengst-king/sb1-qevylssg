// src/hooks/useMovieFilters.ts
import { useMemo } from 'react';
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

export function useMovieFilters(movies: Movie[], filters: FilterState) {
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

      // My rating filter (only apply if movie has a user rating)
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

      // NEW: Updated Director filter to work with search-based approach
      if (filters.directors.length > 0) {
        if (!movie.director) {
          return false; // Exclude if no director info
        }
        
        const movieDirector = movie.director.trim().toLowerCase();
        const hasMatchingDirector = filters.directors.some(filterDirector =>
          movieDirector.includes(filterDirector.toLowerCase())
        );
        
        if (!hasMatchingDirector) {
          return false;
        }
      }

      // NEW: Updated Country filter to work with individual countries
      if (filters.countries.length > 0) {
        if (!movie.country) {
          return false; // Exclude if no country info
        }

        // Split movie countries by various separators
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

        // Check if any movie country matches any selected filter country
        const hasMatchingCountry = filters.countries.some(filterCountry =>
          movieCountries.includes(filterCountry)
        );

        if (!hasMatchingCountry) {
          return false;
        }
      }

      // NEW: Updated Actor filter - exclude titles without cast info
      if (filters.actors.trim()) {
        // IMPORTANT: Return false if movie has no actors info at all
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

  return filteredMovies;
}