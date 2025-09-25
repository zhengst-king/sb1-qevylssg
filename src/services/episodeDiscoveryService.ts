// File: src/services/episodeDiscoveryService.ts

import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';

// Types
export interface EpisodeData {
  id?: string;
  imdb_id: string;
  season_number: number;
  episode_number: number;
  title?: string;
  plot?: string;
  rating?: string;
  air_date?: Date;
  runtime_minutes?: number;
  year?: number;
  director?: string;
  writer?: string;
  actors?: string;
  genre?: string;
  poster_url?: string;
  imdb_rating?: number;
  imdb_votes?: string;
  api_response?: any;
  last_fetched_at?: Date;
  access_count?: number;
  created_at?: Date;
}

export interface DiscoveryOptions {
  priority?: number;
  maxApiCalls?: number;
  backgroundProcess?: boolean;
  forceRefresh?: boolean;
  userId?: string;
}

export interface SeriesStructure {
  imdb_id: string;
  title: string;
  total_seasons: number;
  total_episodes: number;
  seasons_data: Record<string, { episodes: number; discovered: boolean }>;
}

export interface DiscoveryProgress {
  total_episodes: number;
  episodes_discovered: number;
  discovery_percentage: number;
  estimated_remaining_calls: number;
}

class EpisodeDiscoveryService {
  private readonly CACHE_TTL_HOURS = 24 * 7; // 1 week default cache
  private readonly MAX_CONCURRENT_REQUESTS = 2;
  private readonly REQUEST_DELAY_MS = 250; // Rate limiting
  
  private requestQueue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private isProcessingQueue = false;

  /**
   * Main method: Get episode data with smart caching
   */
  async getEpisode(
    imdbId: string, 
    seasonNum: number, 
    episodeNum: number,
    options: DiscoveryOptions = {}
  ): Promise<EpisodeData | null> {
    // First check cache (unless force refresh)
    if (!options.forceRefresh) {
      const cachedEpisode = await this.getCachedEpisode(imdbId, seasonNum, episodeNum);
      if (cachedEpisode && this.isCacheValid(cachedEpisode)) {
        // Update access tracking
        await this.updateAccessCount(imdbId, seasonNum, episodeNum);
        return cachedEpisode;
      }
    }

    // Not in cache or expired, fetch from API
    try {
      const episodeData = await this.fetchEpisodeFromAPI(imdbId, seasonNum, episodeNum);
      
      if (episodeData) {
        // Cache the result
        await this.cacheEpisode(episodeData);
        return episodeData;
      }
      
      return null;
    } catch (error) {
      console.error(`[EpisodeDiscovery] Error fetching episode ${imdbId} S${seasonNum}E${episodeNum}:`, error);
      
      // Return stale cache if available on API failure
      const staleCache = await this.getCachedEpisode(imdbId, seasonNum, episodeNum);
      return staleCache || null;
    }
  }

  /**
   * Discover all episodes for a season (batch operation)
   */
  async discoverSeason(
    seriesImdbId: string,
    seasonNumber: number,
    options: DiscoveryOptions = {}
  ): Promise<EpisodeData[]> {
    const { maxApiCalls = 50, userId, backgroundProcess = false } = options;
    
    // Queue the discovery request
    const queueItem = await this.queueDiscoveryRequest({
      series_imdb_id: seriesImdbId,
      season_number: seasonNumber,
      discovery_type: 'full_season',
      priority: backgroundProcess ? 3 : 7,
      requested_by_user_id: userId
    });

    if (backgroundProcess) {
      // Don't wait for completion, process in background
      this.processDiscoveryQueue();
      return []; // Return empty for now, will be populated in background
    }

    // Process immediately for foreground requests
    return await this.processSeasonDiscovery(seriesImdbId, seasonNumber, maxApiCalls);
  }

