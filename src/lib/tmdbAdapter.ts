// src/lib/tmdbAdapter.ts
// Adapter to convert TMDB data to OMDB-compatible format
// This minimizes changes to existing components

import { 
  TMDBMovieSearchResult, 
  TMDBTVSearchResult,
  TMDBMovieDetailsFull,
  TMDBTVDetailsFull,
  tmdbService
} from './tmdb';
import { OMDBMovieDetails, OMDBSearchResult } from './omdb';

export class TMDBAdapter {
  /**
   * Convert TMDB movie search result to OMDB-like search result
   */
  static convertMovieSearchResult(tmdbResult: TMDBMovieSearchResult): OMDBSearchResult {
    return {
      Title: tmdbResult.title,
      Year: tmdbResult.release_date ? tmdbResult.release_date.substring(0, 4) : 'N/A',
      imdbID: `tmdb-movie-${tmdbResult.id}`, // Temporary ID, will be replaced with real IMDb ID
      Type: 'movie',
      Poster: tmdbResult.poster_path 
        ? tmdbService.getImageUrl(tmdbResult.poster_path, 'w500')
        : 'N/A'
    };
  }

  /**
   * Convert TMDB TV search result to OMDB-like search result
   */
  static convertTVSearchResult(tmdbResult: TMDBTVSearchResult): OMDBSearchResult {
    return {
      Title: tmdbResult.name,
      Year: tmdbResult.first_air_date ? tmdbResult.first_air_date.substring(0, 4) : 'N/A',
      imdbID: `tmdb-tv-${tmdbResult.id}`, // Temporary ID, will be replaced with real IMDb ID
      Type: 'series',
      Poster: tmdbResult.poster_path 
        ? tmdbService.getImageUrl(tmdbResult.poster_path, 'w500')
        : 'N/A'
    };
  }

  /**
   * Convert TMDB full movie details to OMDB-like format
   */
  static convertMovieToOMDBFormat(tmdbDetails: TMDBMovieDetailsFull): OMDBMovieDetails {
    // Extract director from crew
    const directors = tmdbDetails.credits?.crew
      .filter(c => c.job === 'Director')
      .map(c => c.name) || [];
    const director = directors.length > 0 ? directors.join(', ') : 'N/A';
    
    // Extract writers
    const writers = tmdbDetails.credits?.crew
      .filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story')
      .map(c => c.name) || [];
    // Remove duplicates
    const uniqueWriters = [...new Set(writers)];
    const writer = uniqueWriters.length > 0 ? uniqueWriters.join(', ') : 'N/A';
    
    // Extract top actors (top 5)
    const actors = tmdbDetails.credits?.cast
      .slice(0, 5)
      .map(c => c.name)
      .join(', ') || 'N/A';
    
    // Convert genres array to comma-separated string
    const genre = tmdbDetails.genres && tmdbDetails.genres.length > 0
      ? tmdbDetails.genres.map(g => g.name).join(', ')
      : 'N/A';
    
    // Convert countries array to comma-separated string
    const country = tmdbDetails.production_countries && tmdbDetails.production_countries.length > 0
      ? tmdbDetails.production_countries.map(c => c.name).join(', ')
      : 'N/A';

    // Get language
    const language = tmdbDetails.spoken_languages && tmdbDetails.spoken_languages.length > 0
      ? tmdbDetails.spoken_languages.map(l => l.english_name).join(', ')
      : tmdbDetails.original_language || 'N/A';

    // Production company
    const production = tmdbDetails.production_companies && tmdbDetails.production_companies.length > 0
      ? tmdbDetails.production_companies[0].name
      : 'N/A';

    return {
      Title: tmdbDetails.title,
      Year: tmdbDetails.release_date ? tmdbDetails.release_date.substring(0, 4) : 'N/A',
      Rated: 'N/A', // TMDB doesn't provide this in simple format
      Released: tmdbDetails.release_date || 'N/A',
      Runtime: tmdbDetails.runtime ? `${tmdbDetails.runtime} min` : 'N/A',
      Genre: genre,
      Director: director,
      Writer: writer,
      Actors: actors,
      Plot: tmdbDetails.overview || 'N/A',
      Language: language,
      Country: country,
      Awards: 'N/A', // TMDB doesn't provide this
      Poster: tmdbDetails.poster_path 
        ? tmdbService.getImageUrl(tmdbDetails.poster_path, 'w500')
        : 'N/A',
      Ratings: [
        {
          Source: 'The Movie Database',
          Value: `${tmdbDetails.vote_average.toFixed(1)}/10`
        }
      ],
      Metascore: 'N/A', // TMDB doesn't provide Metascore
      imdbRating: tmdbDetails.vote_average.toFixed(1),
      imdbVotes: tmdbDetails.vote_count.toLocaleString(),
      imdbID: tmdbDetails.external_ids?.imdb_id || 'N/A',
      Type: 'movie',
      DVD: 'N/A',
      BoxOffice: tmdbDetails.revenue > 0 ? `$${tmdbDetails.revenue.toLocaleString()}` : 'N/A',
      Production: production,
      Website: tmdbDetails.homepage || 'N/A',
      Response: 'True'
    };
  }

