// src/components/SmartRecommendationsWithActions.tsx
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Brain, 
  TrendingUp, 
  Star, 
  Clock, 
  Target,
  RefreshCw,
  Filter,
  BarChart3,
  Lightbulb,
  Film,
  Disc,
  AlertCircle,
  CheckCircle,
  Heart,
  Package,
  X,
  ThumbsDown,
  Eye,
  ShoppingCart,
  Zap,
  TrendingDown
} from 'lucide-react';
import { useSmartRecommendations } from '../hooks/useSmartRecommendations';
import { useRecommendationActions } from '../hooks/useRecommendationActions';
import type { RecommendationType, RecommendationFilters } from '../types/smartRecommendations';
import type { MovieRecommendation } from '../services/smartRecommendationsService';
import type { FeedbackReason } from '../services/recommendationActionsService';

// Feedback modal component for dismissal reasons
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: FeedbackReason, comment?: string) => void;
  recommendationTitle: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, recommendationTitle }) => {
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState('');

  const feedbackReasons: Array<{ value: FeedbackReason; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: 'not_my_genre', label: 'Not my genre', icon: ThumbsDown },
    { value: 'already_seen', label: 'Already seen/own', icon: CheckCircle },
    { value: 'too_expensive', label: 'Too expensive', icon: TrendingDown },
    { value: 'not_available', label: 'Not available', icon: AlertCircle },
    { value: 'poor_quality', label: 'Poor quality/reviews', icon: Star },
    { value: 'other', label: 'Other reason', icon: X }
  ];

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason, comment.trim() || undefined);
      setSelectedReason(null);
      setComment('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          Why aren't you interested in "{recommendationTitle}"?
        </h3>
        
        <div className="space-y-3 mb-4">
          {feedbackReasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  selectedReason === reason.value
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{reason.label}</span>
              </button>
            );
          })}
        </div>

        {selectedReason === 'other' && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Please tell us more..."
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            rows={3}
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

// Action button component
interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant, 
  loading = false, 
  disabled = false,
  size = 'md'
}) => {
  const baseClasses = `
    flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors
    ${size === 'sm' ? 'text-xs' : 'text-sm'}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {loading ? (
        <RefreshCw className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
      ) : (
        <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
      <span>{label}</span>
    </button>
  );
};

// Enhanced recommendation card with actions
interface RecommendationCardProps {
  recommendation: MovieRecommendation;
  onAddToWishlist: () => void;
  onMarkAsOwned: () => void;
  onDismiss: () => void;
  loading?: boolean;
  hasActed?: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onAddToWishlist,
  onMarkAsOwned,
  onDismiss,
  loading = false,
  hasActed = false
}) => {
  const typeConfig = {
    collection_gap: { 
      icon: Target, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200',
      label: 'Collection Gap'
    },
    format_upgrade: { 
      icon: TrendingUp, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50 border-green-200',
      label: 'Format Upgrade'
    },
    similar_title: { 
      icon: Lightbulb, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50 border-purple-200',
      label: 'Similar Title'
    }
  };

  const config = typeConfig[recommendation.recommendation_type];
  const TypeIcon = config.icon;

  const confidenceColor = recommendation.score.confidence >= 0.8 ? 'text-green-600' : 
                         recommendation.score.confidence >= 0.6 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow ${
      hasActed ? 'opacity-75 bg-gray-50' : ''
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${config.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className={`h-5 w-5 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className={`h-4 w-4 ${confidenceColor}`} />
              <span className={`text-sm font-medium ${confidenceColor}`}>
                {(recommendation.score.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {recommendation.score.urgency > 0.5 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-gray-600">Urgent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Poster */}
          <div className="flex-shrink-0">
            {recommendation.poster_url ? (
              <img
                src={recommendation.poster_url}
                alt={`${recommendation.title} poster`}
                className="w-20 h-30 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-20 h-30 bg-gray-200 rounded-lg border flex items-center justify-center">
                <Film className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 line-clamp-1">
              {recommendation.title}
            </h3>
            
            {recommendation.year && (
              <p className="text-gray-600 text-sm mb-2">{recommendation.year}</p>
            )}

            {recommendation.genre && (
              <p className="text-gray-600 text-sm mb-2">{recommendation.genre}</p>
            )}

            {recommendation.director && (
              <p className="text-gray-600 text-sm mb-3">
                Directed by {recommendation.director}
              </p>
            )}

            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
              {recommendation.reasoning}
            </p>

            {recommendation.suggested_format && (
              <div className="flex items-center gap-2 mb-3">
                <Disc className="h-4 w-4 text-gray-500" />
                <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {recommendation.suggested_format}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {hasActed ? (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">You've already acted on this recommendation</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              icon={Heart}
              label="Add to Wishlist"
              onClick={onAddToWishlist}
              variant="primary"
              loading={loading}
            />
            <ActionButton
              icon={Package}
              label="Already Own"
              onClick={onMarkAsOwned}
              variant="secondary"
              loading={loading}
            />
            <ActionButton
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
  );
};

// Main component
export const SmartRecommendationsWithActions: React.FC = () => {
  const {
    recommendations,
    userProfile,
    loading: recommendationsLoading,
    error,
    generateRecommendations,
    refreshRecommendations,
    hasRecommendations,
    canGenerate,
    collectionSize,
    getStats
  } = useSmartRecommendations();

  const {
    loading: actionsLoading,
    addToWishlist,
    markAsOwned,
    dismissRecommendation,
    trackView,
    recordSession,
    hasActedOn,
    actionStats,
    getConversionRate
  } = useRecommendationActions({ trackViews: true });

  const [activeFilters, setActiveFilters] = useState<RecommendationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    recommendation: MovieRecommendation | null;
  }>({ isOpen: false, recommendation: null });
  const [actedRecommendations, setActedRecommendations] = useState<Set<string>>(new Set());
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  const stats = getStats();

  // Check which recommendations user has already acted on
  useEffect(() => {
    const checkActedRecommendations = async () => {
      if (!recommendations.length) return;

      const checks = await Promise.all(
        recommendations.map(async (rec) => {
          const acted = await hasActedOn(rec.imdb_id, rec.recommendation_type);
          return { id: `${rec.imdb_id}_${rec.recommendation_type}`, acted };
        })
      );

      const actedSet = new Set(
        checks.filter(check => check.acted).map(check => check.id)
      );
      setActedRecommendations(actedSet);
    };

    checkActedRecommendations();
  }, [recommendations, hasActedOn]);

  // Track recommendation views
  useEffect(() => {
    recommendations.forEach(rec => {
      trackView(rec);
    });
  }, [recommendations, trackView]);

  // Record recommendation session when recommendations are generated
  useEffect(() => {
    if (recommendations.length > 0) {
      recordSession(recommendations.length, activeFilters, undefined, false);
    }
  }, [recommendations.length, recordSession, activeFilters]);

  // Handle add to wishlist
  const handleAddToWishlist = async (recommendation: MovieRecommendation) => {
    const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
    if (processingActions.has(actionId)) return;

    setProcessingActions(prev => new Set(prev).add(actionId));
    
    try {
      const result = await addToWishlist(recommendation);
      if (result.success) {
        setActedRecommendations(prev => new Set(prev).add(actionId));
      }
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
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
      const result = await markAsOwned(recommendation);
      if (result.success) {
        setActedRecommendations(prev => new Set(prev).add(actionId));
      }
    } catch (error) {
      console.error('Failed to mark as owned:', error);
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

    const recommendation = feedbackModal.recommendation;
    const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
    
    setProcessingActions(prev => new Set(prev).add(actionId));
    
    try {
      const result = await dismissRecommendation(recommendation, reason, comment);
      if (result.success) {
        setActedRecommendations(prev => new Set(prev).add(actionId));
      }
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error);
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: RecommendationFilters) => {
    setActiveFilters(newFilters);
    generateRecommendations(newFilters);
  };

  // Handle refresh
  const handleRefresh = () => {
    refreshRecommendations();
  };

  if (!canGenerate) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Smart Recommendations
          </h2>
          <p className="text-gray-600 mb-4">
            You need at least 3 items in your collection to generate personalized recommendations.
          </p>
          <p className="text-sm text-gray-500">
            Current collection size: {collectionSize} items
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Smart Recommendations
          </h1>
          <p className="text-gray-600">
            Personalized suggestions based on your {collectionSize}-item collection
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2 inline" />
            Filters
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={recommendationsLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${recommendationsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {(stats || actionStats) && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Performance Overview</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-gray-600">Recommendations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{(stats.avg_confidence * 100).toFixed(0)}%</p>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                </div>
              </>
            )}
            {actionStats && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{getConversionRate().toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{actionStats.total_actions}</p>
                  <p className="text-sm text-gray-600">Total Actions</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Error generating recommendations</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {recommendationsLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Generating personalized recommendations...</p>
        </div>
      ) : hasRecommendations ? (
        <div className="space-y-6">
          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.map((recommendation, index) => {
              const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
              const hasActed = actedRecommendations.has(actionId);
              const isProcessing = processingActions.has(actionId);

              return (
                <RecommendationCard
                  key={`${recommendation.imdb_id}_${recommendation.recommendation_type}_${index}`}
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
        </div>
      ) : (
        <div className="text-center py-12">
          <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations yet</h3>
          <p className="text-gray-600 mb-4">
            Click "Refresh" to generate personalized recommendations based on your collection.
          </p>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, recommendation: null })}
        onSubmit={handleFeedbackSubmit}
        recommendationTitle={feedbackModal.recommendation?.title || ''}
      />
    </div>
  );
};