// src/hooks/useSmartRecommendations.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCollections } from './useCollections';
import { 
  smartRecommendationsService, 
  type MovieRecommendation,
  type RecommendationFilters,
  type UserProfile 
} from '../services/smartRecommendationsService';

interface UseSmartRecommendationsOptions {
  autoLoad?: boolean; // Automatically load recommendations when hook mounts
  cacheTimeout?: number; // Cache timeout in milliseconds (default: 1 hour)
}

interface RecommendationCache {
  recommendations: MovieRecommendation[];
  userProfile: UserProfile | null;
  timestamp: number;
  filters: RecommendationFilters;
}

export function useSmartRecommendations(options: UseSmartRecommendationsOptions = {}) {
  const { user } = useAuth();
  const { collections, loading: collectionsLoading } = useCollections({ collectionType: 'all' });
  
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<RecommendationFilters>({});

  const { 
    autoLoad = true, 
    cacheTimeout = 60 * 60 * 1000 // 1 hour default cache
  } = options;

  // Cache key for localStorage
  const getCacheKey = (userId: string) => `smart_recommendations_${userId}`;

  // Load cached recommendations
  const loadFromCache = useCallback((filters: RecommendationFilters): RecommendationCache | null => {
    if (!user) return null;

    try {
      const cached = localStorage.getItem(getCacheKey(user.id));
      if (!cached) return null;

      const parsedCache: RecommendationCache = JSON.parse(cached);
      
      // Check if cache is still valid
      const isExpired = Date.now() - parsedCache.timestamp > cacheTimeout;
      if (isExpired) {
        localStorage.removeItem(getCacheKey(user.id));
        return null;
      }

      // Check if filters match (simple comparison)
      const filtersMatch = JSON.stringify(filters) === JSON.stringify(parsedCache.filters);
      if (!filtersMatch) return null;

      console.log('[useSmartRecommendations] Loaded from cache:', parsedCache.recommendations.length, 'recommendations');
      return parsedCache;

    } catch (error) {
      console.error('[useSmartRecommendations] Cache load error:', error);
      return null;
    }
  }, [user, cacheTimeout]);

  // Save recommendations to cache
  const saveToCache = useCallback((
    recommendations: MovieRecommendation[], 
    userProfile: UserProfile | null,
    filters: RecommendationFilters
  ) => {
    if (!user) return;

    try {
      const cacheData: RecommendationCache = {
        recommendations,
        userProfile,
        timestamp: Date.now(),
        filters
      };

      localStorage.setItem(getCacheKey(user.id), JSON.stringify(cacheData));
      console.log('[useSmartRecommendations] Saved to cache:', recommendations.length, 'recommendations');

    } catch (error) {
      console.error('[useSmartRecommendations] Cache save error:', error);
    }
  }, [user]);

  // Generate fresh recommendations
  const generateRecommendations = useCallback(async (filters: RecommendationFilters = {}) => {
    if (!user || collectionsLoading || collections.length === 0) {
      console.log('[useSmartRecommendations] Skipping generation - no user, loading, or empty collection');
      return;
    }

    // Check cache first
    const cached = loadFromCache(filters);
    if (cached) {
      setRecommendations(cached.recommendations);
      setUserProfile(cached.userProfile);
      setLastFilters(filters);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useSmartRecommendations] Generating recommendations for', collections.length, 'items');

      const newRecommendations = await smartRecommendationsService.generateRecommendations(
        collections, 
        filters
      );

      // Get user profile for additional insights
      const profile = (smartRecommendationsService as any).analyzeUserProfile(collections);

      setRecommendations(newRecommendations);
      setUserProfile(profile);
      setLastFilters(filters);

      // Cache the results
      saveToCache(newRecommendations, profile, filters);

      // Log stats for debugging
      (smartRecommendationsService as any).getRecommendationStats(newRecommendations);

      console.log('[useSmartRecommendations] Generated', newRecommendations.length, 'recommendations');

    } catch (err) {
      console.error('[useSmartRecommendations] Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  }, [user, collections, collectionsLoading, loadFromCache, saveToCache]);

  // Refresh recommendations (bypass cache)
  const refreshRecommendations = useCallback(async (filters: RecommendationFilters = {}) => {
    if (!user) return;

    // Clear cache
    localStorage.removeItem(getCacheKey(user.id));
    
    // Generate fresh recommendations
    await generateRecommendations(filters);
  }, [user, generateRecommendations]);

  // Filter existing recommendations without regenerating
  const filterRecommendations = useCallback((filters: RecommendationFilters) => {
    let filtered = [...recommendations];

    // Apply type filter
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(rec => filters.types!.includes(rec.recommendation_type));
    }

    // Apply confidence filter
    if (filters.min_confidence) {
      filtered = filtered.filter(rec => rec.score.confidence >= filters.min_confidence!);
    }

    // Apply max results
    if (filters.max_results) {
      filtered = filtered.slice(0, filters.max_results);
    }

    return filtered;
  }, [recommendations]);

  // Get recommendations by type
  const getRecommendationsByType = useCallback((type: 'collection_gap' | 'format_upgrade' | 'similar_title') => {
    return recommendations.filter(rec => rec.recommendation_type === type);
  }, [recommendations]);

  // Get recommendation statistics
  const getStats = useCallback(() => {
    if (recommendations.length === 0) return null;

    return {
      total: recommendations.length,
      by_type: {
        collection_gap: recommendations.filter(r => r.recommendation_type === 'collection_gap').length,
        format_upgrade: recommendations.filter(r => r.recommendation_type === 'format_upgrade').length,
        similar_title: recommendations.filter(r => r.recommendation_type === 'similar_title').length
      },
      avg_confidence: recommendations.reduce((sum, r) => sum + r.score.confidence, 0) / recommendations.length,
      avg_relevance: recommendations.reduce((sum, r) => sum + r.score.relevance, 0) / recommendations.length,
      cache_age: user ? Date.now() - (JSON.parse(localStorage.getItem(getCacheKey(user.id)) || '{}').timestamp || 0) : 0
    };
  }, [recommendations, user]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(getCacheKey(user.id));
    console.log('[useSmartRecommendations] Cache cleared');
  }, [user]);

  // Auto-load recommendations when collections are ready
  useEffect(() => {
    if (autoLoad && !collectionsLoading && collections.length > 0 && recommendations.length === 0) {
      generateRecommendations({});
    }
  }, [autoLoad, collectionsLoading, collections.length, recommendations.length, generateRecommendations]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup any pending operations if needed
    };
  }, []);

  return {
    // Data
    recommendations,
    userProfile,
    loading: loading || collectionsLoading,
    error,
    lastFilters,

    // Actions
    generateRecommendations,
    refreshRecommendations,
    filterRecommendations,
    
    // Utilities
    getRecommendationsByType,
    getStats,
    clearCache,

    // State indicators
    hasRecommendations: recommendations.length > 0,
    canGenerate: !collectionsLoading && collections.length >= 3, // Minimum items for meaningful recommendations
    collectionSize: collections.length
  };
}