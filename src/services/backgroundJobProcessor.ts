// src/services/backgroundJobProcessor.ts
// Background job processor for automatic episode discovery and caching
import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';

interface DiscoveryJob {
  id: string;
  series_imdb_id: string;
  series_title?: string;
  discovery_type: 'full_series' | 'full_season' | 'single_episode';
  season_number?: number;
  episode_number?: number;
  priority: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  requested_by_user_id?: string;
}

interface ProcessingStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  isProcessing: boolean;
  currentJob: string | null;
  queueLength: number;
  lastProcessedAt: Date | null;
}

class BackgroundJobProcessor {
  private isProcessing = false;
  private currentJobId: string | null = null;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL = 5000; // Check every 5 seconds
  private readonly MAX_CONCURRENT_JOBS = 1; // Process one series at a time
  private readonly API_RATE_LIMIT_DELAY = 250; // 250ms between API calls
  private readonly MAX_SEASONS_TO_TRY = 20; // Reasonable limit for unknown series
  private readonly MAX_CONSECUTIVE_EMPTY_SEASONS = 2; // Stop after 2 empty seasons

  /**
   * Clean up stuck jobs on startup (jobs processing for more than 10 minutes)
   */
  private async cleanupStuckJobs(): Promise<void> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('episode_discovery_queue')
        .update({
          status: 'queued',
          started_at: null,
          error_message: 'Reset from stuck processing state (timeout)'
        })
        .eq('status', 'processing')
        .lt('started_at', tenMinutesAgo)
        .select('id');

