// src/utils/movieDataBuilder.ts
// UPDATED VERSION - Now includes tmdb_id field
// Centralized utility for building movie objects with OMDb enrichment

import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { Movie } from '../lib/supabase';

/**
 * Builds a complete movie object ready for database insertion
 * Combines base TMDB data with optional OMDb enrichment
 * 
 * @param baseData - Core movie fields from TMDB
 * @param omdbDetails - Optional OMDb API response for enrichment
 * @returns Complete movie object with all fields properly parsed
 */
export function buildMovieFromOMDb(
  baseData: {
    title: string;
    year?: number;
    imdb_id: string;
    tmdb_id?: number; // ✅ NEW: Optional TMDB ID
    poster_url?: string;
    plot?: string;
    imdb_score?: number;
    media_type: 'movie' | 'series';
    status?: string;
  },
  omdbDetails: OMDBMovieDetails | null
): Omit<Movie, 'id' | 'user_id' | 'user_session' | 'created_at'> {
  
  // Start with base data
  const movieData: any = {
    media_type: baseData.media_type,
    title: baseData.title,
    year: baseData.year || null,
    imdb_id: baseData.imdb_id,
    tmdb_id: baseData.tmdb_id || null, // ✅ NEW: Include TMDB ID
    poster_url: baseData.poster_url || null,
    plot: baseData.plot || null,
    imdb_score: baseData.imdb_score || null,
    status: baseData.status || 'To Watch',
  };

  // Enrich with OMDb data if available
  if (omdbDetails && omdbDetails.Response === 'True') {
    console.log('[movieDataBuilder] Enriching with OMDb data for:', baseData.title);

    // Runtime (parsed to number)
    if (omdbDetails.Runtime && omdbDetails.Runtime !== 'N/A') {
      movieData.runtime = omdbApi.parseRuntime(omdbDetails.Runtime);
    }

    // Box Office (parsed to number)
    if (omdbDetails.BoxOffice && omdbDetails.BoxOffice !== 'N/A') {
      movieData.box_office = omdbApi.parseBoxOffice(omdbDetails.BoxOffice);
    }

    // IMDb Rating (use OMDb if not already set)
    if (omdbDetails.imdbRating && omdbDetails.imdbRating !== 'N/A' && !movieData.imdb_score) {
      movieData.imdb_score = omdbApi.parseRating(omdbDetails.imdbRating);
    }

    // Director
    if (omdbDetails.Director && omdbDetails.Director !== 'N/A') {
      movieData.director = omdbDetails.Director;
    }

    // Actors
    if (omdbDetails.Actors && omdbDetails.Actors !== 'N/A') {
      movieData.actors = omdbDetails.Actors;
    }

    // Country
    if (omdbDetails.Country && omdbDetails.Country !== 'N/A') {
      movieData.country = omdbDetails.Country;
    }

    // Language
    if (omdbDetails.Language && omdbDetails.Language !== 'N/A') {
      movieData.language = omdbDetails.Language;
    }

    // Genre
    if (omdbDetails.Genre && omdbDetails.Genre !== 'N/A') {
      movieData.genre = omdbDetails.Genre;
    }

    // Production
    if (omdbDetails.Production && omdbDetails.Production !== 'N/A') {
      movieData.production = omdbDetails.Production;
    }

    // Writer
    if (omdbDetails.Writer && omdbDetails.Writer !== 'N/A') {
      movieData.writer = omdbDetails.Writer;
    }

    // Awards
    if (omdbDetails.Awards && omdbDetails.Awards !== 'N/A') {
      movieData.awards = omdbDetails.Awards;
    }

    // Plot (use OMDb if not already set)
    if (omdbDetails.Plot && omdbDetails.Plot !== 'N/A' && !movieData.plot) {
      movieData.plot = omdbDetails.Plot;
    }

    // Rated (MPAA rating)
    if (omdbDetails.Rated && omdbDetails.Rated !== 'N/A') {
      movieData.rated = omdbDetails.Rated;
    }

    // Released date
    if (omdbDetails.Released && omdbDetails.Released !== 'N/A') {
      movieData.released = omdbDetails.Released;
    }

    // Metascore
    if (omdbDetails.Metascore && omdbDetails.Metascore !== 'N/A') {
      const metascore = parseInt(omdbDetails.Metascore);
      if (!isNaN(metascore)) {
        movieData.metascore = metascore;
      }
    }

    // IMDb Votes
    if (omdbDetails.imdbVotes && omdbDetails.imdbVotes !== 'N/A') {
      movieData.imdb_votes = omdbDetails.imdbVotes;
    }

    // Website
    if (omdbDetails.Website && omdbDetails.Website !== 'N/A') {
      movieData.website = omdbDetails.Website;
    }

    console.log('[movieDataBuilder] OMDb enrichment complete. Fields added:', 
      Object.keys(movieData).filter(k => !['title', 'year', 'imdb_id', 'tmdb_id', 'poster_url', 'media_type', 'status'].includes(k))
    );
  } else {
    console.log('[movieDataBuilder] No OMDb data available, using TMDB data only for:', baseData.title);
  }

  return movieData as Omit<Movie, 'id' | 'user_id' | 'user_session' | 'created_at'>;
}

/**
 * Helper function to fetch TMDB details and extract IMDb ID
 * Used in components that only have TMDB ID initially
 */
export async function getIMDbIdFromTMDB(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  try {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${apiKey}&append_to_response=external_ids`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const details = await response.json();
    return details.external_ids?.imdb_id || null;
  } catch (error) {
    console.error('[movieDataBuilder] Error fetching IMDb ID:', error);
    return null;
  }
}

/**
 * Convenience function that combines TMDB data fetching + OMDb enrichment