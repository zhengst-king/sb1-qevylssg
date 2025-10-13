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

export interface TMDBCastMember {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  cast_id?: number;
  character: string;
  credit_id: string;
  order: number;
}

export interface TMDBCrewMember {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  credit_id: string;
  department: string;
  job: string;
}

export interface TMDBSeriesCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
  id: number;
}

// ✅ NEW: Recommendations interfaces
export interface TMDBRecommendation {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  name: string;
  original_language: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  media_type: string;
  genre_ids: number[];
  popularity: number;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  origin_country: string[];
}

export interface TMDBRecommendationsResponse {
  page: number;
  results: TMDBRecommendation[];
  total_pages: number;
  total_results: number;
}

export interface TMDBTVSeriesDetails {
  id: number;
  name: string;
  overview: string;
  homepage: string | null;
  status: string;
  first_air_date: string;
  last_air_date: string | null;
  created_by: Array<{
    id: number;
    name: string;
    profile_path: string | null;
  }>;
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
  keywords: {
    results: Array<{
      id: number;
      name: string;
    }>;
  };
  videos: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
  external_ids: {
    imdb_id: string;
    tvdb_id: number | null;
  };
  'watch/providers'?: WatchProvidersData;
  credits?: TMDBSeriesCredits;
  // ✅ NEW: Add recommendations and similar
  recommendations?: TMDBRecommendationsResponse;
  similar?: TMDBRecommendationsResponse;
}

// Movie-specific interfaces (add these after TMDBRecommendationsResponse)
export interface TMDBMovieRecommendation {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  title: string; // Movies use 'title' instead of 'name'
  original_language: string;
  original_title: string; // Movies use 'original_title' instead of 'original_name'
  overview: string;
  poster_path: string | null;
  media_type: string;
  genre_ids: number[];
  popularity: number;
  release_date: string; // Movies use 'release_date' instead of 'first_air_date'
  vote_average: number;
  vote_count: number;
  video: boolean;
}