      if (error) {
        console.error('[BackgroundJobProcessor] Error cleaning stuck jobs:', error);
      } else {
        console.log(`[BackgroundJobProcessor] Cleaned up ${data?.length || 0} stuck jobs`);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in cleanupStuckJobs:', error);
    }
  }

  constructor() {
    console.log('[BackgroundJobProcessor] Initialized');
    this.cleanupStuckJobs();
    this.startProcessing();
  }

  /**
   * Start the background job processing loop
   */
  private startProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }

    this.processInterval = setInterval(async () => {
      if (!this.isProcessing) {
        try {
          await this.processNextJob();
        } catch (error) {
          console.error('[BackgroundJobProcessor] Error in processing loop:', error);
          this.isProcessing = false;  // ← Ensure flag gets reset
          this.currentJobId = null;
        }
      }
    }, this.PROCESSING_INTERVAL);

    console.log('[BackgroundJobProcessor] Started processing loop');
  }

  /**
   * Stop the background job processing
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log('[BackgroundJobProcessor] Stopped processing');
  }

  /**
   * Get the next queued job to process
   */
  private async getNextJob(): Promise<DiscoveryJob | null> {
    try {
      const { data, error } = await supabase
        .from('episode_discovery_queue')
        .select('*')
        .eq('status', 'queued')
        .lt('attempts', 3)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('[BackgroundJobProcessor] Error fetching next job:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error getting next job:', error);
      return null;
    }
  }

  /**
   * Mark a job as processing
   */
  private async markJobAsProcessing(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('episode_discovery_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select('started_at')
        .single(); 

      if (error || !data || !data.started_at) {
        console.error('[BackgroundJobProcessor] Error marking job as processing:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error updating job status:', error);
      return false;
    }
  }

  /**
   * Mark a job as completed
   */
  private async markJobAsCompleted(jobId: string, totalEpisodes: number, totalSeasons: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('episode_discovery_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress: {
            totalEpisodes,
            totalSeasons,
            completedAt: new Date().toISOString()
          }
        })
        .eq('id', jobId);

      if (error) {
        console.error('[BackgroundJobProcessor] Error marking job as completed:', error);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error updating job completion:', error);
    }
  }

  /**
   * Mark a job as failed
   */
  private async markJobAsFailed(jobId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('episode_discovery_queue')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('id', jobId);

      if (error) {
        console.error('[BackgroundJobProcessor] Error marking job as failed:', error);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error updating job failure:', error);
    }
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    const job = await this.getNextJob();
    if (!job) {
      return; // No jobs to process
    }

    this.isProcessing = true;
    this.currentJobId = job.id;

    console.log(`[BackgroundJobProcessor] Processing job: ${job.series_title || job.series_imdb_id} (${job.discovery_type})`);

    // Mark job as processing
    const marked = await this.markJobAsProcessing(job.id);
    if (!marked) {
      this.isProcessing = false;
      this.currentJobId = null;
      return;
    }

    try {
      switch (job.discovery_type) {
        case 'full_series':
          await this.processFullSeriesDiscovery(job);
          break;
        case 'full_season':
          await this.processSeasonDiscovery(job);
          break;
        case 'single_episode':
          await this.processSingleEpisodeDiscovery(job);
          break;
        default:
          throw new Error(`Unknown discovery type: ${job.discovery_type}`);
      }

      console.log(`[BackgroundJobProcessor] ✅ Completed job: ${job.series_title || job.series_imdb_id}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BackgroundJobProcessor] ❌ Failed job: ${job.series_title || job.series_imdb_id}:`, errorMessage);
      await this.markJobAsFailed(job.id, errorMessage);
    } finally {
      this.isProcessing = false;
      this.currentJobId = null;
    }
  }

  /**
   * Process full series discovery (discover all seasons and episodes)
   */
  private async processFullSeriesDiscovery(job: DiscoveryJob): Promise<void> {
    const { series_imdb_id, series_title } = job;
    let totalEpisodes = 0;
    let totalSeasons = 0;
    let consecutiveEmptySeasons = 0;

    // Start series metadata record
    await this.initializeSeriesMetadata(series_imdb_id, series_title || 'Unknown Series');

    for (let seasonNum = 1; seasonNum <= this.MAX_SEASONS_TO_TRY; seasonNum++) {
      try {
        console.log(`[BackgroundJobProcessor] Discovering Season ${seasonNum} for ${series_title}`);

        // Check if we already have this season cached
        const existingEpisodes = await this.getExistingSeasonEpisodes(series_imdb_id, seasonNum);
        if (existingEpisodes && existingEpisodes.length > 0) {
          console.log(`[BackgroundJobProcessor] Season ${seasonNum} already cached (${existingEpisodes.length} episodes)`);
          totalSeasons = seasonNum;
          totalEpisodes += existingEpisodes.length;
          consecutiveEmptySeasons = 0;
          continue;
        }

        // Fetch episodes for this season from OMDb API
        const seasonEpisodes = await this.discoverSeasonEpisodes(series_imdb_id, seasonNum);

        if (seasonEpisodes.length > 0) {
          // Found episodes, cache them
          await this.cacheSeasonEpisodes(series_imdb_id, seasonNum, seasonEpisodes);
          
          totalSeasons = seasonNum;
          totalEpisodes += seasonEpisodes.length;
          consecutiveEmptySeasons = 0;

          console.log(`[BackgroundJobProcessor] ✅ Cached Season ${seasonNum}: ${seasonEpisodes.length} episodes`);
        } else {
          // No episodes found
          consecutiveEmptySeasons++;
          console.log(`[BackgroundJobProcessor] ❌ Season ${seasonNum} empty (${consecutiveEmptySeasons}/${this.MAX_CONSECUTIVE_EMPTY_SEASONS})`);

          if (consecutiveEmptySeasons >= this.MAX_CONSECUTIVE_EMPTY_SEASONS) {
            console.log(`[BackgroundJobProcessor] Stopping after ${consecutiveEmptySeasons} consecutive empty seasons`);
            break;
          }
        }

        // Rate limiting between seasons
        await this.delay(this.API_RATE_LIMIT_DELAY);

      } catch (error) {
        console.error(`[BackgroundJobProcessor] Error discovering Season ${seasonNum}:`, error);
        consecutiveEmptySeasons++;
        
        if (consecutiveEmptySeasons >= this.MAX_CONSECUTIVE_EMPTY_SEASONS) {
          break;
        }
      }
    }

    // Update series metadata with final counts
    await this.updateSeriesMetadata(series_imdb_id, {
      total_seasons: totalSeasons,
      total_episodes: totalEpisodes,
      fully_discovered: true,
      last_discovery_attempt: new Date().toISOString()
    });

    // Mark job as completed
    await this.markJobAsCompleted(job.id, totalEpisodes, totalSeasons);
  }

  /**
   * Process single season discovery
   */
  private async processSeasonDiscovery(job: DiscoveryJob): Promise<void> {
    const { series_imdb_id, series_title, season_number } = job;
    
    if (!season_number) {
      throw new Error('Season number is required for season discovery');
    }

    // Check if we already have this season cached
    const existingEpisodes = await this.getExistingSeasonEpisodes(series_imdb_id, season_number);
    if (existingEpisodes && existingEpisodes.length > 0) {
      console.log(`[BackgroundJobProcessor] Season ${season_number} already cached`);
      await this.markJobAsCompleted(job.id, existingEpisodes.length, 1);
      return;
    }

    // Discover episodes for this season
    const seasonEpisodes = await this.discoverSeasonEpisodes(series_imdb_id, season_number);
    
    if (seasonEpisodes.length > 0) {
      await this.cacheSeasonEpisodes(series_imdb_id, season_number, seasonEpisodes);
      console.log(`[BackgroundJobProcessor] ✅ Cached Season ${season_number}: ${seasonEpisodes.length} episodes`);
    }

    await this.markJobAsCompleted(job.id, seasonEpisodes.length, 1);
  }

  /**
   * Process single episode discovery
   */
  private async processSingleEpisodeDiscovery(job: DiscoveryJob): Promise<void> {
    const { series_imdb_id, season_number, episode_number } = job;
    
    if (!season_number || !episode_number) {
      throw new Error('Season and episode numbers are required for single episode discovery');
    }

    // Check if we already have this episode cached
    const existingEpisode = await this.getExistingEpisode(series_imdb_id, season_number, episode_number);
    if (existingEpisode) {
      console.log(`[BackgroundJobProcessor] Episode S${season_number}E${episode_number} already cached`);
      await this.markJobAsCompleted(job.id, 1, 1);
      return;
    }

    // Discover single episode
    const episode = await this.discoverSingleEpisode(series_imdb_id, season_number, episode_number);
    
    if (episode) {
      await this.cacheSingleEpisode(series_imdb_id, episode);
      console.log(`[BackgroundJobProcessor] ✅ Cached Episode S${season_number}E${episode_number}`);
    }

    await this.markJobAsCompleted(job.id, episode ? 1 : 0, 1);
  }

  /**
   * Discover all episodes for a season using OMDb API
   */
  private async discoverSeasonEpisodes(seriesImdbId: string, seasonNumber: number): Promise<any[]> {
    const episodes = [];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    for (let episodeNum = 1; episodeNum <= 50; episodeNum++) { // Max 50 episodes per season
      try {
        const episode = await this.discoverSingleEpisode(seriesImdbId, seasonNumber, episodeNum);
        
        if (episode) {
          episodes.push(episode);
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log(`[BackgroundJobProcessor] Stopping Season ${seasonNumber} after ${consecutiveFailures} consecutive failures`);
            break;
          }
        }

        // Rate limiting between episodes
        await this.delay(this.API_RATE_LIMIT_DELAY);

      } catch (error) {
        console.error(`[BackgroundJobProcessor] Error fetching S${seasonNumber}E${episodeNum}:`, error);
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          break;
        }
      }
    }

    return episodes;
  }

  /**
   * Discover a single episode using OMDb API
   */
  private async discoverSingleEpisode(seriesImdbId: string, seasonNumber: number, episodeNumber: number): Promise<any | null> {
    try {
      const response = await omdbApi.getMovieDetails(seriesImdbId, {
        Season: seasonNumber.toString(),
        Episode: episodeNumber.toString()
      });
      
      if (response && response.Response === 'True') {
        return {
          imdb_id: seriesImdbId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          title: response.Title || null,
          plot: response.Plot !== 'N/A' ? response.Plot : null,
          rating: response.Rated !== 'N/A' ? response.Rated : null,
          air_date: response.Released !== 'N/A' ? new Date(response.Released) : null,
          runtime_minutes: this.parseRuntime(response.Runtime),
          year: response.Year ? parseInt(response.Year) : null,
          director: response.Director !== 'N/A' ? response.Director : null,
          writer: response.Writer !== 'N/A' ? response.Writer : null,
          actors: response.Actors !== 'N/A' ? response.Actors : null,
          genre: response.Genre !== 'N/A' ? response.Genre : null,
          poster_url: response.Poster !== 'N/A' ? response.Poster : null,
          imdb_rating: response.imdbRating !== 'N/A' ? parseFloat(response.imdbRating) : null,
          imdb_votes: response.imdbVotes !== 'N/A' ? response.imdbVotes : null,
          api_response: response,
          last_fetched_at: new Date().toISOString(),
          fetch_success: true,
          access_count: 0
        };
      }

      return null;
    } catch (error) {
      console.error(`[BackgroundJobProcessor] API error for S${seasonNumber}E${episodeNumber}:`, error);
      return null;
    }
  }

  /**
   * Initialize series metadata record
   */
  private async initializeSeriesMetadata(seriesImdbId: string, seriesTitle: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('series_episode_counts')
        .upsert({
          imdb_id: seriesImdbId,
          series_title: seriesTitle,
          total_seasons: 0,
          total_episodes: 0,
          fully_discovered: false,
          last_discovery_attempt: new Date().toISOString()
        }, {
          onConflict: 'imdb_id'
        });

      if (error) {
        console.error('[BackgroundJobProcessor] Error initializing series metadata:', error);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in initializeSeriesMetadata:', error);
    }
  }

  /**
   * Update series metadata
   */
  private async updateSeriesMetadata(seriesImdbId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('series_episode_counts')
        .update(updates)
        .eq('imdb_id', seriesImdbId);

      if (error) {
        console.error('[BackgroundJobProcessor] Error updating series metadata:', error);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in updateSeriesMetadata:', error);
    }
  }

  /**
   * Cache episodes for a season in database
   */
  private async cacheSeasonEpisodes(seriesImdbId: string, seasonNumber: number, episodes: any[]): Promise<void> {
    if (episodes.length === 0) return;

    try {
      const { error } = await supabase
        .from('episodes_cache')
        .upsert(episodes, {
          onConflict: 'imdb_id,season_number,episode_number'
        });

      if (error) {
        console.error('[BackgroundJobProcessor] Error caching season episodes:', error);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in cacheSeasonEpisodes:', error);
    }
  }

  /**
   * Cache a single episode in database
   */
  private async cacheSingleEpisode(seriesImdbId: string, episode: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('episodes_cache')
        .upsert(episode, {
          onConflict: 'imdb_id,season_number,episode_number'
        });

      if (error) {
        console.error('[BackgroundJobProcessor] Error caching single episode:', error);
      }
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in cacheSingleEpisode:', error);
    }
  }

  /**
   * Get existing episodes for a season
   */
  private async getExistingSeasonEpisodes(seriesImdbId: string, seasonNumber: number): Promise<any[] | null> {
    try {
      const { data, error } = await supabase
        .from('episodes_cache')
        .select('episode_number')
        .eq('imdb_id', seriesImdbId)
        .eq('season_number', seasonNumber)
        .order('episode_number', { ascending: true });

      if (error) {
        console.error('[BackgroundJobProcessor] Error fetching existing episodes:', error);
        return null;
      }

      return data || [];
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in getExistingSeasonEpisodes:', error);
      return null;
    }
  }

  /**
   * Get existing single episode
   */
  private async getExistingEpisode(seriesImdbId: string, seasonNumber: number, episodeNumber: number): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('episodes_cache')
        .select('id')
        .eq('imdb_id', seriesImdbId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[BackgroundJobProcessor] Error fetching existing episode:', error);
      }

      return data;
    } catch (error) {
      console.error('[BackgroundJobProcessor] Error in getExistingEpisode:', error);
      return null;
    }
  }

  /**
   * Parse runtime string to minutes
   */
  private parseRuntime(runtime: string): number | null {
    if (!runtime || runtime === 'N/A') return null;
    
    const match = runtime.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<ProcessingStats> {
    try {
      const { data: queueData, error: queueError } = await supabase
        .from('episode_discovery_queue')
        .select('status')
        .in('status', ['queued', 'processing', 'completed', 'failed']);

      if (queueError) {
        console.error('[BackgroundJobProcessor] Error fetching processing stats:', queueError);
        return {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          isProcessing: this.isProcessing,
          currentJob: this.currentJobId,
          queueLength: 0,
          lastProcessedAt: null
        };
      }

      const stats = queueData.reduce((acc, job) => {
        acc.totalJobs++;
        if (job.status === 'completed') acc.completedJobs++;
        if (job.status === 'failed') acc.failedJobs++;
        if (job.status === 'queued') acc.queueLength++;
        return acc;
      }, {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        queueLength: 0
      });

      return {
        ...stats,
        isProcessing: this.isProcessing,
        currentJob: this.currentJobId,
        lastProcessedAt: this.isProcessing ? new Date() : null
      };

    } catch (error) {
      console.error('[BackgroundJobProcessor] Error getting processing stats:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        isProcessing: this.isProcessing,
        currentJob: this.currentJobId,
        queueLength: 0,
        lastProcessedAt: null
      };
    }
  }
}

// Export singleton instance
export const backgroundJobProcessor = new BackgroundJobProcessor();