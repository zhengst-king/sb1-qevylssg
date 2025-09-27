// src/services/serverSideEpisodeService.ts
// Server-side episode caching service using Supabase database
import { supabase } from '../lib/supabase';
import { omdbApi, OMDBEpisodeDetails } from '../lib/omdb';

// Cache management interfaces
interface SeriesStatus {
  cached: boolean;
  totalSeasons: number;
  totalEpisodes: number;
  lastUpdated: Date | null;
  isBeingFetched: boolean;
}

interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  currentlyProcessing: string | null;
}

interface SeriesMetadata {
  imdb_id: string;
  series_title: string;
  total_seasons: number;
  total_episodes: number;
  imdb_rating?: number;
  calculated_ttl_days?: number;
  fully_discovered: boolean;
  last_discovery_attempt?: Date;
}

class ServerSideEpisodeService {
  private readonly PROCESSING_TIMEOUT = 30000; // 30 seconds
  private activeDiscoveryProcesses = new Set<string>();

  constructor() {
    console.log('[ServerSideEpisodes] Service initialized');
  }

  /**
   * Get cached episodes for a specific season from database
   */
  async getSeasonEpisodes(seriesImdbId: string, seasonNumber: number): Promise<OMDBEpisodeDetails[] | null> {
    try {
      // First check if episodes exist in cache
      const { data: episodes, error } = await supabase
        .from('episodes_cache')
        .select('*')
        .eq('imdb_id', seriesImdbId)
        .eq('season_number', seasonNumber)
        .order('episode_number', { ascending: true });

      if (error) {
        console.error('[ServerSideEpisodes] Database error fetching episodes:', error);
        return null;
      }

      if (!episodes || episodes.length === 0) {
        console.log(`[ServerSideEpisodes] No episodes found for ${seriesImdbId} Season ${seasonNumber}`);
        return null;
      }

      // Update access time for cache management
      await this.updateEpisodeAccessTime(seriesImdbId, seasonNumber);

      // Convert database records to OMDBEpisodeDetails format
      const formattedEpisodes: OMDBEpisodeDetails[] = episodes.map(ep => ({
        season: ep.season_number,
        episode: ep.episode_number,
        seriesID: ep.imdb_id,
        imdbID: ep.imdb_id + `_S${ep.season_number}E${ep.episode_number}`,
        title: ep.title || undefined,
        plot: ep.plot || undefined,
        released: ep.air_date ? new Date(ep.air_date).toISOString() : undefined,
        runtime: ep.runtime_minutes ? `${ep.runtime_minutes} min` : undefined,
        imdbRating: ep.imdb_rating ? ep.imdb_rating.toString() : undefined,
        poster: ep.poster_url || undefined,
        director: ep.director || undefined,
        writer: ep.writer || undefined,
        actors: ep.actors || undefined,
      }));

      console.log(`[ServerSideEpisodes] Retrieved ${formattedEpisodes.length} episodes for ${seriesImdbId} Season ${seasonNumber}`);
      return formattedEpisodes;

    } catch (error) {
      console.error('[ServerSideEpisodes] Error fetching season episodes:', error);
      return null;
    }
  }

  /**
   * Get total number of seasons for a series from database
   */
  async getTotalSeasons(seriesImdbId: string): Promise<number> {
    try {
      const metadata = await this.getSeriesMetadata(seriesImdbId);
      return metadata?.total_seasons || 0;
    } catch (error) {
      console.error('[ServerSideEpisodes] Error getting total seasons:', error);
      return 0;
    }
  }

  /**
   * Get total episode count for a series from database
   */
  async getTotalEpisodesCount(seriesImdbId: string): Promise<number> {
    try {
      const metadata = await this.getSeriesMetadata(seriesImdbId);
      return metadata?.total_episodes || 0;
    } catch (error) {
      console.error('[ServerSideEpisodes] Error getting total episodes:', error);
      return 0;
    }
  }