  /**
   * Convert TMDB full TV details to OMDB-like format
   */
  static convertTVToOMDBFormat(tmdbDetails: TMDBTVDetailsFull): OMDBMovieDetails {
    // Extract creators
    const creators = tmdbDetails.created_by && tmdbDetails.created_by.length > 0
      ? tmdbDetails.created_by.map(c => c.name).join(', ')
      : 'N/A';
    
    // Extract top actors (top 5)
    const actors = tmdbDetails.credits?.cast
      .slice(0, 5)
      .map(c => c.name)
      .join(', ') || 'N/A';
    
    // Convert genres array to comma-separated string
    const genre = tmdbDetails.genres && tmdbDetails.genres.length > 0
      ? tmdbDetails.genres.map(g => g.name).join(', ')
      : 'N/A';
    
    // Convert countries array to comma-separated string
    const country = tmdbDetails.production_countries && tmdbDetails.production_countries.length > 0
      ? tmdbDetails.production_countries.map(c => c.name).join(', ')
      : 'N/A';

    // Get language
    const language = tmdbDetails.spoken_languages && tmdbDetails.spoken_languages.length > 0
      ? tmdbDetails.spoken_languages.map(l => l.english_name).join(', ')
      : tmdbDetails.original_language || 'N/A';

    // Networks
    const production = tmdbDetails.networks && tmdbDetails.networks.length > 0
      ? tmdbDetails.networks.map(n => n.name).join(', ')
      : 'N/A';

    return {
      Title: tmdbDetails.name,
      Year: tmdbDetails.first_air_date ? tmdbDetails.first_air_date.substring(0, 4) : 'N/A',
      Rated: 'N/A',
      Released: tmdbDetails.first_air_date || 'N/A',
      Runtime: 'N/A', // TV series don't have a single runtime
      Genre: genre,
      Director: creators, // Using creators as "director" equivalent
      Writer: creators,
      Actors: actors,
      Plot: tmdbDetails.overview || 'N/A',
      Language: language,
      Country: country,
      Awards: 'N/A',
      Poster: tmdbDetails.poster_path 
        ? tmdbService.getImageUrl(tmdbDetails.poster_path, 'w500')
        : 'N/A',
      Ratings: [
        {
          Source: 'The Movie Database',
          Value: `${tmdbDetails.vote_average.toFixed(1)}/10`
        }
      ],
      Metascore: 'N/A',
      imdbRating: tmdbDetails.vote_average.toFixed(1),
      imdbVotes: tmdbDetails.vote_count.toLocaleString(),
      imdbID: tmdbDetails.external_ids?.imdb_id || 'N/A',
      Type: 'series',
      DVD: 'N/A',
      BoxOffice: 'N/A',
      Production: production,
      Website: tmdbDetails.homepage || 'N/A',
      Response: 'True'
    };
  }

  /**
   * Search both movies and TV series, return combined results in OMDB format
   */
  static async searchAll(query: string, contentType: 'movie' | 'series' | 'all' = 'all'): Promise<OMDBMovieDetails[]> {
    try {
      console.log('[TMDBAdapter] Searching for:', query);

      // Search based on content type
      const [movieResults, tvResults] = await Promise.all([
        contentType === 'series' ? null : tmdbService.searchMovies(query),
        contentType === 'movie' ? null : tmdbService.searchTV(query)
      ]);

      console.log('[TMDBAdapter] Found', movieResults?.results?.length || 0, 'movies');
      console.log('[TMDBAdapter] Found', tvResults?.results?.length || 0, 'TV series');

      const allResults: OMDBMovieDetails[] = [];

      // Process movie results (limit based on contentType)
      if (movieResults && movieResults.results && contentType !== 'series') {
        const movieLimit = contentType === 'movie' ? 15 : 5; // More results when filtering
        const moviePromises = movieResults.results.slice(0, movieLimit).map(async (movie) => {
          try {
            const fullDetails = await tmdbService.getMovieDetailsFull(movie.id);
            if (fullDetails) {
              return this.convertMovieToOMDBFormat(fullDetails);
            }
          } catch (error) {
            console.warn('[TMDBAdapter] Failed to get movie details:', movie.title, error);
          }
          return null;
        });

        const movieDetails = await Promise.all(moviePromises);
        allResults.push(...movieDetails.filter(d => d !== null) as OMDBMovieDetails[]);
      }

      // Process TV results (limit based on contentType)
      if (tvResults && tvResults.results && contentType !== 'movie') {
        const tvLimit = contentType === 'series' ? 15 : 5; // More results when filtering
        const tvPromises = tvResults.results.slice(0, tvLimit).map(async (tv) => {
          try {
            const fullDetails = await tmdbService.getTVDetailsFull(tv.id);
            if (fullDetails) {
              return this.convertTVToOMDBFormat(fullDetails);
            }
          } catch (error) {
            console.warn('[TMDBAdapter] Failed to get TV details:', tv.name, error);
          }
          return null;
        });

        const tvDetails = await Promise.all(tvPromises);
        allResults.push(...tvDetails.filter(d => d !== null) as OMDBMovieDetails[]);
      }

      console.log('[TMDBAdapter] Returning', allResults.length, 'total results');
      return allResults;

    } catch (error) {
      console.error('[TMDBAdapter] Search failed:', error);
      return [];
    }
  }
}