// src/lib/tmdb.ts
// TMDB API service with Supabase server-side caching

import { supabase } from './supabase';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface RegionalWatchProviders {
  link?: string;
  flatrate?: WatchProvider[];
  buy?: WatchProvider[];
  rent?: WatchProvider[];
}

export interface WatchProvidersData {
  results: {
    [regionCode: string]: RegionalWatchProviders;
  };
}

export interface TMDBTVSeriesDetails {
  id: number;
  name: string;
  overview: string;
  created_by: Array<{
    id: number;
    name: string;
    profile_path: string | null;
  }>;
  first_air_date: string;
  last_air_date: string;
  homepage: string;
  status: string;
  networks: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  keywords?: {
    results: Array<{
      id: number;
      name: string;
    }>;
  };
  videos?: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
  external_ids?: {
    imdb_id: string;
    tvdb_id: number;
  };
  watch_providers?: WatchProvidersData;
}

interface CachedTMDBData {
  imdb_id: string;
  tmdb_id: number;
  name: string;
  overview: string;
  homepage: string;
  status: string;
  first_air_date: string;
  last_air_date: string;
  created_by: any;
  networks: any;
  production_companies: any;
  production_countries: any;
  keywords: any;
  videos: any;
  external_ids: any;
  api_response: any;
  last_fetched_at: string;
  last_accessed_at: string;
  access_count: number;
  imdb_rating: number | null;
  calculated_ttl_days: number | null;
}

