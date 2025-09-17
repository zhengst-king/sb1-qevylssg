import { omdbApi, OMDBMovieDetails, OMDBSearchResponse } from '../lib/omdb';

// Types for the service
export interface OptimizedOMDBOptions {
  useCache?: boolean;
  priority?: 'high' | 'medium' | 'low';
  background?: boolean;
  maxConcurrency?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

interface RequestQueueItem {
  id: string;
  request: () => Promise<any>;
  priority: number;
  background: boolean;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface BatchRequest {
  id: string;
  imdbId: string;
  resolve: (value: OMDBMovieDetails | null) => void;
  reject: (error: any) => void;
}

// Smart Cache Service (embedded implementation)
class SmartCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly MAX_MEMORY_ENTRIES = 500;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  };

  async get<T>(key: string, options?: { ttl?: number }): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && this.isValid(memEntry)) {
      memEntry.accessCount++;
      memEntry.lastAccess = Date.now();
      this.stats.hits++;
      return memEntry.data;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const parsedEntry = JSON.parse(stored);
        if (this.isValid(parsedEntry)) {
          // Move to memory cache for faster access
          this.memoryCache.set(key, {
            ...parsedEntry,
            lastAccess: Date.now(),
            accessCount: parsedEntry.accessCount + 1
          });
          this.stats.hits++;
          return parsedEntry.data;
        }
      }
    } catch (error) {
      console.warn('[SmartCache] Error reading from localStorage:', error);
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(key: string, data: T, options?: { ttl?: number; persistToStorage?: boolean }): Promise<void> {
    const ttl = options?.ttl || 60 * 60 * 1000; // 1 hour default
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now()
    };

    // Add to memory cache
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      this.evictLRU();
    }
    this.memoryCache.set(key, entry);

    // Persist to localStorage if requested
    if (options?.persistToStorage) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('[SmartCache] Error writing to localStorage:', error);
      }
    }

    this.stats.sets++;
  }

  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

// Request Queue Implementation
class RequestQueue {
  private queue: RequestQueueItem[] = [];
  private activeRequests = 0;
  private readonly maxConcurrency: number;
  private readonly delayBetweenRequests: number;
  private lastRequestTime = 0;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(options: { maxConcurrency?: number; delayBetweenRequests?: number } = {}) {
    this.maxConcurrency = options.maxConcurrency || 2;
    this.delayBetweenRequests = options.delayBetweenRequests || 200;
    this.startProcessing();
  }

  async add<T>(
    request: () => Promise<T>, 
    options: { priority?: 'high' | 'medium' | 'low'; background?: boolean } = {}
  ): Promise<T> {
    const priorityMap = { high: 100, medium: 50, low: 10 };
    const priority = priorityMap[options.priority || 'medium'];

    return new Promise<T>((resolve, reject) => {
      const item: RequestQueueItem = {
        id: Math.random().toString(36).substr(2, 9),
        request,
        priority,
        background: options.background || false,
        resolve,
        reject
      };

      // Insert in priority order
      let inserted = false;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].priority < priority) {
          this.queue.splice(i, 0, item);
          inserted = true;
          break;
        }
      }
      
      if (!inserted) {
        this.queue.push(item);
      }

      console.log(`[RequestQueue] Queued request (priority: ${options.priority || 'medium'}, queue size: ${this.queue.length})`);
    });
  }

  private startProcessing(): void {
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 50); // Check every 50ms
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    // Respect rate limiting
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.delayBetweenRequests) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      const result = await item.request();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeRequests--;
    }
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrency: this.maxConcurrency
    };
  }

  destroy(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }
}

// Batch Processor Implementation
class BatchProcessor {
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: { batchSize?: number; delayBetweenBatches?: number } = {}
  ): Promise<Map<T, R | null>> {
    const { batchSize = 3, delayBetweenBatches = 600 } = options;
    const results = new Map<T, R | null>();

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      console.log(`[BatchProcessor] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`);

      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );

      // Store results
      batch.forEach((item, index) => {
        const result = batchResults[index];
        if (result.status === 'fulfilled') {
          results.set(item, result.value);
        } else {
          console.error(`[BatchProcessor] Error processing ${item}:`, result.reason);
          results.set(item, null);
        }
      });

      // Delay between batches (except for the last batch)
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return results;
  }
}

// User Profile interface (simplified for this service)
interface UserProfile {
  genres?: string[];
  directors?: string[];
  actors?: string[];
  recentSearches?: string[];
}

// Main Optimized OMDB Service
export class OptimizedOMDBService {
  private cache: SmartCacheService;
  private requestQueue: RequestQueue;
  private batchProcessor: BatchProcessor;
  private batchQueue: Map<string, BatchRequest[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new SmartCacheService();
    this.requestQueue = new RequestQueue({
      maxConcurrency: 2, // Respect OMDB rate limits
      delayBetweenRequests: 200 // Reduced from 300ms for paid tier
    });
    this.batchProcessor = new BatchProcessor();
  }

