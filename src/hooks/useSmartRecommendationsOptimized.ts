// src/hooks/useSmartRecommendationsOptimized.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import { useCollections } from './useCollections';
import { enhancedSmartRecommendationsService } from '../services/enhancedSmartRecommendationsService';
import { backgroundRecommendationService } from '../services/backgroundRecommendationService';
import { smartCacheService } from '../services/smartCacheService';
import type { 
  MovieRecommendation, 
  RecommendationFilters,
  UserProfile 
} from '../services/smartRecommendationsService';

type LoadingState = 
  | 'idle' 
  | 'loading' 
  | 'cache_checking'
  | 'cache_hit' 
  | 'background_cache_hit'
  | 'generating' 
  | 'api_generation'
  | 'background_updating'
  | 'complete' 
  | 'error';

interface UseSmartRecommendationsOptions {
  autoLoad?: boolean;
  maxRecommendations?: number;
  enableBackgroundUpdates?: boolean;
  enableActivityTracking?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
}

interface CachedRecommendations {
  recommendations: MovieRecommendation[];
  userProfile: UserProfile | null;
  timestamp: number;
  filters: RecommendationFilters;
  generationTime: number;
  quality: number;
  source: 'fresh' | 'cache' | 'background';
}

interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  backgroundUpdatesReceived: number;
  totalRegenerations: number;
  averageGenerationTime: number;
  lastUpdateSource: string;
}

interface RecommendationState {
  recommendations: MovieRecommendation[];
  userProfile: UserProfile | null;
  loading: boolean;
  loadingState: LoadingState;
  error: string | null;
  lastFilters: RecommendationFilters;
  hasRecommendations: boolean;
  canGenerate: boolean;
  isBackgroundUpdating: boolean;
  performanceMetrics: PerformanceMetrics;
}

