// src/services/omdbServiceOptimized.ts
export class OptimizedOMDBService {
  private cache: SmartCacheService;
  private requestQueue: RequestQueue;
  private batchProcessor: BatchProcessor;
  
  constructor() {
    this.cache = new SmartCacheService();
    this.requestQueue = new RequestQueue({
      maxConcurrency: 2, // Respect OMDB rate limits
      delayBetweenRequests: 200 // Reduced from 300ms
    });
    this.batchProcessor = new BatchProcessor();
  }
  
  // Batch multiple requests efficiently
  async getMultipleMovieDetails(imdbIds: string[]): Promise<Map<string, OMDBMovieDetails>> {
    const results = new Map<string, OMDBMovieDetails>();
    const uncachedIds: string[] = [];
    
    // Check cache first
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
    
    console.log(`[OMDB] Cache hit: ${imdbIds.length - uncachedIds.length}/${imdbIds.length} requests`);
    
    // Batch fetch uncached items
    if (uncachedIds.length > 0) {
      const batchResults = await this.batchProcessor.processBatch(
        uncachedIds,
        (id) => this.fetchMovieDetailsWithCache(id),
        { batchSize: 3, delayBetweenBatches: 600 } // Process 3 at a time
      );
      
      batchResults.forEach((result, id) => {
        if (result) results.set(id, result);
      });
    }
    
    return results;
  }
  
  // Optimized search with intelligent caching
  async searchMoviesOptimized(
    query: string, 
    options: { useCache?: boolean; priority?: 'high' | 'low' } = {}
  ): Promise<OMDBSearchResponse> {
    const { useCache = true, priority = 'low' } = options;
    const cacheKey = `omdb_search_${query.toLowerCase().trim()}`;
    
    if (useCache) {
      const cached = await this.cache.get<OMDBSearchResponse>(cacheKey, {
        ttl: 60 * 60 * 1000, // 1 hour for search results
        persistToStorage: true
      });
      
      if (cached) {
        console.log('[OMDB] Using cached search results for:', query);
        return cached;
      }
    }
    
    // Add to request queue with priority
    const result = await this.requestQueue.add(() => 
      this.originalOMDBApi.searchMovies(query),
      { priority }
    );
    
    // Cache successful results
    if (result.Response === 'True') {
      await this.cache.set(cacheKey, result, {
        ttl: 60 * 60 * 1000,
        persistToStorage: true
      });
    }
    
    return result;
  }
  
  // Background prefetching for likely searches
  async prefetchLikelySearches(userProfile: UserProfile): Promise<void> {
    const likelySearches = this.generateLikelySearches(userProfile);
    
    // Queue background prefetch tasks
    likelySearches.forEach(search => {
      this.requestQueue.add(
        () => this.searchMoviesOptimized(search, { priority: 'low' }),
        { priority: 'low', background: true }
      );
    });
  }
}