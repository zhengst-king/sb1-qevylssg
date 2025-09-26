// src/services/backgroundEpisodeService.ts
// Service for background episode fetching and caching
import { omdbApi, OMDBEpisodeDetails } from '../lib/omdb';

interface SeriesEpisodeCache {
  [seriesImdbId: string]: {
    seasons: {
      [seasonNumber: number]: {
        episodes: OMDBEpisodeDetails[];
        timestamp: number;
        fullyLoaded: boolean;
        episodeCount: number;
      }
    };
    totalSeasons: number;
    lastUpdated: number;
    isBackgroundFetching: boolean;
  };
}

interface BackgroundFetchJob {
  seriesImdbId: string;
  seriesTitle: string;
  priority: 'high' | 'medium' | 'low';
  addedAt: number;
}

class BackgroundEpisodeService {
  private cache: SeriesEpisodeCache = {};
  private fetchQueue: BackgroundFetchJob[] = [];
  private isProcessingQueue = false;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'tv_episodes_cache';
  private readonly QUEUE_KEY = 'tv_fetch_queue';
  
  constructor() {
    this.loadCacheFromStorage();
    this.loadQueueFromStorage();
    this.startBackgroundProcessing();
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        console.log('[BackgroundEpisodes] Loaded cache from storage:', Object.keys(this.cache).length, 'series');
      }
    } catch (error) {
      console.warn('[BackgroundEpisodes] Failed to load cache from storage:', error);
      this.cache = {};
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('[BackgroundEpisodes] Failed to save cache to storage:', error);
    }
  }

  /**
   * Load fetch queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.fetchQueue = JSON.parse(stored);
        console.log('[BackgroundEpisodes] Loaded queue from storage:', this.fetchQueue.length, 'jobs');
      }
    } catch (error) {
      console.warn('[BackgroundEpisodes] Failed to load queue from storage:', error);
      this.fetchQueue = [];
    }
  }

  /**
   * Save fetch queue to localStorage
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.fetchQueue));
    } catch (error) {
      console.warn('[BackgroundEpisodes] Failed to save queue to storage:', error);
    }
  }

  /**
   * Add a TV series to the background fetch queue
   */
  addSeriesToQueue(seriesImdbId: string, seriesTitle: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // Check if already in cache and recent
    if (this.isCacheValid(seriesImdbId)) {
      console.log('[BackgroundEpisodes] Series already cached:', seriesTitle);
      return;
    }

    // Check if already in queue
    const existingJob = this.fetchQueue.find(job => job.seriesImdbId === seriesImdbId);
    if (existingJob) {
      // Update priority if higher
      if (priority === 'high' && existingJob.priority !== 'high') {
        existingJob.priority = 'high';
        this.sortQueue();
        this.saveQueueToStorage();
      }
      return;
    }

    // Add to queue
    const job: BackgroundFetchJob = {
      seriesImdbId,
      seriesTitle,
      priority,
      addedAt: Date.now()
    };

    this.fetchQueue.push(job);
    this.sortQueue();
    this.saveQueueToStorage();

    console.log('[BackgroundEpisodes] Added to queue:', seriesTitle, `(${priority} priority)`);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.startBackgroundProcessing();
    }
  }

  /**
   * Sort queue by priority and add time
   */
  private sortQueue(): void {
    this.fetchQueue.sort((a, b) => {
      // High priority first
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      
      // Then medium priority
      if (a.priority === 'medium' && b.priority === 'low') return -1;
      if (b.priority === 'medium' && a.priority === 'low') return 1;
      
      // Finally by add time (older first)
      return a.addedAt - b.addedAt;
    });
  }

  /**
   * Start background processing of the fetch queue
   */
  private async startBackgroundProcessing(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    console.log('[BackgroundEpisodes] Started background processing');

    while (this.fetchQueue.length > 0) {
      const job = this.fetchQueue.shift()!;
      this.saveQueueToStorage();

      try {
        console.log('[BackgroundEpisodes] Processing:', job.seriesTitle);
        await this.fetchSeriesEpisodes(job.seriesImdbId, job.seriesTitle);
        
        // Rate limiting between series
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('[BackgroundEpisodes] Failed to process:', job.seriesTitle, error);
        
        // Re-add to queue with lower priority if it was a network error
        if (error instanceof Error && error.message.includes('Network')) {
          job.priority = 'low';
          this.fetchQueue.push(job);
          this.sortQueue();
          this.saveQueueToStorage();
        }
      }
    }

    this.isProcessingQueue = false;
    console.log('[BackgroundEpisodes] Background processing completed');
  }

  /**
   * Fetch all episodes for a series
   */
  private async fetchSeriesEpisodes(seriesImdbId: string, seriesTitle: string): Promise<void> {
    // Mark as being fetched
    if (!this.cache[seriesImdbId]) {
      this.cache[seriesImdbId] = {
        seasons: {},
        totalSeasons: 0,
        lastUpdated: Date.now(),
        isBackgroundFetching: true
      };
    } else {
      this.cache[seriesImdbId].isBackgroundFetching = true;
    }

    let totalSeasons = 0;
    let consecutiveEmptySeasons = 0;
    const maxConsecutiveEmptySeasons = 2;
    const maxSeasonsToTry = 20; // Reasonable limit

    for (let seasonNum = 1; seasonNum <= maxSeasonsToTry; seasonNum++) {
      try {
        console.log('[BackgroundEpisodes] Fetching Season', seasonNum, 'of', seriesTitle);

        const episodeData = await omdbApi.discoverSeasonEpisodes(
          seriesImdbId,
          seasonNum,
          {
            maxEpisodes: 30,
            maxConsecutiveFailures: 3
          }
        );

        if (episodeData.length > 0) {
          // Found episodes, reset empty counter
          consecutiveEmptySeasons = 0;
          totalSeasons = seasonNum;

          // Store in cache
          this.cache[seriesImdbId].seasons[seasonNum] = {
            episodes: episodeData,
            timestamp: Date.now(),
            fullyLoaded: true,
            episodeCount: episodeData.length
          };

          console.log('[BackgroundEpisodes] ✓ Cached Season', seasonNum, ':', episodeData.length, 'episodes');
        } else {
          // No episodes found
          consecutiveEmptySeasons++;
          console.log('[BackgroundEpisodes] ✗ Season', seasonNum, 'empty (', consecutiveEmptySeasons, '/', maxConsecutiveEmptySeasons, ')');

          if (consecutiveEmptySeasons >= maxConsecutiveEmptySeasons) {
            console.log('[BackgroundEpisodes] Stopping after', consecutiveEmptySeasons, 'empty seasons');
            break;
          }
        }

        // Rate limiting between seasons
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.warn('[BackgroundEpisodes] Error fetching Season', seasonNum, ':', error);
        consecutiveEmptySeasons++;

        if (consecutiveEmptySeasons >= maxConsecutiveEmptySeasons) {
          break;
        }
      }
    }

    // Update cache metadata
    this.cache[seriesImdbId].totalSeasons = totalSeasons;
    this.cache[seriesImdbId].lastUpdated = Date.now();
    this.cache[seriesImdbId].isBackgroundFetching = false;

    // Save to storage
    this.saveCacheToStorage();

    console.log('[BackgroundEpisodes] ✓ Completed:', seriesTitle, `(${totalSeasons} seasons, ${this.getTotalEpisodesCount(seriesImdbId)} episodes)`);
  }

  /**
   * Check if cache is valid for a series
   */
  private isCacheValid(seriesImdbId: string): boolean {
    const cached = this.cache[seriesImdbId];
    if (!cached) return false;

    const now = Date.now();
    const isExpired = now - cached.lastUpdated > this.CACHE_DURATION;
    return !isExpired && Object.keys(cached.seasons).length > 0;
  }

  /**
   * Get cached episodes for a specific season
   */
  getSeasonEpisodes(seriesImdbId: string, seasonNumber: number): OMDBEpisodeDetails[] | null {
    const cached = this.cache[seriesImdbId];
    if (!cached) return null;

    const season = cached.seasons[seasonNumber];
    if (!season) return null;

    // Check if data is still valid
    const now = Date.now();
    const isExpired = now - season.timestamp > this.CACHE_DURATION;
    if (isExpired) return null;

    return season.episodes;
  }

  /**
   * Get total number of seasons for a series
   */
  getTotalSeasons(seriesImdbId: string): number {
    const cached = this.cache[seriesImdbId];
    return cached ? cached.totalSeasons : 0;
  }

  /**
   * Get total episode count for a series
   */
  getTotalEpisodesCount(seriesImdbId: string): number {
    const cached = this.cache[seriesImdbId];
    if (!cached) return 0;

    return Object.values(cached.seasons).reduce((total, season) => total + season.episodeCount, 0);
  }

  /**
   * Check if series is currently being fetched in background
   */
  isSeriesBeingFetched(seriesImdbId: string): boolean {
    const cached = this.cache[seriesImdbId];
    return cached ? cached.isBackgroundFetching : false;
  }

  /**
   * Get cache status for a series
   */
  getSeriesStatus(seriesImdbId: string): {
    cached: boolean;
    totalSeasons: number;
    totalEpisodes: number;
    lastUpdated: Date | null;
    isBeingFetched: boolean;
  } {
    const cached = this.cache[seriesImdbId];
    if (!cached) {
      return {
        cached: false,
        totalSeasons: 0,
        totalEpisodes: 0,
        lastUpdated: null,
        isBeingFetched: false
      };
    }

    return {
      cached: this.isCacheValid(seriesImdbId),
      totalSeasons: cached.totalSeasons,
      totalEpisodes: this.getTotalEpisodesCount(seriesImdbId),
      lastUpdated: new Date(cached.lastUpdated),
      isBeingFetched: cached.isBackgroundFetching
    };
  }

  /**
   * Force refresh a series (clear cache and re-fetch)
   */
  forceRefreshSeries(seriesImdbId: string, seriesTitle: string): void {
    // Clear from cache
    delete this.cache[seriesImdbId];
    this.saveCacheToStorage();

    // Add to queue with high priority
    this.addSeriesToQueue(seriesImdbId, seriesTitle, 'high');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentlyProcessing: string | null;
  } {
    return {
      queueLength: this.fetchQueue.length,
      isProcessing: this.isProcessingQueue,
      currentlyProcessing: this.isProcessingQueue && this.fetchQueue.length > 0 ? this.fetchQueue[0].seriesTitle : null
    };
  }

  /**
   * Clear all cache and queue
   */
  clearAll(): void {
    this.cache = {};
    this.fetchQueue = [];
    this.saveCacheToStorage();
    this.saveQueueToStorage();
    console.log('[BackgroundEpisodes] Cleared all cache and queue');
  }
}

// Export singleton instance
export const backgroundEpisodeService = new BackgroundEpisodeService();