  /**
   * Batch multiple movie details requests efficiently
   */
  async getMultipleMovieDetails(
    imdbIds: string[], 
    options: OptimizedOMDBOptions = {}
  ): Promise<Map<string, OMDBMovieDetails>> {
    const { useCache = true, priority = 'medium' } = options;
    const results = new Map<string, OMDBMovieDetails>();
    const uncachedIds: string[] = [];

    console.log(`[OptimizedOMDB] Fetching details for ${imdbIds.length} movies`);

    // Check cache first
    if (useCache) {
      for (const imdbId of imdbIds) {
        const cached = await this.cache.get<OMDBMovieDetails>(
          `omdb_details_${imdbId}`,
          { ttl: 24 * 60 * 60 * 1000 } // 24 hour cache for movie details
        );

        if (cached) {
          results.set(imdbId, cached);
        } else {
          uncachedIds.push(imdbId);
        }
      }

      console.log(`[OptimizedOMDB] Cache hit: ${imdbIds.length - uncachedIds.length}/${imdbIds.length} requests`);
    } else {
      uncachedIds.push(...imdbIds);
    }

    // Batch fetch uncached items
    if (uncachedIds.length > 0) {
      const batchResults = await this.batchProcessor.processBatch(
        uncachedIds,
        (id) => this.fetchMovieDetailsWithCache(id, options),
        { batchSize: 3, delayBetweenBatches: 600 } // Process 3 at a time
      );

      batchResults.forEach((result, id) => {
        if (result) {
          results.set(id, result);
        }
      });
    }

    return results;
  }

  /**
   * Optimized search with intelligent caching
   */
  async searchMoviesOptimized(
    query: string,
    options: OptimizedOMDBOptions = {}
  ): Promise<OMDBSearchResponse> {
    const { useCache = true, priority = 'medium', background = false } = options;
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `omdb_search_${normalizedQuery}`;

    if (useCache) {
      const cached = await this.cache.get<OMDBSearchResponse>(cacheKey, {
        ttl: 60 * 60 * 1000 // 1 hour for search results
      });

      if (cached) {
        console.log('[OptimizedOMDB] Using cached search results for:', query);
        return cached;
      }
    }

    // Add to request queue with priority
    const result = await this.requestQueue.add(() => 
      omdbApi.searchMovies(query),
      { priority, background }
    );

    // Cache successful results
    if (result.Response === 'True' && useCache) {
      await this.cache.set(cacheKey, result, {
        ttl: 60 * 60 * 1000,
        persistToStorage: true
      });
    }

    return result;
  }

  /**
   * Get single movie details with caching
   */
  async getMovieDetails(
    imdbId: string,
    options: OptimizedOMDBOptions = {}
  ): Promise<OMDBMovieDetails> {
    const { useCache = true, priority = 'medium', background = false } = options;
    const cacheKey = `omdb_details_${imdbId}`;

    if (useCache) {
      const cached = await this.cache.get<OMDBMovieDetails>(cacheKey);
      if (cached) {
        console.log('[OptimizedOMDB] Using cached details for:', imdbId);
        return cached;
      }
    }

    // Add to request queue
    const result = await this.requestQueue.add(() => 
      omdbApi.getMovieDetails(imdbId),
      { priority, background }
    );

    // Cache the result
    if (result && useCache) {
      await this.cache.set(cacheKey, result, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours for details
        persistToStorage: true
      });
    }

    return result;
  }

  /**
   * Background prefetching for likely searches
   */
  async prefetchLikelySearches(userProfile: UserProfile): Promise<void> {
    console.log('[OptimizedOMDB] Starting background prefetching...');
    const likelySearches = this.generateLikelySearches(userProfile);

    // Queue background prefetch tasks
    likelySearches.forEach(search => {
      this.requestQueue.add(
        () => this.searchMoviesOptimized(search, { priority: 'low', useCache: true }),
        { priority: 'low', background: true }
      );
    });

    console.log(`[OptimizedOMDB] Queued ${likelySearches.length} prefetch tasks`);
  }

  /**
   * Private helper methods
   */
  private async fetchMovieDetailsWithCache(
    imdbId: string,
    options: OptimizedOMDBOptions
  ): Promise<OMDBMovieDetails | null> {
    try {
      const details = await this.getMovieDetails(imdbId, {
        ...options,
        useCache: true
      });
      return details;
    } catch (error) {
      console.error(`[OptimizedOMDB] Error fetching details for ${imdbId}:`, error);
      return null;
    }
  }

  private generateLikelySearches(userProfile: UserProfile): string[] {
    const searches: string[] = [];

    // Add genre-based searches
    if (userProfile.genres) {
      userProfile.genres.slice(0, 3).forEach(genre => {
        searches.push(genre);
        searches.push(`best ${genre} movies`);
      });
    }

    // Add director searches
    if (userProfile.directors) {
      searches.push(...userProfile.directors.slice(0, 2));
    }

    // Add recent search variations
    if (userProfile.recentSearches) {
      userProfile.recentSearches.slice(0, 2).forEach(search => {
        searches.push(search);
        // Add variations
        if (search.includes(' ')) {
          const words = search.split(' ');
          if (words.length > 1) {
            searches.push(words[0]); // First word only
          }
        }
      });
    }

    return [...new Set(searches)]; // Remove duplicates
  }

  /**
   * Service health and statistics
   */
  getServiceStats() {
    return {
      cache: this.cache.getStats(),
      requestQueue: this.requestQueue.getStatus(),
      activeBatches: this.batchQueue.size
    };
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    // Clear cache entries
    const cacheKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_omdb_')) {
        cacheKeys.push(key);
      }
    }

    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`[OptimizedOMDB] Cleared ${cacheKeys.length} cache entries`);
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.requestQueue.destroy();
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
  }
}

// Export singleton instance
export const optimizedOMDBService = new OptimizedOMDBService();