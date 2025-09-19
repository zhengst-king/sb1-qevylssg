// src/components/SmartRecommendationsWithActions.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Package, X, CheckCircle, AlertTriangle, Sparkles, 
  Star, Calendar, Play, Filter, RefreshCw, TrendingUp, 
  Eye, Clock, Target, Zap, Settings
} from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { useAuth } from '../hooks/useAuth';
import { optimizedOMDBService } from '../services/optimizedOMDBService';
import { smartRecommendationsService, MovieRecommendation, RecommendationFilters } from '../services/smartRecommendationsService';
// Removed react-hot-toast dependency - using simple notifications instead

// Types
type FeedbackReason = 'not_my_genre' | 'already_seen' | 'too_expensive' | 'not_available' | 'poor_quality' | 'other';
type ActionType = 'add_to_wishlist' | 'mark_as_owned' | 'not_interested' | 'viewed';

interface ActionButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

interface FeedbackModal {
  isOpen: boolean;
  recommendation: MovieRecommendation | null;
}

// Action Button Component
const ActionButtonComponent: React.FC<ActionButton> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant, 
  loading = false, 
  disabled = false 
}) => {
  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800",
    secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400",
    danger: "bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{loading ? 'Processing...' : label}</span>
    </button>
  );
};

// Recommendation Card Component
const RecommendationCard: React.FC<{
  recommendation: MovieRecommendation;
  onAddToWishlist: () => void;
  onMarkAsOwned: () => void;
  onDismiss: () => void;
  loading: boolean;
  hasActed: boolean;
}> = ({ recommendation, onAddToWishlist, onMarkAsOwned, onDismiss, loading, hasActed }) => {
  
  const getReasoningIcon = (type: string) => {
    switch (type) {
      case 'collection_gap': return <Target className="h-4 w-4 text-orange-600" />;
      case 'format_upgrade': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'similar_title': return <Sparkles className="h-4 w-4 text-purple-600" />;
      default: return <Eye className="h-4 w-4 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'collection_gap': return 'Complete Your Collection';
      case 'format_upgrade': return 'Format Upgrade';
      case 'similar_title': return 'Similar Title';
      default: return 'Recommended';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200">
      <div className="flex">
        {/* Poster */}
        <div className="flex-shrink-0 w-32 h-48 bg-slate-100">
          {recommendation.poster_url ? (
            <img
              src={recommendation.poster_url}
              alt={recommendation.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getReasoningIcon(recommendation.recommendation_type)}
                <span className="text-sm font-medium text-slate-600">
                  {getTypeLabel(recommendation.recommendation_type)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {recommendation.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                {recommendation.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {recommendation.year}
                  </span>
                )}
                {recommendation.imdb_rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {recommendation.imdb_rating}/10
                  </span>
                )}
              </div>
            </div>
            
            {/* Confidence Score */}
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Confidence</div>
              <div className="text-lg font-bold text-purple-600">
                {Math.round(recommendation.score.confidence * 100)}%
              </div>
            </div>
          </div>

          {/* Metadata */}
          {recommendation.genre && (
            <p className="text-sm text-slate-600 mb-2">
              <span className="font-medium">Genre:</span> {recommendation.genre}
            </p>
          )}
          
          {recommendation.director && (
            <p className="text-sm text-slate-600 mb-3">
              <span className="font-medium">Director:</span> {recommendation.director}
            </p>
          )}

          {/* Reasoning */}
          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Why we recommend this:</span><br />
              {recommendation.reasoning}
            </p>
          </div>

          {/* Action Buttons */}
          {hasActed ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                You've already acted on this recommendation
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <ActionButtonComponent
                icon={Heart}
                label="Add to Wishlist"
                onClick={onAddToWishlist}
                variant="primary"
                loading={loading}
              />
              <ActionButtonComponent
                icon={Package}
                label="Already Own"
                onClick={onMarkAsOwned}
                variant="secondary"
                loading={loading}
              />
              <ActionButtonComponent
                icon={X}
                label="Not Interested"
                onClick={onDismiss}
                variant="danger"
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Feedback Modal Component
const FeedbackModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: FeedbackReason, comment?: string) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [selectedReason, setSelectedReason] = useState<FeedbackReason>('not_my_genre');
  const [comment, setComment] = useState('');

  const reasons: { value: FeedbackReason; label: string }[] = [
    { value: 'not_my_genre', label: "Not my genre" },
    { value: 'already_seen', label: "Already seen/owned" },
    { value: 'too_expensive', label: "Too expensive" },
    { value: 'not_available', label: "Not available to buy" },
    { value: 'poor_quality', label: "Poor quality/reviews" },
    { value: 'other', label: "Other" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason, comment.trim() || undefined);
    setComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Why not interested?</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {reasons.map(reason => (
              <label key={reason.value} className="flex items-center">
                <input
                  type="radio"
                  name="reason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={(e) => setSelectedReason(e.target.value as FeedbackReason)}
                  className="mr-2"
                />
                {reason.label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Additional feedback (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md"
              rows={3}
              placeholder="Help us improve our recommendations..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Component
export const SmartRecommendationsWithActions: React.FC = () => {
  const { user } = useAuth();
  const { collections, addToCollection } = useCollections();
  
  // State
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [actedRecommendations, setActedRecommendations] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({ isOpen: false, recommendation: null });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filters, setFilters] = useState<RecommendationFilters>({
    max_results: 12,
    exclude_owned: true,
    exclude_wishlist: false
  });

  // Simple notification system
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Refs
  const generateRequestRef = useRef<number>(0);

  // Generate recommendations
  const generateRecommendations = async () => {
    if (!user || collections.length < 3) {
      setError(collections.length === 0 
        ? "Add some movies to your collection first to get recommendations!" 
        : `Add ${3 - collections.length} more movies to get recommendations!`
      );
      return;
    }

    setLoading(true);
    setError(null);
    const requestId = ++generateRequestRef.current;

    try {
      console.log('[SmartRecommendations] Generating recommendations for', collections.length, 'items');
      
      const newRecommendations = await smartRecommendationsService.generateRecommendations(
        collections,
        filters
      );

      // Only update if this is still the latest request
      if (requestId === generateRequestRef.current) {
        setRecommendations(newRecommendations);
        
        if (newRecommendations.length === 0) {
          setError("No new recommendations found. Try adjusting your filters or adding more items to your collection.");
        } else {
          // Track views for analytics
          console.log(`[SmartRecommendations] Generated ${newRecommendations.length} recommendations`);
        }
      }
    } catch (err) {
      console.error('[SmartRecommendations] Error:', err);
      if (requestId === generateRequestRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
      }
    } finally {
      if (requestId === generateRequestRef.current) {
        setLoading(false);
      }
    }
  };

  // Handle add to wishlist
  const handleAddToWishlist = async (recommendation: MovieRecommendation) => {
    const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
    if (processingActions.has(actionId)) return;

    setProcessingActions(prev => new Set(prev).add(actionId));
    
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

      if (result) {
        setActedRecommendations(prev => new Set(prev).add(actionId));
        showNotification(`Added "${recommendation.title}" to your wishlist!`, 'success');
      }
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      showNotification('Failed to add to wishlist. Please try again.', 'error');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  // Handle mark as owned
  const handleMarkAsOwned = async (recommendation: MovieRecommendation) => {
    const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
    if (processingActions.has(actionId)) return;

    setProcessingActions(prev => new Set(prev).add(actionId));
    
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

      if (result) {
        setActedRecommendations(prev => new Set(prev).add(actionId));
        showNotification(`Added "${recommendation.title}" to your collection!`, 'success');
      }
    } catch (error) {
      console.error('Failed to mark as owned:', error);
      showNotification('Failed to add to collection. Please try again.', 'error');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  // Handle dismiss recommendation
  const handleDismiss = (recommendation: MovieRecommendation) => {
    setFeedbackModal({ isOpen: true, recommendation });
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (reason: FeedbackReason, comment?: string) => {
    if (!feedbackModal.recommendation) return;

    const actionId = `${feedbackModal.recommendation.imdb_id}_${feedbackModal.recommendation.recommendation_type}`;
    setActedRecommendations(prev => new Set(prev).add(actionId));
    
    // Here you would typically send feedback to your analytics service
    console.log('User feedback:', { reason, comment, recommendation: feedbackModal.recommendation });
    
    showNotification('Thanks for your feedback!', 'success');
    setFeedbackModal({ isOpen: false, recommendation: null });
  };

  // Load recommendations on mount
  useEffect(() => {
    if (collections.length >= 3) {
      generateRecommendations();
    }
  }, [collections.length]);

  // Check if user can generate recommendations
  const canGenerate = collections.length >= 3;
  const hasRecommendations = recommendations.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              Smart Recommendations
            </h1>
            <p className="text-slate-600 mt-2">
              Personalized movie suggestions based on your collection
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={generateRecommendations}
              disabled={loading || !canGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <span>Collection size: {collections.length}</span>
          {hasRecommendations && <span>Recommendations: {recommendations.length}</span>}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
            <div>
              <p className="text-orange-800 font-medium">Unable to Generate Recommendations</p>
              <p className="text-orange-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-slate-600">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">Analyzing your collection and generating recommendations...</span>
          </div>
        </div>
      )}

      {/* Recommendations Grid */}
      {hasRecommendations && !loading && (
        <div className="space-y-6">
          {recommendations.map((recommendation, index) => {
            const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
            const hasActed = actedRecommendations.has(actionId);
            const isProcessing = processingActions.has(actionId);

            return (
              <RecommendationCard
                key={`${recommendation.imdb_id}-${recommendation.recommendation_type}-${index}`}
                recommendation={recommendation}
                onAddToWishlist={() => handleAddToWishlist(recommendation)}
                onMarkAsOwned={() => handleMarkAsOwned(recommendation)}
                onDismiss={() => handleDismiss(recommendation)}
                loading={isProcessing}
                hasActed={hasActed}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasRecommendations && !loading && !error && (
        <div className="text-center py-12">
          <Zap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Discover?</h2>
          <p className="text-slate-600 mb-6">
            Click "Refresh" to get personalized movie recommendations based on your collection.
          </p>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, recommendation: null })}
        onSubmit={handleFeedbackSubmit}
        loading={false}
      />

      {/* Simple Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};