export function useSmartRecommendationsOptimized(
  options: UseSmartRecommendationsOptions = {}
) {
  const { user } = useAuth();
  const { collections, loading: collectionsLoading } = useCollections({ collectionType: 'all' });
  
  const {
    autoLoad = true,
    maxRecommendations = 20,
    enableBackgroundUpdates = true,
    enableActivityTracking = true,
    cacheTimeout = 60 * 60 * 1000, // 1 hour
    retryAttempts = 2
  } = options;

  // Core state
  const [state, setState] = useState<RecommendationState>({
    recommendations: [],
    userProfile: null,
    loading: false,
    loadingState: 'idle',
    error: null,
    lastFilters: {},
    hasRecommendations: false,
    canGenerate: false,
    isBackgroundUpdating: false,
    performanceMetrics: {
      loadTime: 0,
      cacheHitRate: 0,
      backgroundUpdatesReceived: 0,
      totalRegenerations: 0,
      averageGenerationTime: 0,
      lastUpdateSource: 'none'
    }
  });

  // Refs for tracking
  const sessionStartRef = useRef<number>(Date.now());
  const generationTimesRef = useRef<number[]>([]);
  const retryCountRef = useRef<number>(0);
  const lastActivityUpdateRef = useRef<number>(0);

  // Memoized values
  const canGenerate = useMemo(() => 
    !collectionsLoading && collections.length >= 3, 
    [collectionsLoading, collections.length]
  );

  const hasRecommendations = useMemo(() => 
    state.recommendations.length > 0, 
    [state.recommendations.length]
  );

  /**
   * Update state with partial updates
   */
  const updateState = useCallback((updates: Partial<RecommendationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Track user activity for background service
   */
  const trackActivity = useCallback((activity: {
    recommendationsViewed?: number;
    actionsPerformed?: number;
    sessionEndTime?: number;
  }) => {
    if (!enableActivityTracking || !user) return;

    const now = Date.now();
    
    // Throttle activity updates to avoid spam
    if (now - lastActivityUpdateRef.current < 30000) return; // Max once per 30 seconds
    
    backgroundRecommendationService.updateUserActivity(user.id, {
      sessionStartTime: sessionStartRef.current,
      sessionEndTime: activity.sessionEndTime,
      collectionsModified: false,
      ...activity
    });

    lastActivityUpdateRef.current = now;
  }, [enableActivityTracking, user]);

  /**
   * Enhanced recommendation loading with multiple strategies
   */
  const loadRecommendations = useCallback(async (
    filters: RecommendationFilters = {},
    options: { 
      force?: boolean; 
      background?: boolean; 
      priority?: 'high' | 'medium' | 'low';
      source?: string;
    } = {}
  ) => {
    if (!user || !canGenerate) {
      console.log('[EnhancedHook] Cannot generate - missing user or insufficient collection');
      return;
    }

    const { 
      force = false, 
      background = false, 
      priority = 'medium',
      source = 'user_request'
    } = options;

    const startTime = performance.now();
    let cacheHit = false;
    
    try {
      if (!background) {
        updateState({ 
          loading: true, 
          loadingState: 'cache_checking',
          error: null 
        });
      }

      console.log(`[EnhancedHook] Loading recommendations (source: ${source}, force: ${force})`);

      // Strategy 1: Hot cache check (memory + localStorage)
      if (!force) {
        updateState({ loadingState: 'cache_checking' });
        
        const cacheKey = getCacheKey(user.id, filters);
        const cached = await smartCacheService.get<CachedRecommendations>(cacheKey, {
          ttl: cacheTimeout,
          persistToStorage: true,
          priority: priority
        });

        if (cached && cached.recommendations.length > 0) {
          const cacheAge = Date.now() - cached.timestamp;
          const isStale = cacheAge > cacheTimeout * 0.7; // Consider stale at 70% of TTL

          updateState({
            recommendations: cached.recommendations,
            userProfile: cached.userProfile,
            loadingState: 'cache_hit',
            loading: false,
            lastFilters: filters,
            hasRecommendations: true,
            performanceMetrics: {
              ...state.performanceMetrics,
              loadTime: performance.now() - startTime,
              cacheHitRate: updateCacheHitRate(true),
              lastUpdateSource: 'cache'
            }
          });

          cacheHit = true;

          // Schedule background refresh if cache is getting stale
          if (isStale && enableBackgroundUpdates) {
            backgroundRecommendationService.scheduleRecommendationUpdate(user.id, collections, {
              delay: 5000, // 5 second delay
              priority: 'low',
              trigger: 'cache_expiry',
              filters
            });
            
            updateState({ isBackgroundUpdating: true });
          }

          // Track activity
          trackActivity({ recommendationsViewed: cached.recommendations.length });

          return;
        }
      }

      // Strategy 2: Generate fresh recommendations
      updateState({ loadingState: 'generating' });
      
      const newRecommendations = await enhancedSmartRecommendationsService.generateRecommendations(
        collections,
        filters,
        {
          userId: user.id,
          useCache: true,
          priority: priority,
          background: background,
          maxRecommendations,
          enableProfiling: true
        }
      );

      const generationTime = performance.now() - startTime;
      generationTimesRef.current.push(generationTime);
      
      // Keep only recent generation times for average calculation
      if (generationTimesRef.current.length > 10) {
        generationTimesRef.current = generationTimesRef.current.slice(-10);
      }

      // Update state with fresh recommendations
      updateState({
        recommendations: newRecommendations,
        userProfile: null, // Will be set by service
        loading: false,
        loadingState: 'complete',
        lastFilters: filters,
        hasRecommendations: newRecommendations.length > 0,
        performanceMetrics: {
          ...state.performanceMetrics,
          loadTime: generationTime,
          cacheHitRate: updateCacheHitRate(false),
          totalRegenerations: state.performanceMetrics.totalRegenerations + 1,
          averageGenerationTime: generationTimesRef.current.reduce((sum, time) => sum + time, 0) / generationTimesRef.current.length,
          lastUpdateSource: background ? 'background_generation' : 'fresh_generation'
        }
      });

      // Schedule smart background updates
      if (enableBackgroundUpdates) {
        backgroundRecommendationService.scheduleSmartUpdates(user.id, collections);
      }

      // Reset retry count on success
      retryCountRef.current = 0;

      // Track activity
      trackActivity({ 
        recommendationsViewed: newRecommendations.length,
        actionsPerformed: 1 
      });

      console.log(`[EnhancedHook] Generated ${newRecommendations.length} recommendations in ${Math.round(generationTime)}ms`);

    } catch (error) {
      console.error('[EnhancedHook] Load error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recommendations';
      
      // Retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        const retryDelay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
        
        console.log(`[EnhancedHook] Retrying in ${retryDelay}ms (attempt ${retryCountRef.current + 1})`);
        
        setTimeout(() => {
          loadRecommendations(filters, { ...options, force: true });
        }, retryDelay);
        
        updateState({ 
          loadingState: 'loading',
          error: `Retrying... (${retryCountRef.current}/${retryAttempts})`
        });
        
        return;
      }

      // Try fallback cache after exhausting retries
      const fallbackRecommendations = await getFallbackRecommendations(user.id, filters);
      
      if (fallbackRecommendations.length > 0) {
        updateState({
          recommendations: fallbackRecommendations,
          loading: false,
          loadingState: 'complete',
          error: `Using cached results (${errorMessage})`,
          hasRecommendations: true,
          performanceMetrics: {
            ...state.performanceMetrics,
            loadTime: performance.now() - startTime,
            lastUpdateSource: 'fallback_cache'
          }
        });
      } else {
        updateState({
          loading: false,
          loadingState: 'error',
          error: errorMessage,
          performanceMetrics: {
            ...state.performanceMetrics,
            loadTime: performance.now() - startTime,
            lastUpdateSource: 'error'
          }
        });
      }
    }
  }, [
    user, 
    canGenerate, 
    collections, 
    cacheTimeout, 
    maxRecommendations, 
    enableBackgroundUpdates, 
    retryAttempts, 
    trackActivity,
    state.performanceMetrics
  ]);

  /**
   * Handle background recommendation updates
   */
  useEffect(() => {
    if (!enableBackgroundUpdates || !user) return;

    const handleBackgroundRecommendations = (event: CustomEvent) => {
      const { userId, recommendations, trigger } = event.detail;
      
      if (userId !== user.id) return;

      console.log(`[EnhancedHook] Received background recommendations: ${recommendations.length} items (trigger: ${trigger})`);

      // Only update if we don't have fresh recommendations or if this is higher quality
      const shouldUpdate = 
        state.recommendations.length === 0 || 
        trigger === 'user_action' ||
        recommendations.length > state.recommendations.length;

      if (shouldUpdate) {
        updateState({
          recommendations,
          hasRecommendations: recommendations.length > 0,
          isBackgroundUpdating: false,
          performanceMetrics: {
            ...state.performanceMetrics,
            backgroundUpdatesReceived: state.performanceMetrics.backgroundUpdatesReceived + 1,
            lastUpdateSource: `background_${trigger}`
          }
        });
      } else {
        updateState({ isBackgroundUpdating: false });
      }

      // Track activity
      trackActivity({ recommendationsViewed: recommendations.length });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('backgroundRecommendationsReady', handleBackgroundRecommendations as EventListener);
      
      return () => {
        window.removeEventListener('backgroundRecommendationsReady', handleBackgroundRecommendations as EventListener);
      };
    }
  }, [enableBackgroundUpdates, user, state.recommendations.length, state.performanceMetrics, trackActivity, updateState]);

  /**
   * Auto-load recommendations on mount and collection changes
   */
  useEffect(() => {
    if (!autoLoad || !canGenerate) return;

    // Load recommendations when user and collections are ready
    if (user && collections.length > 0) {
      loadRecommendations({}, { source: 'auto_load' });
    }
  }, [autoLoad, canGenerate, user, collections.length, loadRecommendations]);

  /**
   * Track collection changes for background updates
   */
  useEffect(() => {
    if (!enableBackgroundUpdates || !user || collections.length === 0) return;

    // Schedule background update when collection changes
    backgroundRecommendationService.scheduleRecommendationUpdate(user.id, collections, {
      delay: 10000, // 10 second delay to batch changes
      priority: 'medium',
      trigger: 'collection_change',
      force: false
    });

    console.log(`[EnhancedHook] Scheduled background update due to collection change (${collections.length} items)`);
  }, [enableBackgroundUpdates, user, collections.length]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Track session end
      if (enableActivityTracking && user) {
        backgroundRecommendationService.updateUserActivity(user.id, {
          sessionStartTime: sessionStartRef.current,
          sessionEndTime: Date.now(),
          collectionsModified: false,
          recommendationsViewed: state.recommendations.length
        });
      }
    };
  }, [enableActivityTracking, user, state.recommendations.length]);

  /**
   * Utility functions
   */
  const getCacheKey = useCallback((userId: string, filters: RecommendationFilters) => {
    const filterHash = JSON.stringify(filters);
    const dateKey = Math.floor(Date.now() / (60 * 60 * 1000)); // Hourly cache invalidation
    return `recommendations_enhanced_${userId}_${filterHash}_${dateKey}`;
  }, []);

  const updateCacheHitRate = useCallback((wasHit: boolean) => {
    const currentRate = state.performanceMetrics.cacheHitRate;
    const totalRequests = state.performanceMetrics.totalRegenerations + 1;
    const currentHits = Math.round((currentRate / 100) * Math.max(1, totalRequests - 1));
    const newHits = currentHits + (wasHit ? 1 : 0);
    return (newHits / totalRequests) * 100;
  }, [state.performanceMetrics]);

  const getFallbackRecommendations = useCallback(async (
    userId: string, 
    filters: RecommendationFilters
  ): Promise<MovieRecommendation[]> => {
    try {
      // Try to find any cached recommendations for this user, even if expired
      const fallbackKey = `recommendations_fallback_${userId}`;
      const fallback = await smartCacheService.get<MovieRecommendation[]>(fallbackKey, {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 day fallback cache
        persistToStorage: true,
        priority: 'low'
      });

      return fallback || [];
    } catch (error) {
      console.error('[EnhancedHook] Fallback cache error:', error);
      return [];
    }
  }, []);

  /**
   * Public API methods
   */
  const refreshRecommendations = useCallback((
    filters: RecommendationFilters = state.lastFilters
  ) => {
    return loadRecommendations(filters, { 
      force: true, 
      source: 'manual_refresh',
      priority: 'high'
    });
  }, [loadRecommendations, state.lastFilters]);

  const generateRecommendations = useCallback((
    filters: RecommendationFilters = {}
  ) => {
    return loadRecommendations(filters, { 
      force: false, 
      source: 'user_generate',
      priority: 'high'
    });
  }, [loadRecommendations]);

  const clearCache = useCallback(() => {
    smartCacheService.clear();
    updateState({
      recommendations: [],
      userProfile: null,
      hasRecommendations: false,
      loadingState: 'idle',
      error: null
    });
    console.log('[EnhancedHook] Cache cleared');
  }, [updateState]);

  const getStats = useCallback(() => ({
    collectionSize: collections.length,
    recommendationCount: state.recommendations.length,
    canGenerate,
    hasRecommendations,
    cacheStats: smartCacheService.getStats(),
    backgroundServiceStats: backgroundRecommendationService.getMetrics(),
    generationStats: enhancedSmartRecommendationsService.getPerformanceMetrics()
  }), [collections.length, state.recommendations.length, canGenerate, hasRecommendations]);

  const prioritizeBackgroundUpdates = useCallback(() => {
    if (user) {
      backgroundRecommendationService.prioritizeUser(user.id);
    }
  }, [user]);

  const cancelBackgroundUpdates = useCallback(() => {
    if (user) {
      const cancelled = backgroundRecommendationService.cancelUserTasks(user.id);
      console.log(`[EnhancedHook] Cancelled ${cancelled} background tasks`);
      updateState({ isBackgroundUpdating: false });
    }
  }, [user, updateState]);

  // Return enhanced hook interface
  return {
    // Core state
    ...state,
    canGenerate,
    hasRecommendations,
    
    // Actions
    loadRecommendations,
    generateRecommendations,
    refreshRecommendations,
    
    // Cache management
    clearCache,
    
    // Background processing
    prioritizeBackgroundUpdates,
    cancelBackgroundUpdates,
    
    // Analytics
    getStats,
    
    // Activity tracking
    trackActivity,
    
    // Collection info
    collectionSize: collections.length,
    
    // Computed properties
    isStale: state.performanceMetrics.lastUpdateSource.includes('cache'),
    shouldRefresh: state.loadingState === 'cache_hit' && state.performanceMetrics.loadTime > cacheTimeout * 0.8,
    qualityScore: state.recommendations.length > 0 ? 
      state.recommendations.reduce((sum, rec) => sum + rec.score.confidence, 0) / state.recommendations.length : 0
  };
}

export default useSmartRecommendationsOptimized;