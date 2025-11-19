// src/services/watchlistService.ts
// Centralized service for all watchlist operations
// Eliminates duplicate code across MovieCard, AddToLibraryModal, and Recommendations

import { supabase } from '../lib/supabase';
import { Movie } from '../lib/supabase';
import { buildMovieFromOMDb, buildSeriesFromOMDb } from '../utils/movieDataBuilder';
import { omdbApi } from '../lib/omdb';

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

export const watchlistService = {
  /**
   * Check if a title exists in user's watchlist
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
   * Add a title to user's watchlist with full OMDb enrichment
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
   * Remove a title from user's watchlist
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
   * Get all TMDB IDs in user's watchlist for bulk checking
   * @param userId - User ID (optional, fetches current user if not provided)
   * @returns Set of TMDB IDs
   */
  async getWatchlistTmdbIds(userId?: string): Promise<Set<number>> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Set();
        user_id = user.id;
      }

      const { data } = await supabase
        .from('movies')
        .select('tmdb_id')
        .eq('user_id', user_id)
        .not('tmdb_id', 'is', null);

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