class TMDBService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = TMDB_BASE_URL;
    
    if (!apiKey) {
      console.warn('[TMDB] API key not configured. Set VITE_TMDB_API_KEY in environment.');
    }
  }

  /**
   * Get TV series data from cache or fetch from API
   */
  async getTVSeriesByImdbId(imdbId: string): Promise<TMDBTVSeriesDetails | null> {
    try {
      // First, check Supabase cache
      const cached = await this.getFromCache(imdbId);
      if (cached) {
        console.log('[TMDB] Cache hit for:', imdbId);
        await this.updateAccessTime(imdbId);
        return this.formatCachedData(cached);
      }

      console.log('[TMDB] Cache miss, fetching from API:', imdbId);

      // Find TMDB ID from IMDb ID
      const tmdbId = await this.findByImdbId(imdbId);
      if (!tmdbId) {
        console.warn('[TMDB] Could not find TMDB ID for IMDb ID:', imdbId);
        return null;
      }

      // Fetch from TMDB API
      const data = await this.getTVSeriesDetails(tmdbId);
      if (!data) {
        return null;
      }

      // Store in cache
      await this.saveToCache(imdbId, tmdbId, data);

      return data;
    } catch (error) {
      console.error('[TMDB] Error getting TV series by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Get cached data from Supabase
   */
  private async getFromCache(imdbId: string): Promise<CachedTMDBData | null> {
    try {
      const { data, error } = await supabase
        .from('tmdb_series_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - this is expected for cache misses
          return null;
        }
        console.error('[TMDB] Cache lookup error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[TMDB] Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Update access time for cache management
   */
  private async updateAccessTime(imdbId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_tmdb_cache_access', {
        p_imdb_id: imdbId
      });

      if (error) {
        console.error('[TMDB] Error updating access time:', error);
      }
    } catch (error) {
      console.error('[TMDB] Access time update error:', error);
    }
  }

  /**
   * Save data to Supabase cache
   */
  private async saveToCache(
    imdbId: string, 
    tmdbId: number, 
    data: TMDBTVSeriesDetails
  ): Promise<void> {
    try {
      const cacheEntry = {
        imdb_id: imdbId,
        tmdb_id: tmdbId,
        name: data.name,
        overview: data.overview,
        homepage: data.homepage,
        status: data.status,
        first_air_date: data.first_air_date,
        last_air_date: data.last_air_date,
        created_by: data.created_by,
        networks: data.networks,
        production_companies: data.production_companies,
        production_countries: data.production_countries,
        keywords: data.keywords?.results || [],
        videos: data.videos?.results || [],
        external_ids: data.external_ids,
        api_response: data,
        last_fetched_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        access_count: 1,
        fetch_success: true
      };

      const { error } = await supabase
        .from('tmdb_series_cache')
        .upsert(cacheEntry, {
          onConflict: 'imdb_id'
        });

      if (error) {
        console.error('[TMDB] Error saving to cache:', error);
      } else {
        console.log('[TMDB] Saved to cache:', imdbId);
      }
    } catch (error) {
      console.error('[TMDB] Cache save error:', error);
    }
  }

  /**
   * Format cached data to match API response structure
   */
  private formatCachedData(cached: CachedTMDBData): TMDBTVSeriesDetails {
    return {
      id: cached.tmdb_id,
      name: cached.name,
      overview: cached.overview,
      homepage: cached.homepage,
      status: cached.status,
      first_air_date: cached.first_air_date,
      last_air_date: cached.last_air_date,
      created_by: cached.created_by || [],
      networks: cached.networks || [],
      production_companies: cached.production_companies || [],
      production_countries: cached.production_countries || [],
      keywords: {
        results: cached.keywords || []
      },
      videos: {
        results: cached.videos || []
      },
      external_ids: cached.external_ids
    };
  }

  /**
   * Search for TV series by IMDb ID (direct API call, not cached)
   */
  private async findByImdbId(imdbId: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/find/${imdbId}?api_key=${this.apiKey}&external_source=imdb_id`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Find by IMDb ID failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.tv_results?.[0]?.id || null;
    } catch (error) {
      console.error('[TMDB] Error finding TV series by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Get TV series details from TMDB API (direct API call)
   */
  private async getTVSeriesDetails(tmdbId: number): Promise<TMDBTVSeriesDetails | null> {
    try {
      const url = `${this.baseUrl}/tv/${tmdbId}?api_key=${this.apiKey}&append_to_response=videos,keywords,external_ids`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Get TV series details failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting TV series details:', error);
      return null;
    }
  }

  /**
   * Update cached entry with IMDb rating (for smart TTL calculation)
   */
  async updateCacheRating(imdbId: string, rating: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('tmdb_series_cache')
        .update({ imdb_rating: rating })
        .eq('imdb_id', imdbId);

      if (error) {
        console.error('[TMDB] Error updating cache rating:', error);
      } else {
        console.log('[TMDB] Updated cache rating for:', imdbId);
      }
    } catch (error) {
      console.error('[TMDB] Cache rating update error:', error);
    }
  }

  // In TMDBService class
  async getWatchProviders(tmdbId: number): Promise<WatchProvidersData | null> {
    try {
      const url = `${this.baseUrl}/tv/${tmdbId}/watch/providers?api_key=${this.apiKey}`;
      const response = await fetch(url);
    
      if (!response.ok) {
        console.error('[TMDB] Get watch providers failed:', response.status);
        return null;
      }
    
      return await response.json();
    } catch (error) {
      console.error('[TMDB] Error getting watch providers:', error);
      return null;
    }
  }

  /**
   * Get image URL helper
   */
  getImageUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'original' = 'w185'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  /**
   * Get YouTube trailer URL
   */
  getTrailerUrl(key: string): string {
    return `https://www.youtube.com/watch?v=${key}`;
  }

  /**
   * Get YouTube embed URL
   */
  getTrailerEmbedUrl(key: string): string {
    return `https://www.youtube.com/embed/${key}`;
  }

  /**
   * Clear cache for a specific series (useful for debugging)
   */
  async clearCacheForSeries(imdbId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tmdb_series_cache')
        .delete()
        .eq('imdb_id', imdbId);

      if (error) {
        console.error('[TMDB] Error clearing cache:', error);
      } else {
        console.log('[TMDB] Cache cleared for:', imdbId);
      }
    } catch (error) {
      console.error('[TMDB] Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('tmdb_cache_overview')
        .select('*');

      if (error) {
        console.error('[TMDB] Error getting cache stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[TMDB] Cache stats error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tmdbService = new TMDBService(TMDB_API_KEY);