export interface TMDBMovieRecommendationsResponse {
  page: number;
  results: TMDBMovieRecommendation[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  homepage: string | null;
  status: string;
  release_date: string;
  runtime: number | null;
  recommendations?: TMDBMovieRecommendationsResponse;
  similar?: TMDBMovieRecommendationsResponse;
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
  watch_providers: any;
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  // ✅ NEW: Add recommendations and similar
  recommendations?: TMDBRecommendationsResponse;
  similar?: TMDBRecommendationsResponse;
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
   * Main entry point: Get TV series data by IMDb ID with caching
   */
  async getTVSeriesByImdbId(imdbId: string): Promise<TMDBTVSeriesDetails | null> {
    if (!this.apiKey) {
      console.error('[TMDB] API key not configured');
      return null;
    }

    try {
      console.log('[TMDB] Looking up series:', imdbId);

      // Check cache first
      const cached = await this.getCachedData(imdbId);
      if (cached) {
        console.log('[TMDB] Cache hit for:', imdbId);
        console.log('[TMDB] Cached watch providers:', cached.watch_providers ? 'EXISTS' : 'NULL');
        await this.updateLastAccessed(imdbId);
        return this.formatCachedData(cached);
      }

      console.log('[TMDB] Cache miss, fetching from API');

      // Find TMDB ID from IMDb ID
      const tmdbId = await this.findByImdbId(imdbId);
      if (!tmdbId) {
        console.error('[TMDB] TV series not found for IMDb ID:', imdbId);
        return null;
      }

      console.log('[TMDB] Found TMDB ID:', tmdbId);

      // Get full details with watch providers
      const details = await this.getTVSeriesDetails(tmdbId);
      if (!details) {
        console.error('[TMDB] Failed to get series details');
        return null;
      }

      // CRITICAL FIX: Extract watch providers from the response
      const watchProviders = details['watch/providers'];
      console.log('[TMDB] Watch providers from API:', watchProviders ? 'FOUND' : 'NOT FOUND');
      if (watchProviders?.results) {
        const regions = Object.keys(watchProviders.results);
        console.log('[TMDB] Available regions:', regions);
        console.log('[TMDB] Sample region data (US):', watchProviders.results.US ? 'has data' : 'no US data');
      }

      // Save to cache with watch providers explicitly passed
      await this.saveToCacheMVP(imdbId, details, watchProviders);

      // Return details with watch providers properly attached
      return details;
    } catch (error) {
      console.error('[TMDB] Error in getTVSeriesByImdbId:', error);
      return null;
    }
  }

  /**
   * Get cached data from Supabase
   */
  private async getCachedData(imdbId: string): Promise<CachedTMDBData | null> {
    try {
      // Get the most recent cache entry for this IMDb ID
      const { data, error } = await supabase
        .from('tmdb_series_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .order('last_fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - this is normal
          console.log('[TMDB] No cache found for:', imdbId);
          return null;
        }
        console.error('[TMDB] Error reading cache:', error);
        return null;
      }

      if (data) {
        console.log('[TMDB] Cache data retrieved for:', imdbId);
        console.log('[TMDB] Cache has watch_providers:', !!data.watch_providers);
        console.log('[TMDB] Last fetched:', data.last_fetched_at);
      }

      return data;
    } catch (error) {
      console.error('[TMDB] Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Update last accessed timestamp
   */
  private async updateLastAccessed(imdbId: string): Promise<void> {
    try {
      // First get current access count
      const { data: currentData } = await supabase
        .from('tmdb_series_cache')
        .select('access_count')
        .eq('imdb_id', imdbId)
        .single();

      const newAccessCount = (currentData?.access_count || 0) + 1;

      const { error } = await supabase
        .from('tmdb_series_cache')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: newAccessCount
        })
        .eq('imdb_id', imdbId);

      if (error) {
        console.error('[TMDB] Error updating last accessed:', error);
      }
    } catch (error) {
      console.error('[TMDB] Last accessed update error:', error);
    }
  }

  /**
   * Save data to cache (MVP version - simple save)
   */
  private async saveToCacheMVP(
    imdbId: string, 
    details: TMDBTVSeriesDetails,
    watchProviders?: WatchProvidersData
  ): Promise<void> {
    try {
      // CRITICAL FIX: Extract watch providers from the API response
      // The API returns it as 'watch/providers' (with slash)
      const extractedWatchProviders = watchProviders || details['watch/providers'] || null;
      
      console.log('[TMDB] Saving to cache...');
      console.log('[TMDB] Watch providers being saved:', extractedWatchProviders ? 'EXISTS' : 'NULL');
      
      if (extractedWatchProviders) {
        console.log('[TMDB] Watch providers regions:', Object.keys(extractedWatchProviders.results || {}));
      }
      
      const cacheEntry = {
        imdb_id: imdbId,
        tmdb_id: details.id,
        name: details.name,
        overview: details.overview,
        homepage: details.homepage,
        status: details.status,
        first_air_date: details.first_air_date,
        last_air_date: details.last_air_date,
        created_by: details.created_by,
        networks: details.networks,
        production_companies: details.production_companies,
        production_countries: details.production_countries,
        keywords: details.keywords?.results || [],
        videos: details.videos?.results || [],
        external_ids: details.external_ids,
        // CRITICAL: Save watch providers with correct structure
        watch_providers: extractedWatchProviders,
        credits: details.credits ? {
          cast: details.credits.cast,
          crew: details.credits.crew
        } : undefined,
        // ✅ NEW: Save recommendations and similar
        recommendations: details.recommendations,
        similar: details.similar,
        api_response: details,
        last_fetched_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        access_count: 1
      };

      const { error } = await supabase
        .from('tmdb_series_cache')
        .upsert(cacheEntry, {
          onConflict: 'imdb_id'
        });

      if (error) {
        console.error('[TMDB] ❌ Error saving to cache:', error);
        console.error('[TMDB] Failed entry:', cacheEntry);
      } else {
        console.log('[TMDB] ✅ Successfully saved to cache:', imdbId);
        console.log('[TMDB] ✅ Watch providers saved:', !!extractedWatchProviders);
      }
    } catch (error) {
      console.error('[TMDB] Cache save error:', error);
    }
  }

  /**
   * Format cached data to match API response structure
   */
  private formatCachedData(cached: CachedTMDBData): TMDBTVSeriesDetails {
    console.log('[TMDB] Formatting cached data for:', cached.imdb_id);
    console.log('[TMDB] Cached watch_providers exists:', !!cached.watch_providers);
    
    if (cached.watch_providers) {
      console.log('[TMDB] Cached watch_providers structure:', Object.keys(cached.watch_providers));
    }

    const formatted: TMDBTVSeriesDetails = {
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
      external_ids: cached.external_ids,
      // FIX: Properly return watch providers from cache
      'watch/providers': cached.watch_providers || undefined,
      credits: cached.credits ? {
        cast: cached.credits.cast || [],
        crew: cached.credits.crew || [],
        id: cached.tmdb_id
      } : undefined,
      // ✅ NEW: Return recommendations and similar from cache
      recommendations: cached.recommendations,
      similar: cached.similar
    };

    console.log('[TMDB] Formatted data has watch/providers:', !!(formatted['watch/providers']));
    console.log('[TMDB] Formatted data has credits:', !!(formatted.credits));
    
    return formatted;
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
      // ✅ UPDATED: Add recommendations and similar to append_to_response
      const url = `${this.baseUrl}/tv/${tmdbId}?api_key=${this.apiKey}&append_to_response=videos,keywords,external_ids,watch/providers,credits,recommendations,similar`;
      console.log('[TMDB] Fetching URL:', url);
    
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Get TV series details failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[TMDB] API Response received');
      console.log('[TMDB] Watch providers in response:', data['watch/providers']);
      console.log('[TMDB] Credits in response:', data.credits ? `${data.credits.cast?.length} cast members` : 'No credits');
      // ✅ NEW: Log recommendations and similar
      console.log('[TMDB] Recommendations in response:', data.recommendations ? `${data.recommendations.results?.length} items` : 'No recommendations');
      console.log('[TMDB] Similar titles in response:', data.similar ? `${data.similar.results?.length} items` : 'No similar');
    
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting TV series details:', error);
      return null;
    }
  }

