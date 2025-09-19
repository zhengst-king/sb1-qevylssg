// src/hooks/useSmartRecommendations.ts
import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useCollections } from './useCollections';
import { optimizedOMDBService } from '../services/optimizedOMDBService';
import { smartRecommendationsService, MovieRecommendation, RecommendationFilters, UserProfile } from '../services/smartRecommendationsService';

interface UseSmartRecommendationsReturn {
  // Data
  recommendations: MovieRecommendation[];
  userProfile: UserProfile | null;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  generateRecommendations: (filters?: RecommendationFilters) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  
  // Utils
  hasRecommendations: boolean;
  canGenerate: boolean;
  collectionSize: number;
  getStats: () => RecommendationStats;
}

interface RecommendationStats {
  totalGenerated: number;
  byType: Record<string, number>;
  averageConfidence: number;
  lastGenerated: Date | null;
}

export const useSmartRecommendations = (): UseSmartRecommendationsReturn => {
  const { user } = useAuth();
  const { collections } = useCollections();
  
  // State
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RecommendationStats>({
    totalGenerated: 0,
    byType: {},
    averageConfidence: 0,
    lastGenerated: null
  });

  // Refs for request management
  const generateRequestRef = useRef<number>(0);
  const lastFiltersRef = useRef<RecommendationFilters | null>(null);

  // Generate recommendations
  const generateRecommendations = useCallback(async (filters?: RecommendationFilters) => {
    if (!user) {
      setError('Please sign in to get recommendations');
      return;
    }

    if (collections.length < 3) {
      setError(collections.length === 0 
        ? "Add some movies to your collection first to get recommendations!" 
        : `Add ${3 - collections.length} more movies to get recommendations!`
      );
      return;
    }

    setLoading(true);
    setError(null);
    
    // Increment request counter to handle concurrent requests
    const requestId = ++generateRequestRef.current;
    lastFiltersRef.current = filters || null;

    try {
      console.log('[useSmartRecommendations] Starting generation for', collections.length, 'collection items');
      console.log('[useSmartRecommendations] Using filters:', filters);

      // Default filters
      const defaultFilters: RecommendationFilters = {
        max_results: 12,
        exclude_owned: true,
        exclude_wishlist: false,
        min_confidence: 0.5,
        types: ['collection_gap', 'format_upgrade', 'similar_title'],
        ...filters
      };

      // Generate recommendations using the smart recommendations service
      const newRecommendations = await smartRecommendationsService.generateRecommendations(
        collections,
        defaultFilters
      );

      // Only update if this is still the latest request
      if (requestId === generateRequestRef.current) {
        setRecommendations(newRecommendations);

        // Update stats
        const newStats: RecommendationStats = {
          totalGenerated: newRecommendations.length,
          byType: newRecommendations.reduce((acc, rec) => {
            acc[rec.recommendation_type] = (acc[rec.recommendation_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          averageConfidence: newRecommendations.length > 0 
            ? newRecommendations.reduce((sum, rec) => sum + rec.score.confidence, 0) / newRecommendations.length 
            : 0,
          lastGenerated: new Date()
        };
        setStats(newStats);

        // Generate user profile for analytics (create a simple one for now)
        const profile: UserProfile = {
          favorite_genres: [],
          favorite_directors: [],
          format_preferences: [],
          rating_pattern: {
            avg_rating: 0,
            high_rated_threshold: 7,
            rating_count: 0
          },
          collection_stats: {
            total_items: collections.length,
            owned_items: collections.filter(c => c.collection_type === 'owned').length,
            wishlist_items: collections.filter(c => c.collection_type === 'wishlist').length,
            most_collected_decade: '2020s'
          }
        };
        setUserProfile(profile);

        if (newRecommendations.length === 0) {
          setError("No new recommendations found. Try adjusting your filters or adding more items to your collection.");
        } else {
          console.log(`[useSmartRecommendations] Generated ${newRecommendations.length} recommendations`);
        }
      }
    } catch (err) {
      console.error('[useSmartRecommendations] Error generating recommendations:', err);
      
      if (requestId === generateRequestRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate recommendations';
        setError(errorMessage);
        
        // Clear recommendations on error
        setRecommendations([]);
        setUserProfile(null);
      }
    } finally {
      if (requestId === generateRequestRef.current) {
        setLoading(false);
      }
    }
  }, [user, collections]);

  // Refresh with last used filters
  const refreshRecommendations = useCallback(async () => {
    await generateRecommendations(lastFiltersRef.current || undefined);
  }, [generateRecommendations]);

  // Computed values
  const hasRecommendations = recommendations.length > 0;
  const canGenerate = collections.length >= 3;
  const collectionSize = collections.length;

  // Get current stats
  const getStats = useCallback(() => stats, [stats]);

  return {
    // Data
    recommendations,
    userProfile,
    
    // State
    loading,
    error,
    
    // Actions
    generateRecommendations,
    refreshRecommendations,
    
    // Utils
    hasRecommendations,
    canGenerate,
    collectionSize,
    getStats
  };
};

// Additional hook for recommendation actions (simplified version)
export const useRecommendationActions = (options?: { trackViews?: boolean }) => {
  const { user } = useAuth();
  const { addToCollection } = useCollections();
  const [loading, setLoading] = useState(false);

  const addToWishlist = useCallback(async (recommendation: MovieRecommendation) => {
    if (!user) throw new Error('Not authenticated');
    
    setLoading(true);
    try {
      const result = await addToCollection({
        title: recommendation.title,
        year: recommendation.year,
        genre: recommendation.genre,
        director: recommendation.director,
        poster_url: recommendation.poster_url,
        imdb_id: recommendation.imdb_id,
        imdb_rating: recommendation.imdb_rating,
        plot: recommendation.plot,
        collection_type: 'wishlist',
        watch_status: 'To Watch',
        personal_rating: null,
        notes: `Added from smart recommendations (${recommendation.recommendation_type})`
      });

      // Log action for analytics (you can enhance this)
      console.log('[RecommendationAction] Added to wishlist:', {
        imdb_id: recommendation.imdb_id,
        title: recommendation.title,
        type: recommendation.recommendation_type
      });

      return { success: !!result, data: result };
    } catch (error) {
      console.error('[RecommendationAction] Failed to add to wishlist:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, addToCollection]);

  const markAsOwned = useCallback(async (recommendation: MovieRecommendation) => {
    if (!user) throw new Error('Not authenticated');
    
    setLoading(true);
    try {
      const result = await addToCollection({
        title: recommendation.title,
        year: recommendation.year,
        genre: recommendation.genre,
        director: recommendation.director,
        poster_url: recommendation.poster_url,
        imdb_id: recommendation.imdb_id,
        imdb_rating: recommendation.imdb_rating,
        plot: recommendation.plot,
        collection_type: 'owned',
        watch_status: 'Watched',
        personal_rating: null,
        notes: `Added from smart recommendations (${recommendation.recommendation_type})`
      });

      // Log action for analytics
      console.log('[RecommendationAction] Marked as owned:', {
        imdb_id: recommendation.imdb_id,
        title: recommendation.title,
        type: recommendation.recommendation_type
      });

      return { success: !!result, data: result };
    } catch (error) {
      console.error('[RecommendationAction] Failed to mark as owned:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, addToCollection]);

  const dismissRecommendation = useCallback(async (
    recommendation: MovieRecommendation, 
    reason?: string, 
    comment?: string
  ) => {
    // Log dismissal for learning (you can enhance this to store in database)
    console.log('[RecommendationAction] Dismissed:', {
      imdb_id: recommendation.imdb_id,
      title: recommendation.title,
      type: recommendation.recommendation_type,
      reason,
      comment
    });

    return { success: true };
  }, []);

  return {
    loading,
    addToWishlist,
    markAsOwned,
    dismissRecommendation,
    // Placeholder functions for compatibility
    trackView: () => Promise.resolve({ success: true }),
    recordSession: () => Promise.resolve({ success: true }),
    hasActedOn: () => false,
    actionStats: null,
    getConversionRate: () => 0
  };
};