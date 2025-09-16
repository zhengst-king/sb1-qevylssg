// src/services/cacheService.ts
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  persistToStorage?: boolean; // Save to localStorage/IndexedDB
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export class SmartCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
  
  // Multi-level cache: Memory -> LocalStorage -> IndexedDB -> API
  async get<T>(key: string, config: CacheConfig): Promise<T | null> {
    // 1. Check memory cache first (fastest)
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult) return memoryResult;
    
    // 2. Check localStorage (fast)
    const storageResult = await this.getFromStorage<T>(key);
    if (storageResult) {
      // Promote to memory cache
      this.setInMemory(key, storageResult, config);
      return storageResult;
    }
    
    return null;
  }
  
  async set<T>(key: string, data: T, config: CacheConfig): Promise<void> {
    // Store in memory
    this.setInMemory(key, data, config);
    
    // Store in localStorage if configured
    if (config.persistToStorage) {
      await this.setInStorage(key, data, config);
    }
  }
  
  // Smart cache warming - preload likely needed data
  async warmCache(userId: string, collections: any[]): Promise<void> {
    console.log('[Cache] Warming cache for user:', userId);
    
    // Pre-fetch popular searches based on user's collection
    const warmingTasks = this.generateWarmingTasks(collections);
    
    // Execute warming tasks in background
    Promise.all(warmingTasks.map(task => 
      this.executeWarmingTask(task).catch(err => 
        console.warn('[Cache] Warming task failed:', err)
      )
    ));
  }
  
  // Intelligent cache invalidation
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const [key] of this.memoryCache) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        localStorage.removeItem(key);
      }
    }
  }
  
  // Cache analytics
  getStats(): CacheStats {
    return {
      memorySize: this.memoryCache.size,
      hitRate: this.calculateHitRate(),
      totalRequests: this.getTotalRequests(),
      cacheSize: this.calculateCacheSize()
    };
  }
}