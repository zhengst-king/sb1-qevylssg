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

      // Director filter
      if (filters.directors.length > 0 && movie.director) {
        if (!filters.directors.includes(movie.director.trim())) {
          return false;
        }
      }

      // Country filter
      if (filters.countries.length > 0 && movie.country) {
        if (!filters.countries.includes(movie.country.trim())) {
          return false;
        }
      }

      // Actor filter
      if (filters.actors.trim() && movie.actors) {
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