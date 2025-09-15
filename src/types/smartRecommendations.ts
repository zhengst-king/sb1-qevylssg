// src/types/smartRecommendations.ts
export interface RecommendationScore {
  relevance: number; // 0-1, how relevant to user's interests
  confidence: number; // 0-1, how confident we are in this recommendation
  urgency: number; // 0-1, how time-sensitive this recommendation is
}

export interface MovieRecommendation {
  imdb_id: string;
  title: string;
  year?: number;
  genre?: string;
  director?: string;
  poster_url?: string;
  imdb_rating?: number;
  plot?: string;
  
  // Recommendation metadata
  recommendation_type: 'collection_gap' | 'format_upgrade' | 'similar_title';
  reasoning: string;
  score: RecommendationScore;
  source_items: string[]; // IDs of collection items that influenced this recommendation
  suggested_format?: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
}

export interface UserProfile {
  favorite_genres: Array<{ genre: string; count: number; avg_rating: number }>;
  favorite_directors: Array<{ director: string; count: number; avg_rating: number }>;
  format_preferences: Array<{ format: string; count: number }>;
  rating_pattern: {
    avg_rating: number;
    high_rated_threshold: number;
    rating_count: number;
  };
  collection_stats: {
    total_items: number;
    owned_items: number;
    wishlist_items: number;
    most_collected_decade: string;
  };
}

export interface RecommendationFilters {
  types?: Array<'collection_gap' | 'format_upgrade' | 'similar_title'>;
  min_confidence?: number;
  max_results?: number;
  exclude_owned?: boolean;
  exclude_wishlist?: boolean;
}

export interface RecommendationStats {
  total: number;
  by_type: {
    collection_gap: number;
    format_upgrade: number;
    similar_title: number;
  };
  avg_confidence: number;
  avg_relevance: number;
  cache_age?: number;
}

export type RecommendationType = 'collection_gap' | 'format_upgrade' | 'similar_title';
export type RecommendationAction = 'add_to_wishlist' | 'mark_as_owned' | 'not_interested' | 'viewed';
export type FeedbackReason = 'not_my_genre' | 'already_seen' | 'too_expensive' | 'not_available' | 'poor_quality' | 'other';

export interface RecommendationTypeInfo {
  key: RecommendationType;
  label: string;
  description: string;
  icon: string;
  color: string;
}