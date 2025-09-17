// src/services/smartCacheService.ts
import type { PhysicalMediaCollection } from '../lib/supabase';

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  persistToStorage?: boolean; // Save to localStorage
  priority?: 'high' | 'medium' | 'low'; // Cache priority for eviction
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'high' | 'medium' | 'low';
  size?: number; // Estimated size in bytes
}

interface CacheStats {
  memorySize: number;
  storageSize: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  avgAccessTime: number;
  memoryUsage: number; // Bytes
}

interface WarmingTask {
  key: string;
  priority: number;
  estimatedSize: number;
  generator: () => Promise<any>;
}

export class SmartCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly MAX_MEMORY_SIZE = 50; // Maximum entries in memory
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB localStorage limit
  
  // Statistics tracking
  private stats = {
    totalRequests: 0,
    totalHits: 0,
    memoryHits: 0,
    storageHits: 0,
    totalAccessTime: 0
  };

  constructor() {
    this.initializeCleanupSchedule();
  }

  /**
   * Get data from cache with fallback strategy:
   * Memory -> LocalStorage -> null
   */
  async get<T>(key: string, config: CacheConfig): Promise<T | null> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      // Strategy 1: Check memory cache (fastest ~0.1ms)
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.stats.totalHits++;
        this.stats.memoryHits++;
        this.updateAccessTime(startTime);
        return memoryResult;
      }

      // Strategy 2: Check localStorage (fast ~1-5ms)
      if (config.persistToStorage) {
        const storageResult = await this.getFromStorage<T>(key);
        if (storageResult !== null) {
          // Promote to memory cache for faster future access
          this.setInMemory(key, storageResult, config);
          this.stats.totalHits++;
          this.stats.storageHits++;
          this.updateAccessTime(startTime);
          return storageResult;
        }
      }

      this.updateAccessTime(startTime);
      return null;

    } catch (error) {
      console.error('[SmartCache] Get error:', error);
      this.updateAccessTime(startTime);
      return null;
    }
  }

  /**
   * Set data in cache with intelligent storage strategy
   */
  async set<T>(key: string, data: T, config: CacheConfig): Promise<void> {
    try {
      // Always store in memory for fast access
      this.setInMemory(key, data, config);

      // Store in localStorage if configured and under size limit
      if (config.persistToStorage) {
        await this.setInStorage(key, data, config);
      }

      console.log(`[SmartCache] Cached ${key} (TTL: ${config.ttl}ms, Priority: ${config.priority || 'medium'})`);

    } catch (error) {
      console.error('[SmartCache] Set error:', error);
    }
  }

  /**
   * Memory cache operations
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  private setInMemory<T>(key: string, data: T, config: CacheConfig): void {
    // Enforce memory size limit with LRU eviction
    if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      priority: config.priority || 'medium',
      size: this.estimateSize(data)
    };

    this.memoryCache.set(key, entry);
  }

  /**
   * LocalStorage cache operations
   */
  private async getFromStorage<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return parsed.data;

    } catch (error) {
      console.error('[SmartCache] Storage get error:', error);
      return null;
    }
  }

  private async setInStorage<T>(key: string, data: T, config: CacheConfig): Promise<void> {
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
        priority: config.priority || 'medium'
      };

      const serialized = JSON.stringify(entry);
      
      // Check storage size limit
      if (this.getStorageSize() + serialized.length > this.MAX_STORAGE_SIZE) {
        await this.evictStorageEntries();
      }

      localStorage.setItem(`cache_${key}`, serialized);

    } catch (error) {
      // Storage full or other error - try to free space
      if (error.name === 'QuotaExceededError') {
        await this.evictStorageEntries();
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify({ data, timestamp: Date.now(), ttl: config.ttl }));
        } catch (retryError) {
          console.warn('[SmartCache] Failed to cache to storage after eviction:', retryError);
        }
      } else {
        console.error('[SmartCache] Storage set error:', error);
      }
    }
  }

  /**
   * Smart cache warming - preload likely needed data
   */
  async warmCache(userId: string, collections: PhysicalMediaCollection[]): Promise<void> {
    if (collections.length === 0) return;

    console.log(`[SmartCache] Starting cache warming for user ${userId} with ${collections.length} items`);

    const warmingTasks = this.generateWarmingTasks(userId, collections);
    const startTime = performance.now();

    // Execute warming tasks with concurrency limit
    const concurrency = 3; // Limit concurrent warming tasks
    const results = await this.executeConcurrentTasks(warmingTasks, concurrency);

    const warmingTime = performance.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    console.log(`[SmartCache] Warming completed: ${successCount}/${warmingTasks.length} tasks in ${Math.round(warmingTime)}ms`);
  }

  private generateWarmingTasks(userId: string, collections: PhysicalMediaCollection[]): WarmingTask[] {
    const tasks: WarmingTask[] = [];

    // Task 1: Popular genre searches based on user's collection
    const genres = this.extractTopGenres(collections, 3);
    genres.forEach(genre => {
      tasks.push({
        key: `omdb_search_${genre.toLowerCase()}`,
        priority: 80,
        estimatedSize: 2000, // Estimated JSON size
        generator: () => this.warmGenreSearch(genre)
      });
    });

    // Task 2: Director searches for favorite directors
    const directors = this.extractTopDirectors(collections, 2);
    directors.forEach(director => {
      tasks.push({
        key: `omdb_search_director_${director.toLowerCase().replace(/\s+/g, '_')}`,
        priority: 60,
        estimatedSize: 1500,
        generator: () => this.warmDirectorSearch(director)
      });
    });

    // Task 3: User's recommendation preferences
    tasks.push({
      key: `user_profile_${userId}`,
      priority: 90,
      estimatedSize: 500,
      generator: () => this.warmUserProfile(userId, collections)
    });

    return tasks.sort((a, b) => b.priority - a.priority);
  }

  private async executeConcurrentTasks(tasks: WarmingTask[], concurrency: number): Promise<Array<{ success: boolean; error?: Error }>> {
    const results: Array<{ success: boolean; error?: Error }> = [];
    
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async task => {
          try {
            const data = await task.generator();
            await this.set(task.key, data, {
              ttl: 30 * 60 * 1000, // 30 minute TTL for warmed cache
              persistToStorage: true,
              priority: 'low' // Warmed data has lower priority
            });
            return { success: true };
          } catch (error) {
            return { success: false, error: error as Error };
          }
        })
      );

      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      ));

      // Small delay between batches to avoid overwhelming APIs
      if (i + concurrency < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Cache invalidation with pattern matching
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let invalidatedCount = 0;

    // Invalidate memory cache
    for (const [key] of this.memoryCache) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidate localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_') && regex.test(key.substring(6))) {
        localStorage.removeItem(key);
        invalidatedCount++;
      }
    }

    console.log(`[SmartCache] Invalidated ${invalidatedCount} entries matching pattern: ${pattern}`);
    return invalidatedCount;
  }

  /**
   * Cache eviction strategies
   */
  private evictLeastRecentlyUsed(): void {
    if (this.memoryCache.size === 0) return;

    // Find entry with lowest priority and oldest access time
    let lruKey = '';
    let lruEntry: CacheEntry<any> | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.memoryCache) {
      // Calculate eviction score (lower = more likely to evict)
      const priorityWeight = entry.priority === 'high' ? 100 : entry.priority === 'medium' ? 50 : 10;
      const accessWeight = Math.max(1, entry.accessCount) * 10;
      const timeWeight = Math.max(1, Date.now() - entry.lastAccessed);
      
      const score = priorityWeight + accessWeight - (timeWeight / 1000);

      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
        lruEntry = entry;
      }
    }

    if (lruKey && lruEntry) {
      this.memoryCache.delete(lruKey);
      console.log(`[SmartCache] Evicted ${lruKey} (score: ${Math.round(lruScore)}, accesses: ${lruEntry.accessCount})`);
    }
  }

  private async evictStorageEntries(): Promise<void> {
    const entries: Array<{ key: string; priority: string; timestamp: number; size: number }> = [];

    // Collect all cache entries from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          entries.push({
            key,
            priority: data.priority || 'medium',
            timestamp: data.timestamp || 0,
            size: (localStorage.getItem(key) || '').length
          });
        } catch (error) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by eviction priority (low priority, older items first)
    entries.sort((a, b) => {
      const priorityScore = (p: string) => p === 'high' ? 3 : p === 'medium' ? 2 : 1;
      const priorityDiff = priorityScore(a.priority) - priorityScore(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Remove entries until we're under the size limit
    let freedSpace = 0;
    const targetSpace = this.MAX_STORAGE_SIZE * 0.3; // Free 30% of storage
    
    for (const entry of entries) {
      localStorage.removeItem(entry.key);
      freedSpace += entry.size;
      
      if (freedSpace >= targetSpace) break;
    }

    console.log(`[SmartCache] Evicted ${entries.length} storage entries, freed ${Math.round(freedSpace / 1024)}KB`);
  }

  /**
   * Utility methods
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough byte estimate (UTF-16)
    } catch {
      return 1000; // Default estimate
    }
  }

  private getStorageSize(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    return total;
  }

  private updateAccessTime(startTime: number): void {
    const accessTime = performance.now() - startTime;
    this.stats.totalAccessTime += accessTime;
  }

  private extractTopGenres(collections: PhysicalMediaCollection[], limit: number): string[] {
    const genreCounts = new Map<string, number>();
    
    collections.forEach(item => {
      if (item.genre) {
        const genres = item.genre.split(',').map(g => g.trim());
        genres.forEach(genre => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      }
    });

    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([genre]) => genre);
  }

  private extractTopDirectors(collections: PhysicalMediaCollection[], limit: number): string[] {
    const directorCounts = new Map<string, number>();
    
    collections.forEach(item => {
      if (item.director) {
        const directors = item.director.split(',').map(d => d.trim());
        directors.forEach(director => {
          directorCounts.set(director, (directorCounts.get(director) || 0) + 1);
        });
      }
    });

    return Array.from(directorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([director]) => director);
  }

  // Warming task generators
  private async warmGenreSearch(genre: string): Promise<any> {
    // This would integrate with your OMDB service
    // Return mock data for now
    return { genre, searchResults: [], timestamp: Date.now() };
  }

  private async warmDirectorSearch(director: string): Promise<any> {
    return { director, searchResults: [], timestamp: Date.now() };
  }

  private async warmUserProfile(userId: string, collections: PhysicalMediaCollection[]): Promise<any> {
    return { 
      userId, 
      topGenres: this.extractTopGenres(collections, 5),
      topDirectors: this.extractTopDirectors(collections, 3),
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup and maintenance
   */
  private initializeCleanupSchedule(): void {
    // Clean up expired entries every 10 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 10 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    let cleanedMemory = 0;
    let cleanedStorage = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        cleanedMemory++;
      }
    }

    // Clean localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (Date.now() - data.timestamp > data.ttl) {
            localStorage.removeItem(key);
            cleanedStorage++;
          }
        } catch {
          // Invalid entry, remove it
          localStorage.removeItem(key);
          cleanedStorage++;
        }
      }
    }

    if (cleanedMemory > 0 || cleanedStorage > 0) {
      console.log(`[SmartCache] Cleanup: ${cleanedMemory} memory entries, ${cleanedStorage} storage entries`);
    }
  }

  /**
   * Get cache statistics and performance metrics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.totalHits / this.stats.totalRequests) * 100 : 0;
    
    const avgAccessTime = this.stats.totalRequests > 0 ? 
      this.stats.totalAccessTime / this.stats.totalRequests : 0;

    return {
      memorySize: this.memoryCache.size,
      storageSize: this.getStorageEntriesCount(),
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
      avgAccessTime: Math.round(avgAccessTime * 100) / 100,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  private getStorageEntriesCount(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) count++;
    }
    return count;
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const [, entry] of this.memoryCache) {
      totalSize += entry.size || 0;
    }
    return totalSize;
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    // Clear memory
    this.memoryCache.clear();
    
    // Clear localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    }
    
    // Reset stats
    this.stats = {
      totalRequests: 0,
      totalHits: 0,
      memoryHits: 0,
      storageHits: 0,
      totalAccessTime: 0
    };
    
    console.log('[SmartCache] All cache data cleared');
  }
}

// Export singleton instance
export const smartCacheService = new SmartCacheService();