  /**
   * Get profile image URL for cast members
   */
  getProfileImageUrl(profilePath: string | null, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185'): string | null {
    if (!profilePath) return null;
    return `https://image.tmdb.org/t/p/${size}${profilePath}`;
  }

  /**
   * Get watch providers separately (if needed)
   */
  async getWatchProviders(tmdbId: number): Promise<WatchProvidersData | null> {
    try {
      const url = `${this.baseUrl}/tv/${tmdbId}/watch/providers?api_key=${this.apiKey}`;
      const response = await fetch(url);
    
      if (!response.ok) {
        console.error('[TMDB] Get watch providers failed:', response.status);
        return null;
      }
    
      const data = await response.json();
      console.log('[TMDB] Watch providers standalone call:', data);
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting watch providers:', error);
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

  /**
   * Get movie details with recommendations by IMDb ID
   */
  async getMovieByImdbId(imdbId: string): Promise<TMDBMovieDetails | null> {
    if (!this.apiKey) {
      console.error('[TMDB] API key not configured');
      return null;
    }

    try {
      console.log('[TMDB] Looking up movie:', imdbId);

      // Find TMDB ID from IMDb ID
      const tmdbId = await this.findMovieByImdbId(imdbId);
      if (!tmdbId) {
        console.error('[TMDB] Movie not found for IMDb ID:', imdbId);
        return null;
      }

      console.log('[TMDB] Found TMDB movie ID:', tmdbId);

      // Get full movie details with recommendations and similar
      const details = await this.getMovieDetails(tmdbId);
      return details;
    } catch (error) {
      console.error('[TMDB] Error getting movie by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Search for movie by IMDb ID
   */
  private async findMovieByImdbId(imdbId: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/find/${imdbId}?api_key=${this.apiKey}&external_source=imdb_id`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Find movie by IMDb ID failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.movie_results?.[0]?.id || null;
    } catch (error) {
      console.error('[TMDB] Error finding movie by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Get movie details from TMDB API
   */
  private async getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails | null> {
    try {
      const url = `${this.baseUrl}/movie/${tmdbId}?api_key=${this.apiKey}&append_to_response=recommendations,similar`;
      console.log('[TMDB] Fetching movie URL:', url);
    
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Get movie details failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[TMDB] Movie API Response received');
      console.log('[TMDB] Movie Recommendations:', data.recommendations ? `${data.recommendations.results?.length} items` : 'No recommendations');
      console.log('[TMDB] Similar Movies:', data.similar ? `${data.similar.results?.length} items` : 'No similar');
    
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting movie details:', error);
      return null;
    }
  }
}



// Export singleton instance
export const tmdbService = new TMDBService(TMDB_API_KEY);