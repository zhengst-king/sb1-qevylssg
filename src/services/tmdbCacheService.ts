// src/services/tmdbCacheService.ts
import { supabase } from '../lib/supabase';
import { tmdbService } from '../lib/tmdb';

interface TMDBMovieCache {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  vote_count: number | null;
  overview: string | null;
  media_type: string;
  cached_at: string;
  updated_at: string;
}

export const tmdbCacheService = {
  /**
   * Get movie details from cache or TMDB API
   */
  async getMovieDetails(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<any> {
    // Check cache first
    const { data: cached } = await supabase
      .from('tmdb_movies_cache')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    // If cache exists and is fresh (< 7 days old), return it
    if (cached && !this.isCacheStale(cached.cached_at)) {
      console.log('[tmdbCacheService] Cache HIT for TMDB ID:', tmdbId);
      return this.formatCachedMovie(cached);
    }

    // Cache miss or stale - fetch from TMDB API
    console.log('[tmdbCacheService] Cache MISS for TMDB ID:', tmdbId, '- fetching from API');
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
      const response = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('TMDB API request failed');
      }

      const movieData = await response.json();

      // Update cache
      await this.updateCache(tmdbId, movieData, mediaType);

      return movieData;
    } catch (error) {
      console.error('[tmdbCacheService] Error fetching from TMDB:', error);
      // Return stale cache if available, otherwise throw
      if (cached) {
        console.log('[tmdbCacheService] Returning stale cache for TMDB ID:', tmdbId);
        return this.formatCachedMovie(cached);
      }
      throw error;
    }
  },

  /**
   * Get multiple movies from cache or API
   */
  async getMoviesDetails(tmdbIds: number[]): Promise<any[]> {
    const results = await Promise.all(
      tmdbIds.map(id => this.getMovieDetails(id))
    );
    return results.filter(Boolean);
  },

  /**
   * Update cache with fresh TMDB data
   */
  async updateCache(tmdbId: number, movieData: any, mediaType: string): Promise<void> {
    const cacheData = {
      tmdb_id: tmdbId,
      title: movieData.title || movieData.name,
      poster_path: movieData.poster_path,
      backdrop_path: movieData.backdrop_path,
      release_date: movieData.release_date || movieData.first_air_date,
      vote_average: movieData.vote_average,
      vote_count: movieData.vote_count,
      overview: movieData.overview,
      media_type: mediaType,
      cached_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('tmdb_movies_cache')
      .upsert(cacheData, { onConflict: 'tmdb_id' });

    if (error) {
      console.error('[tmdbCacheService] Error updating cache:', error);
    }
  },

  /**
   * Batch cache collection movies
   */
  async cacheCollectionMovies(collectionId: number): Promise<void> {
    try {
      const collection = await tmdbService.getCollectionDetails(collectionId);
      
      if (collection?.parts) {
        const cachePromises = collection.parts.map(movie => 
          this.updateCache(movie.id, movie, 'movie')
        );
        await Promise.all(cachePromises);
        console.log('[tmdbCacheService] Cached', collection.parts.length, 'movies from collection', collectionId);
      }
    } catch (error) {
      console.error('[tmdbCacheService] Error caching collection:', error);
    }
  },

  /**
   * Check if cache is stale (older than 7 days)
   */
  isCacheStale(cachedAt: string): boolean {
    const cacheDate = new Date(cachedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 7;
  },

  /**
   * Format cached movie for display
   */
  formatCachedMovie(cached: TMDBMovieCache): any {
    return {
      id: cached.tmdb_id,
      title: cached.title,
      name: cached.title,
      poster_path: cached.poster_path,
      backdrop_path: cached.backdrop_path,
      release_date: cached.release_date,
      first_air_date: cached.release_date,
      vote_average: cached.vote_average,
      vote_count: cached.vote_count,
      overview: cached.overview,
      media_type: cached.media_type,
    };
  },
};