  /**
   * Check if series is currently being fetched in background
   */
  async isSeriesBeingFetched(seriesImdbId: string): Promise<boolean> {
    try {
      // Check if there are active discovery jobs for this series
      const { data: activeJobs, error } = await supabase
        .from('episode_discovery_queue')
        .select('id')
        .eq('series_imdb_id', seriesImdbId)
        .in('status', ['queued', 'processing'])
        .limit(1);

      if (error) {
        console.error('[ServerSideEpisodes] Error checking fetch status:', error);
        return false;
      }

      const isBeingFetched = (activeJobs && activeJobs.length > 0) || 
                            this.activeDiscoveryProcesses.has(seriesImdbId);

      return isBeingFetched;
    } catch (error) {
      console.error('[ServerSideEpisodes] Error checking fetch status:', error);
      return false;
    }
  }

  /**
   * Get comprehensive cache status for a series
   */
  async getSeriesStatus(seriesImdbId: string): Promise<SeriesStatus> {
    try {
      const metadata = await this.getSeriesMetadata(seriesImdbId);
      const isBeingFetched = await this.isSeriesBeingFetched(seriesImdbId);

      if (!metadata) {
        return {
          cached: false,
          totalSeasons: 0,
          totalEpisodes: 0,
          lastUpdated: null,
          isBeingFetched
        };
      }

      // Check if cache is still valid based on smart TTL
      const isCacheValid = await this.isCacheValid(seriesImdbId, metadata);

      return {
        cached: isCacheValid && metadata.total_episodes > 0,
        totalSeasons: metadata.total_seasons || 0,
        totalEpisodes: metadata.total_episodes || 0,
        lastUpdated: metadata.last_discovery_attempt || null,
        isBeingFetched
      };

    } catch (error) {
      console.error('[ServerSideEpisodes] Error getting series status:', error);
      return {
        cached: false,
        totalSeasons: 0,
        totalEpisodes: 0,
        lastUpdated: null,
        isBeingFetched: false
      };
    }
  }

