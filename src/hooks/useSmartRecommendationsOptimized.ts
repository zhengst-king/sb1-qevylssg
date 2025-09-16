// src/hooks/useSmartRecommendationsOptimized.ts
export function useSmartRecommendationsOptimized(
  options: UseSmartRecommendationsOptions = {}
) {
  const { user } = useAuth();
  const { collections, loading: collectionsLoading } = useCollections();
  
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  
  const cacheService = useMemo(() => new SmartCacheService(), []);
  const backgroundService = useMemo(() => new BackgroundRecommendationService(), []);
  
  // Enhanced cache management
  const getCacheKey = useCallback((userId: string, filters: RecommendationFilters) => {
    const filtersHash = Object.keys(filters).sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `recommendations_${userId}_${filtersHash}`;
  }, []);
  
  // Load with multiple fallback strategies
  const loadRecommendations = useCallback(async (
    filters: RecommendationFilters = {},
    options: { force?: boolean; background?: boolean } = {}
  ) => {
    if (!user || collectionsLoading) return;
    
    const { force = false, background = false } = options;
    const cacheKey = getCacheKey(user.id, filters);
    
    try {
      if (!background) {
        setLoading(true);
        setLoadingState('loading');
      }
      
      // Strategy 1: Check hot cache (memory + localStorage)
      if (!force) {
        const cached = await cacheService.get<CachedRecommendations>(cacheKey, {
          ttl: 60 * 60 * 1000, // 1 hour
          persistToStorage: true
        });
        
        if (cached && cached.recommendations.length > 0) {
          setRecommendations(cached.recommendations);
          setLoadingState('cache_hit');
          
          // Trigger background refresh if cache is >30 minutes old
          const cacheAge = Date.now() - cached.timestamp;
          if (cacheAge > 30 * 60 * 1000) {
            backgroundService.scheduleRecommendationUpdate(user.id, collections, {
              delay: 1000,
              trigger: 'cache_refresh'
            });
          }
          
          return;
        }
      }
      
      setLoadingState('generating');
      
      // Strategy 2: Check background-generated recommendations
      const backgroundCached = await cacheService.get<CachedRecommendations>(
        `${cacheKey}_background`,
        { ttl: 2 * 60 * 60 * 1000 } // 2 hour TTL for background-generated
      );
      
      if (backgroundCached && !force) {
        setRecommendations(backgroundCached.recommendations);
        setLoadingState('background_cache_hit');
        return;
      }
      
      // Strategy 3: Generate new recommendations
      setLoadingState('api_generation');
      const startTime = performance.now();
      
      const newRecommendations = await optimizedSmartRecommendationsService
        .generateRecommendations(collections, filters, { 
          userId: user.id,
          useCache: true,
          priority: background ? 'low' : 'high'
        });
      
      const generationTime = performance.now() - startTime;
      
      // Cache the results
      const cacheData: CachedRecommendations = {
        recommendations: newRecommendations,
        userProfile: null, // Will be added by service
        timestamp: Date.now(),
        filters,
        generationTime,
        quality: assessRecommendationQuality(newRecommendations)
      };
      
      await cacheService.set(cacheKey, cacheData, {
        ttl: 60 * 60 * 1000,
        persistToStorage: true
      });
      
      setRecommendations(newRecommendations);
      setLoadingState('complete');
      
      // Schedule next background update
      backgroundService.scheduleRecommendationUpdate(user.id, collections, {
        delay: 45 * 60 * 1000, // Update in 45 minutes
        trigger: 'periodic'
      });
      
    } catch (error) {
      console.error('[Recommendations] Load error:', error);
      setLoadingState('error');
      
      // Fallback to any available cached data, even if expired
      await loadFallbackRecommendations(cacheKey);
      
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [user, collections, collectionsLoading]);
  
  // Performance monitoring
  useEffect(() => {
    const stats = cacheService.getStats();
    setCacheStats(stats);
  }, [recommendations]);
  
  // Auto-load on mount with smart caching
  useEffect(() => {
    if (user && collections.length > 0 && options.autoLoad !== false) {
      loadRecommendations({}, { background: false });
    }
  }, [user, collections.length]);
  
  return {
    recommendations,
    loading,
    loadingState,
    cacheStats,
    loadRecommendations,
    refreshRecommendations: (filters?: RecommendationFilters) => 
      loadRecommendations(filters, { force: true }),
    // ... other existing methods
  };
}