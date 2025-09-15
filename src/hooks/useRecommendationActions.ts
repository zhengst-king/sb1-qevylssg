// src/hooks/useRecommendationActions.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useCollections } from './useCollections';
import { 
  recommendationActionsService,
  type RecommendationAction,
  type FeedbackReason,
  type RecommendationActionData,
  type RecommendationActionStats,
  type UserRecommendationPreferences
} from '../services/recommendationActionsService';
import type { MovieRecommendation } from '../services/smartRecommendationsService';
import type { PhysicalMediaCollection } from '../lib/supabase';

interface UseRecommendationActionsOptions {
  trackViews?: boolean; // Auto-track recommendation views
  sessionTimeout?: number; // Session timeout in minutes (default: 60)
}

interface RecommendationActionResult {
  success: boolean;
  action?: RecommendationActionData;
  collection?: PhysicalMediaCollection;
  error?: string;
}

export function useRecommendationActions(options: UseRecommendationActionsOptions = {}) {
  const { user } = useAuth();
  const { refetch: refetchCollections } = useCollections();
  
  const [loading, setLoading] = useState(false);
  const [actionHistory, setActionHistory] = useState<RecommendationActionData[]>([]);
  const [actionStats, setActionStats] = useState<RecommendationActionStats | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserRecommendationPreferences | null>(null);
  
  // Session management
  const sessionIdRef = useRef<string | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    trackViews = true, 
    sessionTimeout = 60 
  } = options;

  // Generate or get current session ID
  const getSessionId = useCallback((): string => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = recommendationActionsService.generateSessionId();
      
      // Set session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      
      sessionTimeoutRef.current = setTimeout(() => {
        sessionIdRef.current = null;
      }, sessionTimeout * 60 * 1000);
    }
    
    return sessionIdRef.current;
  }, [sessionTimeout]);

  // Record a recommendation session (when recommendations are generated)
  const recordSession = useCallback(async (
    recommendationCount: number,
    filtersApplied?: any,
    generationTimeMs?: number,
    cacheHit?: boolean
  ) => {
    if (!user) return null;
    
    const sessionId = getSessionId();
    return await recommendationActionsService.recordRecommendationSession(
      user.id,
      sessionId,
      recommendationCount,
      filtersApplied,
      generationTimeMs,
      cacheHit
    );
  }, [user, getSessionId]);

  // Track recommendation view (if enabled)
  const trackView = useCallback(async (recommendation: MovieRecommendation) => {
    if (!user || !trackViews) return null;
    
    const sessionId = getSessionId();
    return await recommendationActionsService.recordView(user.id, recommendation, sessionId);
  }, [user, trackViews, getSessionId]);

  // Add recommendation to wishlist
  const addToWishlist = useCallback(async (
    recommendation: MovieRecommendation,
    additionalData?: Partial<PhysicalMediaCollection>
  ): Promise<RecommendationActionResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setLoading(true);
      
      const sessionId = getSessionId();
      const result = await recommendationActionsService.addToWishlist(
        user.id,
        recommendation,
        sessionId,
        additionalData
      );

      if (result.action && result.collection) {
        // Refresh collections to show the new wishlist item
        await refetchCollections();
        
        // Add to action history
        setActionHistory(prev => [result.action!, ...prev]);
        
        return { 
          success: true, 
          action: result.action, 
          collection: result.collection 
        };
      } else {
        return { success: false, error: 'Failed to add to wishlist' };
      }
    } catch (error) {
      console.error('[useRecommendationActions] Add to wishlist error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, getSessionId, refetchCollections]);

  // Mark recommendation as already owned
  const markAsOwned = useCallback(async (
    recommendation: MovieRecommendation,
    additionalData?: Partial<PhysicalMediaCollection>
  ): Promise<RecommendationActionResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setLoading(true);
      
      const sessionId = getSessionId();
      const result = await recommendationActionsService.markAsOwned(
        user.id,
        recommendation,
        sessionId,
        additionalData
      );

      if (result.action && result.collection) {
        // Refresh collections to show the new owned item
        await refetchCollections();
        
        // Add to action history
        setActionHistory(prev => [result.action!, ...prev]);
        
        return { 
          success: true, 
          action: result.action, 
          collection: result.collection 
        };
      } else {
        return { success: false, error: 'Failed to mark as owned' };
      }
    } catch (error) {
      console.error('[useRecommendationActions] Mark as owned error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, getSessionId, refetchCollections]);

  // Dismiss recommendation with feedback
  const dismissRecommendation = useCallback(async (
    recommendation: MovieRecommendation,
    feedbackReason: FeedbackReason,
    feedbackComment?: string
  ): Promise<RecommendationActionResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setLoading(true);
      
      const sessionId = getSessionId();
      const action = await recommendationActionsService.dismissRecommendation(
        user.id,
        recommendation,
        feedbackReason,
        sessionId,
        feedbackComment
      );

      if (action) {
        // Add to action history
        setActionHistory(prev => [action, ...prev]);
        
        return { success: true, action };
      } else {
        return { success: false, error: 'Failed to dismiss recommendation' };
      }
    } catch (error) {
      console.error('[useRecommendationActions] Dismiss error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  }, [user, getSessionId]);

  // Check if user has already acted on a recommendation
  const hasActedOn = useCallback(async (
    imdbId: string,
    recommendationType: string
  ): Promise<boolean> => {
    if (!user) return false;
    
    return await recommendationActionsService.hasUserActedOnRecommendation(
      user.id,
      imdbId,
      recommendationType
    );
  }, [user]);

  // Load user's action history
  const loadActionHistory = useCallback(async (limit: number = 50, offset: number = 0) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const history = await recommendationActionsService.getUserActionHistory(user.id, limit, offset);
      setActionHistory(history);
    } catch (error) {
      console.error('[useRecommendationActions] Load history error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load user's action statistics
  const loadActionStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const stats = await recommendationActionsService.getUserActionStats(user.id);
      setActionStats(stats);
    } catch (error) {
      console.error('[useRecommendationActions] Load stats error:', error);
    }
  }, [user]);

  // Load user's recommendation preferences
  const loadUserPreferences = useCallback(async () => {
    if (!user) return;
    
    try {
      const preferences = await recommendationActionsService.getUserPreferences(user.id);
      setUserPreferences(preferences);
    } catch (error) {
      console.error('[useRecommendationActions] Load preferences error:', error);
    }
  }, [user]);

  // Update user's recommendation preferences
  const updateUserPreferences = useCallback(async (
    preferences: Partial<UserRecommendationPreferences>
  ) => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const updated = await recommendationActionsService.updateUserPreferences(user.id, preferences);
      if (updated) {
        setUserPreferences(updated);
      }
      return updated;
    } catch (error) {
      console.error('[useRecommendationActions] Update preferences error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get filtered action history by action type
  const getActionsByType = useCallback((actionType: RecommendationAction): RecommendationActionData[] => {
    return actionHistory.filter(action => action.action === actionType);
  }, [actionHistory]);

  // Get recent actions (last 24 hours)
  const getRecentActions = useCallback((): RecommendationActionData[] => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return actionHistory.filter(action => 
      new Date(action.created_at || '') > yesterday
    );
  }, [actionHistory]);

  // Bulk action helpers
  const addMultipleToWishlist = useCallback(async (
    recommendations: MovieRecommendation[]
  ): Promise<RecommendationActionResult[]> => {
    const results = await Promise.all(
      recommendations.map(rec => addToWishlist(rec))
    );
    return results;
  }, [addToWishlist]);

  // Auto-load data when user changes
  useEffect(() => {
    if (user) {
      loadActionHistory();
      loadActionStats();
      loadUserPreferences();
    } else {
      setActionHistory([]);
      setActionStats(null);
      setUserPreferences(null);
    }
  }, [user, loadActionHistory, loadActionStats, loadUserPreferences]);

  // Cleanup session timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    loading,
    actionHistory,
    actionStats,
    userPreferences,
    sessionId: sessionIdRef.current,

    // Core Actions
    addToWishlist,
    markAsOwned,
    dismissRecommendation,
    trackView,
    recordSession,

    // Utility Functions
    hasActedOn,
    getActionsByType,
    getRecentActions,
    addMultipleToWishlist,

    // Data Management
    loadActionHistory,
    loadActionStats,
    loadUserPreferences,
    updateUserPreferences,

    // Analytics helpers
    getConversionRate: () => actionStats?.conversion_rate || 0,
    getTotalActions: () => actionStats?.total_actions || 0,
    getTopFeedbackReason: () => actionStats?.top_feedback_reasons[0]?.reason || null,

    // Session management
    getCurrentSessionId: getSessionId,
    resetSession: () => {
      sessionIdRef.current = null;
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    }
  };
}