  /**
   * Add a TV series to the background discovery queue
   */
  async addSeriesToQueue(
    seriesImdbId: string, 
    seriesTitle: string, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      // Check if series is already being processed or recently cached
      const status = await this.getSeriesStatus(seriesImdbId);
      if (status.cached || status.isBeingFetched) {
        console.log(`[ServerSideEpisodes] Series ${seriesTitle} already cached or being fetched`);
        return;
      }

      // Convert priority to numeric value
      const priorityValue = { high: 10, medium: 5, low: 1 }[priority];

      // Add to discovery queue
      const { error } = await supabase
        .from('episode_discovery_queue')
        .insert({
          series_imdb_id: seriesImdbId,
          series_title: seriesTitle,
          discovery_type: 'full_series',
          priority: priorityValue,
          status: 'queued',
          requested_by_user_id: (await supabase.auth.getUser()).data.user?.id,
          scheduled_for: new Date().toISOString()
        });

      if (error) {
        console.error('[ServerSideEpisodes] Error adding to queue:', error);
        return;
      }

      console.log(`[ServerSideEpisodes] Added ${seriesTitle} to discovery queue with ${priority} priority`);

      // Start processing if not already running
      this.processDiscoveryQueue();

    } catch (error) {
      console.error('[ServerSideEpisodes] Error adding series to queue:', error);
    }
  }

  /**
   * Force refresh a series (clear cache and re-discover)
   */
  async forceRefreshSeries(seriesImdbId: string, seriesTitle: string): Promise<void> {
    try {
      console.log(`[ServerSideEpisodes] Force refreshing ${seriesTitle}`);

      // Clear existing cache data
      await this.clearSeriesCache(seriesImdbId);

      // Add to queue with high priority
      await this.addSeriesToQueue(seriesImdbId, seriesTitle, 'high');

    } catch (error) {
      console.error('[ServerSideEpisodes] Error force refreshing series:', error);
    }
  }

  /**
   * Get discovery queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      // Get queue length
      const { data: queueJobs, error: queueError } = await supabase
        .from('episode_discovery_queue')
        .select('id, series_title, status')
        .in('status', ['queued', 'processing'])
        .order('priority', { ascending: false });

      if (queueError) {
        console.error('[ServerSideEpisodes] Error getting queue status:', error);
        return { queueLength: 0, isProcessing: false, currentlyProcessing: null };
      }

      const queueLength = queueJobs?.length || 0;
      const processingJob = queueJobs?.find(job => job.status === 'processing');
      const isProcessing = !!processingJob || this.activeDiscoveryProcesses.size > 0;
      const currentlyProcessing = processingJob?.series_title || 
                                  Array.from(this.activeDiscoveryProcesses)[0] || null;

      return {
        queueLength,
        isProcessing,
        currentlyProcessing
      };

    } catch (error) {
      console.error('[ServerSideEpisodes] Error getting queue status:', error);
      return { queueLength: 0, isProcessing: false, currentlyProcessing: null };
    }
  }

  /**
   * Clear all cache and queue data
   */
  async clearAll(): Promise<void> {
    try {
      console.log('[ServerSideEpisodes] Clearing all cache and queue data');

      // Clear episodes cache
      await supabase.from('episodes_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear series metadata
      await supabase.from('series_episode_counts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear discovery queue
      await supabase.from('episode_discovery_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      console.log('[ServerSideEpisodes] All cache and queue data cleared');

    } catch (error) {
      console.error('[ServerSideEpisodes] Error clearing all data:', error);
    }
  }

  // PRIVATE HELPER METHODS

  /**
   * Get series metadata from database
   */
  private async getSeriesMetadata(seriesImdbId: string): Promise<SeriesMetadata | null> {
    try {
      const { data: metadata, error } = await supabase
        .from('series_episode_counts')
        .select('*')
        .eq('imdb_id', seriesImdbId)
        .single();

      if (error || !metadata) {
        return null;
      }

      return {
        imdb_id: metadata.imdb_id,
        series_title: metadata.series_title,
        total_seasons: metadata.total_seasons || 0,
        total_episodes: metadata.total_episodes || 0,
        imdb_rating: metadata.imdb_rating,
        calculated_ttl_days: metadata.calculated_ttl_days,
        fully_discovered: metadata.fully_discovered || false,
        last_discovery_attempt: metadata.last_discovery_attempt ? new Date(metadata.last_discovery_attempt) : undefined
      };

    } catch (error) {
      console.error('[ServerSideEpisodes] Error getting series metadata:', error);
      return null;
    }
  }

  /**
   * Check if cache is still valid based on smart TTL
   */
  private async isCacheValid(seriesImdbId: string, metadata: SeriesMetadata): Promise<boolean> {
    try {
      if (!metadata.last_discovery_attempt) {
        return false;
      }

      // Calculate TTL based on IMDB rating (using the database function)
      let ttlDays = metadata.calculated_ttl_days;
      
      if (!ttlDays && metadata.imdb_rating) {
        const { data: calculatedTtl, error } = await supabase
          .rpc('calculate_smart_ttl', { rating: metadata.imdb_rating });
        
        if (!error && calculatedTtl) {
          ttlDays = calculatedTtl;
          
          // Update the cached TTL value
          await supabase
            .from('series_episode_counts')
            .update({ calculated_ttl_days: ttlDays })
            .eq('imdb_id', seriesImdbId);
        }
      }

      // Default to 7 days if no TTL calculated
      const finalTtlDays = ttlDays || 7;
      const ttlMilliseconds = finalTtlDays * 24 * 60 * 60 * 1000;
      const cacheAge = Date.now() - metadata.last_discovery_attempt.getTime();

      const isValid = cacheAge < ttlMilliseconds;
      
      console.log(`[ServerSideEpisodes] Cache validity check for ${seriesImdbId}: ${isValid} (age: ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} days, TTL: ${finalTtlDays} days)`);
      
      return isValid;

    } catch (error) {
      console.error('[ServerSideEpisodes] Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Update episode access time for cache lifecycle management
   */
  private async updateEpisodeAccessTime(seriesImdbId: string, seasonNumber: number): Promise<void> {
    try {
      // Use the database function to update access time
      const { error } = await supabase
        .rpc('extend_episode_cache_life', { 
          p_imdb_id: seriesImdbId, 
          p_season_number: seasonNumber 
        });

      if (error) {
        console.warn('[ServerSideEpisodes] Could not update access time:', error);
      }

    } catch (error) {
      console.warn('[ServerSideEpisodes] Error updating access time:', error);
    }
  }

  /**
   * Clear cache for a specific series
   */
  private async clearSeriesCache(seriesImdbId: string): Promise<void> {
    try {
      // Delete episodes
      await supabase
        .from('episodes_cache')
        .delete()
        .eq('imdb_id', seriesImdbId);

      // Delete series metadata
      await supabase
        .from('series_episode_counts')
        .delete()
        .eq('imdb_id', seriesImdbId);

      console.log(`[ServerSideEpisodes] Cleared cache for series ${seriesImdbId}`);

    } catch (error) {
      console.error('[ServerSideEpisodes] Error clearing series cache:', error);
    }
  }

  /**
   * Background discovery queue processor
   */
  private async processDiscoveryQueue(): Promise<void> {
    try {
      // Get next job from queue
      const { data: nextJobs, error } = await supabase
        .from('episode_discovery_queue')
        .select('*')
        .eq('status', 'queued')
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(1);

      if (error || !nextJobs || nextJobs.length === 0) {
        return; // No jobs to process
      }

      const job = nextJobs[0];
      console.log(`[ServerSideEpisodes] Processing discovery job for ${job.series_title}`);

      // Mark job as processing
      await supabase
        .from('episode_discovery_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString() 
        })
        .eq('id', job.id);

      // Add to active processes
      this.activeDiscoveryProcesses.add(job.series_imdb_id);

      try {
        // Start episode discovery (implement in next step)
        await this.discoverSeriesEpisodes(job.series_imdb_id, job.series_title);

        // Mark job as completed
        await supabase
          .from('episode_discovery_queue')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', job.id);

      } catch (discoveryError) {
        console.error('[ServerSideEpisodes] Discovery error:', discoveryError);
        
        // Mark job as failed
        await supabase
          .from('episode_discovery_queue')
          .update({ 
            status: 'failed',
            error_message: discoveryError instanceof Error ? discoveryError.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }

      // Remove from active processes
      this.activeDiscoveryProcesses.delete(job.series_imdb_id);

      // Process next job after a brief delay
      setTimeout(() => this.processDiscoveryQueue(), 1000);

    } catch (error) {
      console.error('[ServerSideEpisodes] Error processing discovery queue:', error);
    }
  }

  /**
   * Discover and cache episodes for a series (placeholder - implement in next step)
   */
  private async discoverSeriesEpisodes(seriesImdbId: string, seriesTitle: string): Promise<void> {
    // This will be implemented in Step 5: Background Job Processing
    console.log(`[ServerSideEpisodes] Episode discovery for ${seriesTitle} - to be implemented in Step 5`);
    
    // For now, just create a placeholder entry
    await supabase
      .from('series_episode_counts')
      .upsert({
        imdb_id: seriesImdbId,
        series_title: seriesTitle,
        total_seasons: 0,
        total_episodes: 0,
        fully_discovered: false,
        last_discovery_attempt: new Date().toISOString()
      });
  }
}

// Export singleton instance
export const serverSideEpisodeService = new ServerSideEpisodeService();