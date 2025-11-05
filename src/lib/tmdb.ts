// src/lib/tmdb.ts
// TMDB API service with Supabase server-side caching + TV EPISODE SUPPORT

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
  recommendations?: TMDBRecommendationsResponse;
  similar?: TMDBRecommendationsResponse;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

// Movie-specific interfaces
export interface TMDBMovieRecommendation {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  title: string;
  original_language: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  media_type: string;
  genre_ids: number[];
  popularity: number;
  release_date: string;
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
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  recommendations?: TMDBMovieRecommendationsResponse;
  similar?: TMDBMovieRecommendationsResponse;
  'watch/providers'?: WatchProvidersData;
}

// ✅ NEW: TV Season and Episode interfaces
export interface TMDBEpisode {
  air_date: string;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  production_code: string;
  runtime: number | null;
  season_number: number;
  show_id: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  crew: Array<{
    department: string;
    job: string;
    credit_id: string;
    adult: boolean;
    gender: number;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string | null;
  }>;
  guest_stars: Array<{
    character: string;
    credit_id: string;
    order: number;
    adult: boolean;
    gender: number;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string | null;
  }>;
}

export interface TMDBSeasonDetails {
  _id: string;
  air_date: string;
  episodes: TMDBEpisode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

// Collection interfaces
export interface TMDBCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBCollectionPart[];
}

export interface TMDBCollectionPart {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  title: string;
  original_language: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  media_type: string;
  genre_ids: number[];
  popularity: number;
  release_date: string;
  vote_average: number;
  vote_count: number;
  video: boolean;
}

