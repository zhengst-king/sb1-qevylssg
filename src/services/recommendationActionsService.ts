// src/services/recommendationActionsService.ts
import { supabase } from '../lib/supabase';
import type { MovieRecommendation } from './smartRecommendationsService';
import type { CollectionType, PhysicalMediaCollection } from '../lib/supabase';

// Action types that users can take on recommendations
export type RecommendationAction = 'add_to_wishlist' | 'mark_as_owned' | 'not_interested' | 'viewed';

// Feedback reasons for 'not_interested' actions
export type FeedbackReason = 'not_my_genre' | 'already_seen' | 'too_expensive' | 'not_available' | 'poor_quality' | 'other';

// Interface for recommendation action data
export interface RecommendationActionData {
  id?: string;
  user_id: string;
  recommendation_id: string;
  imdb_id?: string;
  title: string;
  recommendation_type: 'collection_gap' | 'format_upgrade' | 'similar_title';
  recommendation_score?: number;
  action: RecommendationAction;
  action_data?: {
    collection_type?: CollectionType;
    format?: string;
    purchase_price?: number;
    [key: string]: any;
  };
  reasoning?: string;
  suggested_format?: string;
  session_id?: string;
  feedback_reason?: FeedbackReason;
  feedback_comment?: string;
  created_at?: string;
}

// Interface for recommendation session tracking
export interface RecommendationSession {
  id?: string;
  user_id: string;
  session_id: string;
  recommendation_count: number;
  filters_applied?: any;
  generation_time_ms?: number;
  cache_hit?: boolean;
  created_at?: string;
  expires_at?: string;
}

// Interface for user recommendation preferences
export interface UserRecommendationPreferences {
  id?: string;
  user_id: string;
  preferred_genres?: string[];
  avoided_genres?: string[];
  preferred_directors?: string[];
  avoided_directors?: string[];
  preferred_formats?: string[];
  min_rating?: number;
  max_price?: number;
  collection_gap_weight?: number;
  format_upgrade_weight?: number;
  similar_title_weight?: number;
  dismissal_patterns?: any;
  conversion_patterns?: any;
  created_at?: string;
  updated_at?: string;
}

// Statistics interface for analytics
export interface RecommendationActionStats {
  total_actions: number;
  actions_by_type: Record<RecommendationAction, number>;
  conversion_rate: number; // % of recommendations that result in positive actions
  top_feedback_reasons: Array<{ reason: FeedbackReason; count: number }>;
  avg_time_to_action: number; // minutes
  recommendations_by_type: Record<string, { shown: number; converted: number; rate: number }>;
}

class RecommendationActionsService {
  // Generate a unique recommendation ID
  private generateRecommendationId(recommendation: MovieRecommendation): string {
    return `rec_${recommendation.imdb_id}_${recommendation.recommendation_type}_${Date.now()}`;
  }

