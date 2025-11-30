// src/services/watchlistService.ts
// Enhanced watchlist service with TMDB-based operations
// Centralized service for all watchlist operations across the app

import { supabase } from '../lib/supabase';
import { Movie } from '../lib/supabase';
import { buildMovieFromOMDb, buildSeriesFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder';
import { omdbApi } from '../lib/omdb';
import { tmdbService } from '../lib/tmdb';

interface AddToWatchlistParams {
  title: string;
  year?: number;
  imdb_id: string;
  tmdb_id?: number;
  poster_url?: string;
  plot?: string;
  imdb_score?: number;
  media_type: 'movie' | 'series';
  status?: Movie['status'];
}

interface AddToWatchlistFromTmdbParams {
  tmdbId: number;
  title: string;
  mediaType: 'movie' | 'tv';
  year?: number;
  posterPath?: string | null;
  overview?: string;
  voteAverage?: number;
  releaseDate?: string;
  firstAirDate?: string;
  status?: Movie['status'];
}

export const watchlistService = {
  /**
   * Check if a title exists in user's watchlist by IMDb ID
   * @param imdb_id - IMDb ID to check
   * @param userId - User ID (optional, fetches current user if not provided)
   * @returns true if in watchlist, false otherwise
   */
  async checkIfInWatchlist(imdb_id: string, userId?: string): Promise<boolean> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        user_id = user.id;
      }

      const { data } = await supabase
        .from('movies')
        .select('id')
        .eq('user_id', user_id)
        .eq('imdb_id', imdb_id)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('[watchlistService] Error checking watchlist:', error);
      return false;
    }
  },

  /**
   * Check if a title exists in user's watchlist by TMDB ID
   * @param tmdbId - TMDB ID to check
   * @param mediaType - Media type ('movie' or 'series')
   * @param userId - User ID (optional, fetches current user if not provided)
   * @returns true if in watchlist, false otherwise
   */
  async checkIfInWatchlistByTmdb(
    tmdbId: number, 
    mediaType: 'movie' | 'series',
    userId?: string
  ): Promise<boolean> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        user_id = user.id;
      }

      const { data } = await supabase
        .from('movies')
        .select('id')
        .eq('user_id', user_id)
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('[watchlistService] Error checking watchlist by TMDB:', error);
      return false;
    }
  },

  /**
   * Add a title to user's watchlist with full OMDb enrichment (IMDb-based)
   * @param params - Basic movie/series data
   * @returns The inserted movie record, or null if failed
   */
  async addToWatchlist(params: AddToWatchlistParams): Promise<Movie | null> {
    try {
      console.log('[watchlistService] Adding to watchlist:', params.title);
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('[watchlistService] User not authenticated:', authError);
        throw new Error('Please sign in to add titles to your watchlist.');
      }

      // Check if already in watchlist
      const exists = await this.checkIfInWatchlist(params.imdb_id, user.id);
      if (exists) {
        console.log('[watchlistService] Already in watchlist, skipping');
        return null;
      }

      // Fetch OMDb enrichment
      let omdbDetails = null;
      try {
        console.log('[watchlistService] Fetching OMDb enrichment for:', params.title);
        omdbDetails = await omdbApi.getMovieDetails(params.imdb_id);
      } catch (omdbError) {
        console.warn('[watchlistService] OMDb enrichment failed:', omdbError);
        // Continue without enrichment
      }

      // Build complete movie/series object using centralized builder
      let movieData;
      if (params.media_type === 'series') {
        movieData = buildSeriesFromOMDb(
          {
            title: params.title,
            year: params.year,
            imdb_id: params.imdb_id,
            tmdb_id: params.tmdb_id,
            poster_url: params.poster_url,
            plot: params.plot,
            imdb_score: params.imdb_score,
            status: params.status || 'To Watch'
          },
          omdbDetails
        );
      } else {
        movieData = buildMovieFromOMDb(
          {
            title: params.title,
            year: params.year,
            imdb_id: params.imdb_id,
            tmdb_id: params.tmdb_id,
            poster_url: params.poster_url,
            plot: params.plot,
            imdb_score: params.imdb_score,
            media_type: 'movie',
            status: params.status || 'To Watch'
          },
          omdbDetails
        );
      }

      // Insert into database
      const { data: insertedMovie, error: insertError } = await supabase
        .from('movies')
        .insert([{
          ...movieData,
          user_id: user.id
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[watchlistService] Insert error:', insertError);
        throw insertError;
      }

      console.log('[watchlistService] Successfully added to watchlist:', insertedMovie.title);
      return insertedMovie;

    } catch (error) {
      console.error('[watchlistService] Add to watchlist failed:', error);
      throw error;
    }
  },

  /**
   * Add a title to watchlist using TMDB data (auto-fetches IMDb ID)
   * @param params - TMDB-based movie/series data
   * @returns The inserted movie record, or null if failed
   */
  async addToWatchlistFromTmdb(params: AddToWatchlistFromTmdbParams): Promise<Movie | null> {
    try {
      console.log('[watchlistService] Adding from TMDB:', params.title);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Please sign in to add titles to your watchlist.');
      }

      // Check if already in watchlist by TMDB ID
      const mediaType = params.mediaType === 'tv' ? 'series' : 'movie';
      const exists = await this.checkIfInWatchlistByTmdb(params.tmdbId, mediaType, user.id);
      if (exists) {
        console.log('[watchlistService] Already in watchlist (by TMDB ID)');
        return null;
      }

      // Get IMDb ID from TMDB
      const imdbId = await getIMDbIdFromTMDB(params.tmdbId, params.mediaType);
      
      if (!imdbId) {
        console.warn('[watchlistService] No IMDb ID found for TMDB:', params.tmdbId);
      }

      // Fetch OMDb enrichment (if IMDb ID available)
      let omdbDetails = null;
      if (imdbId) {
        try {
          console.log('[watchlistService] Fetching OMDb enrichment');
          omdbDetails = await omdbApi.getMovieDetails(imdbId);
        } catch (omdbError) {
          console.warn('[watchlistService] OMDb enrichment failed:', omdbError);
        }
      }

      // Extract year from dates
      const year = params.year || 
                   (params.releaseDate ? new Date(params.releaseDate).getFullYear() : undefined) ||
                   (params.firstAirDate ? new Date(params.firstAirDate).getFullYear() : undefined);

      // Build poster URL
      const posterUrl = params.posterPath 
        ? tmdbService.getImageUrl(params.posterPath, 'w342')
        : undefined;

      // Build complete movie/series object
      let movieData;
      if (params.mediaType === 'tv') {
        movieData = buildSeriesFromOMDb(
          {
            title: params.title,
            year,
            imdb_id: imdbId || `tmdb_${params.tmdbId}`,
            tmdb_id: params.tmdbId,
            poster_url: posterUrl,
            plot: params.overview,
            imdb_score: params.voteAverage,
            status: params.status || 'To Watch'
          },
          omdbDetails
        );
      } else {
        movieData = buildMovieFromOMDb(
          {
            title: params.title,
            year,
            imdb_id: imdbId || `tmdb_${params.tmdbId}`,
            tmdb_id: params.tmdbId,
            poster_url: posterUrl,
            plot: params.overview,
            imdb_score: params.voteAverage,
            media_type: 'movie',
            status: params.status || 'To Watch'
          },
          omdbDetails
        );
      }

      // Insert into database
      const { data: insertedMovie, error: insertError } = await supabase
        .from('movies')
        .insert([{
          ...movieData,
          user_id: user.id
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[watchlistService] Insert error:', insertError);
        throw insertError;
      }

      console.log('[watchlistService] Successfully added from TMDB:', insertedMovie.title);
      return insertedMovie;

    } catch (error) {
      console.error('[watchlistService] Add from TMDB failed:', error);
      throw error;
    }
  },

  /**
   * Remove a title from user's watchlist by IMDb ID
   * @param imdb_id - IMDb ID to remove
   * @param userId - User ID (optional, fetches current user if not provided)
   */
  async removeFromWatchlist(imdb_id: string, userId?: string): Promise<void> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        user_id = user.id;
      }

      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('user_id', user_id)
        .eq('imdb_id', imdb_id);

      if (error) throw error;

      console.log('[watchlistService] Removed from watchlist:', imdb_id);
    } catch (error) {
      console.error('[watchlistService] Remove from watchlist failed:', error);
      throw error;
    }
  },

  /**
   * Remove a title from user's watchlist by TMDB ID
   * @param tmdbId - TMDB ID to remove
   * @param mediaType - Media type ('movie' or 'series')
   * @param userId - User ID (optional, fetches current user if not provided)
   */
  async removeFromWatchlistByTmdb(
    tmdbId: number,
    mediaType: 'movie' | 'series',
    userId?: string
  ): Promise<void> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        user_id = user.id;
      }

      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('user_id', user_id)
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType);

      if (error) throw error;

      console.log('[watchlistService] Removed from watchlist by TMDB:', tmdbId);
    } catch (error) {
      console.error('[watchlistService] Remove by TMDB failed:', error);
      throw error;
    }
  },

  /**
   * Toggle watchlist status (add if not present, remove if present) using TMDB data
   * @param params - TMDB-based movie/series data
   * @returns { added: boolean, movie: Movie | null }
   */
  async toggleWatchlistByTmdb(
    params: AddToWatchlistFromTmdbParams
  ): Promise<{ added: boolean; movie: Movie | null }> {
    try {
      const mediaType = params.mediaType === 'tv' ? 'series' : 'movie';
      
      // Check if in watchlist
      const isInWatchlist = await this.checkIfInWatchlistByTmdb(params.tmdbId, mediaType);

      if (isInWatchlist) {
        // Remove from watchlist
        await this.removeFromWatchlistByTmdb(params.tmdbId, mediaType);
        return { added: false, movie: null };
      } else {
        // Add to watchlist
        const movie = await this.addToWatchlistFromTmdb(params);
        return { added: true, movie };
      }
    } catch (error) {
      console.error('[watchlistService] Toggle watchlist failed:', error);
      throw error;
    }
  },

  /**
   * Get all TMDB IDs in user's watchlist for bulk checking
   * @param mediaType - Optional filter by media type
   * @param userId - User ID (optional, fetches current user if not provided)
   * @returns Set of TMDB IDs
   */
  async getWatchlistTmdbIds(
    mediaType?: 'movie' | 'series',
    userId?: string
  ): Promise<Set<number>> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Set();
        user_id = user.id;
      }

      let query = supabase
        .from('movies')
        .select('tmdb_id')
        .eq('user_id', user_id)
        .not('tmdb_id', 'is', null);

      if (mediaType) {
        query = query.eq('media_type', mediaType);
      }

      const { data } = await query;

      const tmdbIds = new Set<number>();
      data?.forEach(item => {
        if (item.tmdb_id) tmdbIds.add(item.tmdb_id);
      });

      return tmdbIds;
    } catch (error) {
      console.error('[watchlistService] Error fetching watchlist IDs:', error);
      return new Set();
    }
  }
};