  /**
   * Discover all episodes for entire series (very intensive)
   */
  async discoverSeries(
    seriesImdbId: string,
    options: DiscoveryOptions = {}
  ): Promise<{ queued: boolean; estimatedCalls: number }> {
    const { userId, maxApiCalls = 200 } = options;
    
    // Check if series structure is known
    const seriesInfo = await this.getSeriesStructure(seriesImdbId);
    const estimatedCalls = seriesInfo?.total_episodes || 100; // Conservative estimate

    if (estimatedCalls > maxApiCalls) {
      throw new Error(`Series discovery would require ~${estimatedCalls} API calls, exceeding limit of ${maxApiCalls}`);
    }

    // Always queue full series discovery for background processing
    await this.queueDiscoveryRequest({
      series_imdb_id: seriesImdbId,
      discovery_type: 'full_series',
      priority: 2, // Lower priority for full series
      requested_by_user_id: userId
    });

    // Start background processing
    this.processDiscoveryQueue();

    return {
      queued: true,
      estimatedCalls
    };
  }

  /**
   * Get cached episode from database
   */
  private async getCachedEpisode(
    imdbId: string, 
    seasonNum: number, 
    episodeNum: number
  ): Promise<EpisodeData | null> {
    try {
      const { data, error } = await supabase
        .from('episodes_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .eq('season_number', seasonNum)
        .eq('episode_number', episodeNum)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        imdb_id: data.imdb_id,
        season_number: data.season_number,
        episode_number: data.episode_number,
        title: data.title,
        plot: data.plot,
        rating: data.rating,
        air_date: data.air_date,
        runtime_minutes: data.runtime_minutes,
        year: data.year,
        director: data.director,
        writer: data.writer,
        actors: data.actors,
        genre: data.genre,
        poster_url: data.poster_url,
        imdb_rating: data.imdb_rating,
        imdb_votes: data.imdb_votes,
        api_response: data.api_response,
        last_fetched_at: new Date(data.last_fetched_at),
        access_count: data.access_count,
        created_at: new Date(data.created_at)
      };
    } catch (error) {
      console.error('[EpisodeDiscovery] Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Fetch episode from OMDb API
   */
  private async fetchEpisodeFromAPI(
    imdbId: string,
    seasonNum: number,
    episodeNum: number
  ): Promise<EpisodeData | null> {
    try {
      // Use existing OMDb service
      const response = await omdbApi.getMovieDetails(imdbId, {
        Season: seasonNum.toString(),
        Episode: episodeNum.toString()
      });

      if (!response || response.Response === 'False') {
        return null;
      }

      // Convert OMDb response to EpisodeData
      const episodeData: EpisodeData = {
        imdb_id: imdbId,
        season_number: seasonNum,
        episode_number: episodeNum,
        title: response.Title,
        plot: response.Plot,
        rating: response.Rated,
        air_date: response.Released ? new Date(response.Released) : undefined,
        runtime_minutes: omdbApi.parseRuntime(response.Runtime),
        year: omdbApi.parseYear(response.Year),
        director: response.Director,
        writer: response.Writer,
        actors: response.Actors,
        genre: response.Genre,
        poster_url: response.Poster !== 'N/A' ? response.Poster : undefined,
        imdb_rating: omdbApi.parseRating(response.imdbRating),
        imdb_votes: response.imdbVotes,
        api_response: response,
        last_fetched_at: new Date()
      };

      return episodeData;
    } catch (error) {
      console.error(`[EpisodeDiscovery] API fetch error:`, error);
      throw error;
    }
  }

  /**
   * Cache episode in database
   */
  private async cacheEpisode(episodeData: EpisodeData): Promise<void> {
    try {
      const { error } = await supabase
        .from('episodes_cache')
        .upsert({
          imdb_id: episodeData.imdb_id,
          season_number: episodeData.season_number,
          episode_number: episodeData.episode_number,
          title: episodeData.title,
          plot: episodeData.plot,
          rating: episodeData.rating,
          air_date: episodeData.air_date,
          runtime_minutes: episodeData.runtime_minutes,
          year: episodeData.year,
          director: episodeData.director,
          writer: episodeData.writer,
          actors: episodeData.actors,
          genre: episodeData.genre,
          poster_url: episodeData.poster_url,
          imdb_rating: episodeData.imdb_rating,
          imdb_votes: episodeData.imdb_votes,
          api_response: episodeData.api_response,
          last_fetched_at: new Date(),
          fetch_success: true,
          access_count: 1
        }, {
          onConflict: 'imdb_id,season_number,episode_number'
        });

      if (error) {
        console.error('[EpisodeDiscovery] Cache storage error:', error);
      }
    } catch (error) {
      console.error('[EpisodeDiscovery] Cache storage error:', error);
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(episodeData: EpisodeData): boolean {
    if (!episodeData.last_fetched_at) return false;

    const cacheAge = Date.now() - episodeData.last_fetched_at.getTime();
    const maxAge = this.CACHE_TTL_HOURS * 60 * 60 * 1000; // Convert to milliseconds

    return cacheAge < maxAge;
  }

  /**
   * Update access count for cache analytics
   */
  private async updateAccessCount(
    imdbId: string,
    seasonNum: number,
    episodeNum: number
  ): Promise<void> {
    try {
      await supabase.rpc('update_episodes_cache_access', {
        p_imdb_id: imdbId,
        p_season_number: seasonNum,
        p_episode_number: episodeNum
      });
    } catch (error) {
      // Non-critical error, don't throw
      console.warn('[EpisodeDiscovery] Access count update failed:', error);
    }
  }

  /**
   * Queue discovery request for background processing
   */
  private async queueDiscoveryRequest(request: {
    series_imdb_id: string;
    season_number?: number;
    discovery_type: 'single_episode' | 'full_season' | 'full_series';
    priority: number;
    requested_by_user_id?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('episode_discovery_queue')
        .insert({
          series_imdb_id: request.series_imdb_id,
          season_number: request.season_number,
          discovery_type: request.discovery_type,
          priority: request.priority,
          requested_by_user_id: request.requested_by_user_id,
          status: 'queued'
        });

      if (error) {
        console.error('[EpisodeDiscovery] Queue insertion error:', error);
      }
    } catch (error) {
      console.error('[EpisodeDiscovery] Queue insertion error:', error);
    }
  }

  /**
   * Process season discovery (intensive operation)
   */
  private async processSeasonDiscovery(
    seriesImdbId: string,
    seasonNumber: number,
    maxApiCalls: number
  ): Promise<EpisodeData[]> {
    const episodes: EpisodeData[] = [];
    let apiCallsUsed = 0;
    let episodeNum = 1;

    // Try to discover episodes until we hit a missing one or reach limit
    while (apiCallsUsed < maxApiCalls) {
      try {
        // Check cache first
        const cachedEpisode = await this.getCachedEpisode(seriesImdbId, seasonNumber, episodeNum);
        
        if (cachedEpisode && this.isCacheValid(cachedEpisode)) {
          episodes.push(cachedEpisode);
          episodeNum++;
          continue;
        }

        // Rate limiting
        await this.delay(this.REQUEST_DELAY_MS);

        // Fetch from API
        const episodeData = await this.fetchEpisodeFromAPI(seriesImdbId, seasonNumber, episodeNum);
        apiCallsUsed++;

        if (!episodeData) {
          // Likely reached end of season
          break;
        }

        // Cache and add to results
        await this.cacheEpisode(episodeData);
        episodes.push(episodeData);
        episodeNum++;

      } catch (error) {
        console.error(`[EpisodeDiscovery] Error processing S${seasonNumber}E${episodeNum}:`, error);
        break;
      }
    }

    console.log(`[EpisodeDiscovery] Season ${seasonNumber} discovery complete: ${episodes.length} episodes found, ${apiCallsUsed} API calls used`);
    return episodes;
  }

  /**
   * Background queue processor
   */
  private async processDiscoveryQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;

    try {
      // Get next queued item
      const { data: queueItems, error } = await supabase
        .from('episode_discovery_queue')
        .select('*')
        .eq('status', 'queued')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !queueItems || queueItems.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const item = queueItems[0];

      // Mark as processing
      await supabase
        .from('episode_discovery_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString() 
        })
        .eq('id', item.id);

      // Process based on type
      const startTime = Date.now();
      let episodesDiscovered = 0;
      let apiCallsUsed = 0;

      try {
        if (item.discovery_type === 'full_season') {
          const episodes = await this.processSeasonDiscovery(
            item.series_imdb_id, 
            item.season_number!, 
            50 // Conservative limit for background
          );
          episodesDiscovered = episodes.length;
          apiCallsUsed = episodes.length; // Approximate
        }
        // Add other discovery types as needed

        // Mark as completed
        await supabase
          .from('episode_discovery_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            episodes_discovered: episodesDiscovered,
            api_calls_used: apiCallsUsed,
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', item.id);

      } catch (error) {
        // Mark as failed
        await supabase
          .from('episode_discovery_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', item.id);
      }

    } catch (error) {
      console.error('[EpisodeDiscovery] Queue processing error:', error);
    }

    this.isProcessingQueue = false;

    // Process next item if available
    setTimeout(() => this.processDiscoveryQueue(), 1000);
  }

  /**
   * Get series structure and discovery progress
   */
  async getSeriesStructure(imdbId: string): Promise<SeriesStructure | null> {
    try {
      const { data, error } = await supabase
        .from('series_episode_counts')
        .select('*')
        .eq('imdb_id', imdbId)
        .single();

      if (error || !data) return null;

      return {
        imdb_id: data.imdb_id,
        title: data.series_title,
        total_seasons: data.total_seasons,
        total_episodes: data.total_episodes,
        seasons_data: data.seasons_data
      };
    } catch (error) {
      console.error('[EpisodeDiscovery] Series structure lookup error:', error);
      return null;
    }
  }

  /**
   * Get discovery progress for a series
   */
  async getDiscoveryProgress(imdbId: string): Promise<DiscoveryProgress | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_series_discovery_progress', { p_imdb_id: imdbId })
        .single();

      if (error || !data) return null;

      return {
        total_episodes: data.total_episodes,
        episodes_discovered: data.episodes_discovered,
        discovery_percentage: data.discovery_percentage,
        estimated_remaining_calls: data.estimated_remaining_calls
      };
    } catch (error) {
      console.error('[EpisodeDiscovery] Progress lookup error:', error);
      return null;
    }
  }

  /**
   * Get popular/most accessed episodes (for pre-caching)
   */
  async getPopularEpisodes(limit: number = 50): Promise<EpisodeData[]> {
    try {
      const { data, error } = await supabase
        .from('episodes_cache')
        .select('*')
        .order('access_count', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(item => ({
        id: item.id,
        imdb_id: item.imdb_id,
        season_number: item.season_number,
        episode_number: item.episode_number,
        title: item.title,
        plot: item.plot,
        rating: item.rating,
        air_date: item.air_date,
        runtime_minutes: item.runtime_minutes,
        year: item.year,
        director: item.director,
        writer: item.writer,
        actors: item.actors,
        genre: item.genre,
        poster_url: item.poster_url,
        imdb_rating: item.imdb_rating,
        imdb_votes: item.imdb_votes,
        last_fetched_at: new Date(item.last_fetched_at),
        access_count: item.access_count
      }));
    } catch (error) {
      console.error('[EpisodeDiscovery] Popular episodes lookup error:', error);
      return [];
    }
  }

  /**
   * Utility: Simple delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Service health check
   */
  async getServiceStats(): Promise<{
    cached_episodes: number;
    queue_items: number;
    popular_series: string[];
    api_efficiency: number;
  }> {
    try {
      // Get cached episodes count
      const { count: cachedEpisodes } = await supabase
        .from('episodes_cache')
        .select('*', { count: 'exact', head: true });

      // Get queue items count
      const { count: queueItems } = await supabase
        .from('episode_discovery_queue')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');

      // Get popular series
      const { data: popularSeries } = await supabase
        .from('episodes_cache')
        .select('imdb_id')
        .order('access_count', { ascending: false })
        .limit(5);

      const uniqueSeries = [...new Set(popularSeries?.map(item => item.imdb_id) || [])];

      return {
        cached_episodes: cachedEpisodes || 0,
        queue_items: queueItems || 0,
        popular_series: uniqueSeries,
        api_efficiency: cachedEpisodes ? Math.round((cachedEpisodes / (cachedEpisodes + (queueItems || 0))) * 100) : 0
      };
    } catch (error) {
      console.error('[EpisodeDiscovery] Stats lookup error:', error);
      return {
        cached_episodes: 0,
        queue_items: 0,
        popular_series: [],
        api_efficiency: 0
      };
    }
  }
}

// Export singleton
export const episodeDiscoveryService = new EpisodeDiscoveryService();