  // Generate a session ID for tracking recommendation batches
  public generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Record a recommendation session
  async recordRecommendationSession(
    userId: string, 
    sessionId: string, 
    recommendationCount: number,
    filtersApplied?: any,
    generationTimeMs?: number,
    cacheHit?: boolean
  ): Promise<RecommendationSession | null> {
    try {
      const { data, error } = await supabase
        .from('recommendation_sessions')
        .insert([{
          user_id: userId,
          session_id: sessionId,
          recommendation_count: recommendationCount,
          filters_applied: filtersApplied || {},
          generation_time_ms: generationTimeMs,
          cache_hit: cacheHit || false
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[RecommendationActionsService] Session recording error:', error);
      return null;
    }
  }

  // Record a user action on a recommendation
  async recordAction(
    userId: string,
    recommendation: MovieRecommendation,
    action: RecommendationAction,
    options: {
      sessionId?: string;
      actionData?: RecommendationActionData['action_data'];
      feedbackReason?: FeedbackReason;
      feedbackComment?: string;
    } = {}
  ): Promise<RecommendationActionData | null> {
    try {
      const recommendationId = this.generateRecommendationId(recommendation);
      
      const actionRecord: Omit<RecommendationActionData, 'id' | 'created_at'> = {
        user_id: userId,
        recommendation_id: recommendationId,
        imdb_id: recommendation.imdb_id,
        title: recommendation.title,
        recommendation_type: recommendation.recommendation_type,
        recommendation_score: recommendation.score.overall,
        action,
        action_data: options.actionData || {},
        reasoning: recommendation.reasoning,
        suggested_format: recommendation.suggested_format,
        session_id: options.sessionId,
        feedback_reason: options.feedbackReason,
        feedback_comment: options.feedbackComment
      };

      const { data, error } = await supabase
        .from('recommendation_actions')
        .insert([actionRecord])
        .select()
        .single();

      if (error) throw error;

      console.log(`[RecommendationActionsService] Recorded ${action} for "${recommendation.title}"`);
      return data;
    } catch (error) {
      console.error('[RecommendationActionsService] Action recording error:', error);
      return null;
    }
  }

  // Quick action: Add recommendation to wishlist
  async addToWishlist(
    userId: string,
    recommendation: MovieRecommendation,
    sessionId?: string,
    additionalData?: Partial<PhysicalMediaCollection>
  ): Promise<{ action: RecommendationActionData | null; collection: PhysicalMediaCollection | null }> {
    try {
      // First, record the action
      const action = await this.recordAction(userId, recommendation, 'add_to_wishlist', {
        sessionId,
        actionData: {
          collection_type: 'wishlist',
          format: recommendation.suggested_format || 'Blu-ray'
        }
      });

      // Then, add to the collection as wishlist item
      const collectionData: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        imdb_id: recommendation.imdb_id,
        title: recommendation.title,
        year: recommendation.year,
        genre: recommendation.genre,
        director: recommendation.director,
        poster_url: recommendation.poster_url,
        format: recommendation.suggested_format || 'Blu-ray',
        collection_type: 'wishlist',
        notes: `Added from recommendation: ${recommendation.reasoning}`,
        ...additionalData
      };

      const { data: collection, error: collectionError } = await supabase
        .from('physical_media_collections')
        .insert([{ ...collectionData, user_id: userId }])
        .select()
        .single();

      if (collectionError) {
        console.error('[RecommendationActionsService] Collection add error:', collectionError);
        return { action, collection: null };
      }

      console.log(`[RecommendationActionsService] Added "${recommendation.title}" to wishlist`);
      return { action, collection };
    } catch (error) {
      console.error('[RecommendationActionsService] Add to wishlist error:', error);
      return { action: null, collection: null };
    }
  }

  // Quick action: Mark recommendation as already owned
  async markAsOwned(
    userId: string,
    recommendation: MovieRecommendation,
    sessionId?: string,
    additionalData?: Partial<PhysicalMediaCollection>
  ): Promise<{ action: RecommendationActionData | null; collection: PhysicalMediaCollection | null }> {
    try {
      // Record the action
      const action = await this.recordAction(userId, recommendation, 'mark_as_owned', {
        sessionId,
        actionData: {
          collection_type: 'owned',
          format: recommendation.suggested_format || 'Blu-ray'
        }
      });

      // Add to collection as owned item
      const collectionData: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        imdb_id: recommendation.imdb_id,
        title: recommendation.title,
        year: recommendation.year,
        genre: recommendation.genre,
        director: recommendation.director,
        poster_url: recommendation.poster_url,
        format: recommendation.suggested_format || 'Blu-ray',
        collection_type: 'owned',
        condition: 'New',
        notes: `Added from recommendation: ${recommendation.reasoning}`,
        ...additionalData
      };

      const { data: collection, error: collectionError } = await supabase
        .from('physical_media_collections')
        .insert([{ ...collectionData, user_id: userId }])
        .select()
        .single();

      if (collectionError) {
        console.error('[RecommendationActionsService] Collection add error:', collectionError);
        return { action, collection: null };
      }

      console.log(`[RecommendationActionsService] Marked "${recommendation.title}" as owned`);
      return { action, collection };
    } catch (error) {
      console.error('[RecommendationActionsService] Mark as owned error:', error);
      return { action: null, collection: null };
    }
  }

  // Quick action: Dismiss recommendation with feedback
  async dismissRecommendation(
    userId: string,
    recommendation: MovieRecommendation,
    feedbackReason: FeedbackReason,
    sessionId?: string,
    feedbackComment?: string
  ): Promise<RecommendationActionData | null> {
    return await this.recordAction(userId, recommendation, 'not_interested', {
      sessionId,
      feedbackReason,
      feedbackComment
    });
  }

  // Record a simple view action (for analytics)
  async recordView(
    userId: string,
    recommendation: MovieRecommendation,
    sessionId?: string
  ): Promise<RecommendationActionData | null> {
    return await this.recordAction(userId, recommendation, 'viewed', { sessionId });
  }

  // Get user's recommendation action history
  async getUserActionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RecommendationActionData[]> {
    try {
      const { data, error } = await supabase
        .from('recommendation_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[RecommendationActionsService] Get history error:', error);
      return [];
    }
  }

  // Get recommendation action statistics for a user
  async getUserActionStats(userId: string): Promise<RecommendationActionStats> {
    try {
      const { data, error } = await supabase
        .from('recommendation_actions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const actions = data || [];
      const actionCounts = actions.reduce((counts, action) => {
        counts[action.action] = (counts[action.action] || 0) + 1;
        return counts;
      }, {} as Record<RecommendationAction, number>);

      const positiveActions = actions.filter(a => ['add_to_wishlist', 'mark_as_owned'].includes(a.action)).length;
      const totalActions = actions.length;
      const conversionRate = totalActions > 0 ? (positiveActions / totalActions) * 100 : 0;

      const feedbackReasons = actions
        .filter(a => a.feedback_reason)
        .reduce((reasons, action) => {
          const reason = action.feedback_reason!;
          const existing = reasons.find(r => r.reason === reason);
          if (existing) {
            existing.count++;
          } else {
            reasons.push({ reason, count: 1 });
          }
          return reasons;
        }, [] as Array<{ reason: FeedbackReason; count: number }>)
        .sort((a, b) => b.count - a.count);

      const typeStats = actions.reduce((stats, action) => {
        const type = action.recommendation_type;
        if (!stats[type]) {
          stats[type] = { shown: 0, converted: 0, rate: 0 };
        }
        stats[type].shown++;
        if (['add_to_wishlist', 'mark_as_owned'].includes(action.action)) {
          stats[type].converted++;
        }
        stats[type].rate = (stats[type].converted / stats[type].shown) * 100;
        return stats;
      }, {} as Record<string, { shown: number; converted: number; rate: number }>);

      return {
        total_actions: totalActions,
        actions_by_type: {
          add_to_wishlist: actionCounts.add_to_wishlist || 0,
          mark_as_owned: actionCounts.mark_as_owned || 0,
          not_interested: actionCounts.not_interested || 0,
          viewed: actionCounts.viewed || 0
        },
        conversion_rate: conversionRate,
        top_feedback_reasons: feedbackReasons,
        avg_time_to_action: 0, // Could calculate from session data
        recommendations_by_type: typeStats
      };
    } catch (error) {
      console.error('[RecommendationActionsService] Get stats error:', error);
      return {
        total_actions: 0,
        actions_by_type: { add_to_wishlist: 0, mark_as_owned: 0, not_interested: 0, viewed: 0 },
        conversion_rate: 0,
        top_feedback_reasons: [],
        avg_time_to_action: 0,
        recommendations_by_type: {}
      };
    }
  }

  // Get user recommendation preferences
  async getUserPreferences(userId: string): Promise<UserRecommendationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_recommendation_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      console.error('[RecommendationActionsService] Get preferences error:', error);
      return null;
    }
  }

  // Update user recommendation preferences based on actions
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserRecommendationPreferences>
  ): Promise<UserRecommendationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_recommendation_preferences')
        .upsert([{
          user_id: userId,
          ...preferences
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[RecommendationActionsService] Update preferences error:', error);
      return null;
    }
  }

  // Check if user has already acted on a recommendation
  async hasUserActedOnRecommendation(
    userId: string,
    imdbId: string,
    recommendationType: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('recommendation_actions')
        .select('id')
        .eq('user_id', userId)
        .eq('imdb_id', imdbId)
        .eq('recommendation_type', recommendationType)
        .neq('action', 'viewed'); // Don't count simple views

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('[RecommendationActionsService] Check action error:', error);
      return false;
    }
  }

  // Clean up expired recommendation sessions
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_recommendation_sessions');
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('[RecommendationActionsService] Cleanup error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const recommendationActionsService = new RecommendationActionsService();
export default recommendationActionsService;