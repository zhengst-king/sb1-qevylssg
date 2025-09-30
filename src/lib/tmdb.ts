// src/lib/tmdb.ts
// TMDB API service for fetching TV series data

const TMDB_API_KEY = 'a1c48dd97365677772288676568b781d'; // Replace with your actual key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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
}

class TMDBService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = TMDB_BASE_URL;
  }

  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    return `${endpoint}-${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Search for TV series by IMDb ID
   */
  async findByImdbId(imdbId: string): Promise<number | null> {
    try {
      const cacheKey = this.getCacheKey('find', { imdb_id: imdbId });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const url = `${this.baseUrl}/find/${imdbId}?api_key=${this.apiKey}&external_source=imdb_id`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Find by IMDb ID failed:', response.status);
        return null;
      }

      const data = await response.json();
      const tmdbId = data.tv_results?.[0]?.id || null;
      
      this.setCache(cacheKey, tmdbId);
      return tmdbId;
    } catch (error) {
      console.error('[TMDB] Error finding TV series by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Get TV series details with videos and keywords
   */
  async getTVSeriesDetails(tmdbId: number): Promise<TMDBTVSeriesDetails | null> {
    try {
      const cacheKey = this.getCacheKey('tv', { id: tmdbId });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const url = `${this.baseUrl}/tv/${tmdbId}?api_key=${this.apiKey}&append_to_response=videos,keywords,external_ids`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Get TV series details failed:', response.status);
        return null;
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting TV series details:', error);
      return null;
    }
  }

  /**
   * Get TV series details by IMDb ID (convenience method)
   */
  async getTVSeriesByImdbId(imdbId: string): Promise<TMDBTVSeriesDetails | null> {
    try {
      const tmdbId = await this.findByImdbId(imdbId);
      if (!tmdbId) {
        console.warn('[TMDB] Could not find TMDB ID for IMDb ID:', imdbId);
        return null;
      }

      return await this.getTVSeriesDetails(tmdbId);
    } catch (error) {
      console.error('[TMDB] Error getting TV series by IMDb ID:', error);
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
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const tmdbService = new TMDBService(TMDB_API_KEY);