export interface TMDBCollectionSearchResult {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBCollectionSearchResponse {
  page: number;
  results: TMDBCollectionSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieSearchResult {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface TMDBTVSearchResult {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  first_air_date: string;
  name: string;
  vote_average: number;
  vote_count: number;
}

export interface TMDBMovieSearchResponse {
  page: number;
  results: TMDBMovieSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TMDBTVSearchResponse {
  page: number;
  results: TMDBTVSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieDetailsFull extends TMDBMovieDetails {
  genres: Array<{ id: number; name: string }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  production_companies: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
  spoken_languages: Array<{ iso_639_1: string; english_name: string; name: string }>;
  original_language: string;
  tagline: string;
  budget: number;
  revenue: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      order: number;
      profile_path: string | null;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }>;
  };
  external_ids?: {
    imdb_id: string;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
}

export interface TMDBTVDetailsFull extends TMDBTVSeriesDetails {
  genres: Array<{ id: number; name: string }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages: Array<{ iso_639_1: string; english_name: string; name: string }>;
  original_language: string;
  tagline: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  number_of_seasons: number;
  number_of_episodes: number;
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

      // Get full details
      const details = await this.getTVSeriesDetails(tmdbId);
      if (!details) {
        console.error('[TMDB] Failed to get series details');
        return null;
      }

      const watchProviders = details['watch/providers'];
      await this.saveToCacheMVP(imdbId, details, watchProviders);

      return details;
    } catch (error) {
      console.error('[TMDB] Error in getTVSeriesByImdbId:', error);
      return null;
    }
  }

  /**
   * ✅ NEW: Get season details with all episodes
   */
  async getTVSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TMDBSeasonDetails | null> {
    if (!this.apiKey) {
      console.error('[TMDB] API key not configured');
      return null;
    }

    try {
      const url = `${this.baseUrl}/tv/${tmdbId}/season/${seasonNumber}?api_key=${this.apiKey}`;
      console.log(`[TMDB] Fetching season ${seasonNumber} for TMDB ID ${tmdbId}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Get season details failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log(`[TMDB] Season ${seasonNumber} has ${data.episodes?.length || 0} episodes`);
      
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting season details:', error);
      return null;
    }
  }

  /**
   * ✅ NEW: Get season details by IMDb ID
   */
  async getTVSeasonByImdbId(imdbId: string, seasonNumber: number): Promise<TMDBSeasonDetails | null> {
    try {
      // First find TMDB ID
      const tmdbId = await this.findByImdbId(imdbId);
      if (!tmdbId) {
        console.error('[TMDB] TV series not found for IMDb ID:', imdbId);
        return null;
      }

      // Then get season details
      return await this.getTVSeasonDetails(tmdbId, seasonNumber);
    } catch (error) {
      console.error('[TMDB] Error getting season by IMDb ID:', error);
      return null;
    }
  }

  /**
   * ✅ NEW: Get specific episode details
   */
  async getTVEpisodeDetails(
    tmdbId: number, 
    seasonNumber: number, 
    episodeNumber: number
  ): Promise<TMDBEpisode | null> {
    if (!this.apiKey) {
      console.error('[TMDB] API key not configured');
      return null;
    }

    try {
      const url = `${this.baseUrl}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${this.apiKey}`;
      console.log(`[TMDB] Fetching S${seasonNumber}E${episodeNumber} for TMDB ID ${tmdbId}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[TMDB] Episode S${seasonNumber}E${episodeNumber} not found`);
          return null;
        }
        console.error('[TMDB] Get episode details failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log(`[TMDB] Episode found: ${data.name}`);
      
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting episode details:', error);
      return null;
    }
  }

  /**
   * Get cached data from Supabase
   */
  private async getCachedData(imdbId: string): Promise<CachedTMDBData | null> {
    try {
      const { data, error } = await supabase
        .from('tmdb_series_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .order('last_fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[TMDB] Error reading cache:', error);
        return null;
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
      const { data: currentData } = await supabase
        .from('tmdb_series_cache')
        .select('access_count')
        .eq('imdb_id', imdbId)
        .single();

      const newAccessCount = (currentData?.access_count || 0) + 1;

      await supabase
        .from('tmdb_series_cache')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: newAccessCount
        })
        .eq('imdb_id', imdbId);
    } catch (error) {
      console.error('[TMDB] Last accessed update error:', error);
    }
  }

  /**
   * Save data to cache
   */
  private async saveToCacheMVP(
    imdbId: string, 
    details: TMDBTVSeriesDetails,
    watchProviders?: WatchProvidersData
  ): Promise<void> {
    try {
      const extractedWatchProviders = watchProviders || details['watch/providers'] || null;
      
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
        watch_providers: extractedWatchProviders,
        credits: details.credits ? {
          cast: details.credits.cast,
          crew: details.credits.crew
        } : undefined,
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
        console.error('[TMDB] Error saving to cache:', error);
      } else {
        console.log('[TMDB] Successfully saved to cache:', imdbId);
      }
    } catch (error) {
      console.error('[TMDB] Cache save error:', error);
    }
  }

  /**
   * Format cached data to match API response structure
   */
  private formatCachedData(cached: CachedTMDBData): TMDBTVSeriesDetails {
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
      'watch/providers': cached.watch_providers || undefined,
      credits: cached.credits ? {
        cast: cached.credits.cast || [],
        crew: cached.credits.crew || [],
        id: cached.tmdb_id
      } : undefined,
      recommendations: cached.recommendations,
      similar: cached.similar
    };
    
    return formatted;
  }

  /**
   * Search for TV series by IMDb ID
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
   * Get TV series details from TMDB API
   */
  private async getTVSeriesDetails(tmdbId: number): Promise<TMDBTVSeriesDetails | null> {
    try {
      const url = `${this.baseUrl}/tv/${tmdbId}?api_key=${this.apiKey}&append_to_response=videos,keywords,external_ids,watch/providers,credits,recommendations,similar`;
      console.log('[TMDB] Fetching URL:', url);
    
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDB] Get TV series details failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[TMDB] API Response received');
    
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
   * Get watch providers separately
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
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting watch providers:', error);
      return null;
    }
  }

  /**
   * Update cached entry with IMDb rating
   */
  async updateCacheRating(imdbId: string, rating: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('tmdb_series_cache')
        .update({ imdb_rating: rating })
        .eq('imdb_id', imdbId);

      if (error) {
        console.error('[TMDB] Error updating cache rating:', error);
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
   * Clear cache for a specific series
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
      const tmdbId = await this.findMovieByImdbId(imdbId);
      if (!tmdbId) {
        console.error('[TMDB] Movie not found for IMDb ID:', imdbId);
        return null;
      }

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
      const url = `${this.baseUrl}/movie/${tmdbId}?api_key=${this.apiKey}&append_to_response=recommendations,similar,watch/providers`;
      
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting movie details:', error);
      return null;
    }
  }

  /**
   * Search for collections by name
   */
  async searchCollections(query: string): Promise<TMDBCollectionSearchResponse | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search/collection?api_key=${this.apiKey}&query=${encodedQuery}`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error searching collections:', error);
      return null;
    }
  }

  /**
   * Get collection details by ID
   */
  async getCollectionDetails(collectionId: number): Promise<TMDBCollection | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/collection/${collectionId}?api_key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting collection details:', error);
      return null;
    }
  }

  /**
   * Search for movies by query string
   */
  async searchMovies(query: string, page: number = 1): Promise<TMDBMovieSearchResponse | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${encodedQuery}&page=${page}&include_adult=false`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error searching movies:', error);
      return null;
    }
  }

  /**
   * Search for TV series by query string
   */
  async searchTV(query: string, page: number = 1): Promise<TMDBTVSearchResponse | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search/tv?api_key=${this.apiKey}&query=${encodedQuery}&page=${page}&include_adult=false`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error searching TV series:', error);
      return null;
    }
  }

  /**
   * Get full movie details with credits and external IDs
   */
  async getMovieDetailsFull(tmdbId: number): Promise<TMDBMovieDetailsFull | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/movie/${tmdbId}?api_key=${this.apiKey}&append_to_response=credits,external_ids,watch/providers`;
      
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting full movie details:', error);
      return null;
    }
  }

  /**
   * Get full TV series details with credits and external IDs
   */
  async getTVDetailsFull(tmdbId: number): Promise<TMDBTVDetailsFull | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/tv/${tmdbId}?api_key=${this.apiKey}&append_to_response=credits,external_ids,watch/providers`;
      
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[TMDB] Error getting full TV details:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tmdbService = new TMDBService(TMDB_API_KEY);