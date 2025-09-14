// src/components/SmartRecommendationsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  ArrowUpCircle, 
  Users, 
  Target,
  Sparkles,
  Clock,
  Heart,
  Plus,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { smartRecommendationsService, type Recommendation } from '../services/smartRecommendationsService';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAddToWishlist: (rec: Recommendation) => void;
  onViewDetails: (rec: Recommendation) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  recommendation, 
  onAddToWishlist,
  onViewDetails 
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'collection_gap': return <Target className="h-4 w-4" />;
      case 'format_upgrade': return <ArrowUpCircle className="h-4 w-4" />;
      case 'similar_title': return <Star className="h-4 w-4" />;
      case 'franchise_completion': return <Users className="h-4 w-4" />;
      case 'technical_upgrade': return <Sparkles className="h-4 w-4" />;
      case 'price_drop': return <TrendingUp className="h-4 w-4" />;
      case 'diversity': return <Heart className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'collection_gap': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'format_upgrade': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'similar_title': return 'bg-green-50 text-green-600 border-green-200';
      case 'franchise_completion': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'technical_upgrade': return 'bg-pink-50 text-pink-600 border-pink-200';
      case 'price_drop': return 'bg-red-50 text-red-600 border-red-200';
      case 'diversity': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'collection_gap': return 'Collection Gap';
      case 'format_upgrade': return 'Format Upgrade';
      case 'similar_title': return 'Similar Title';
      case 'franchise_completion': return 'Complete Series';
      case 'technical_upgrade': return 'Better Quality';
      case 'price_drop': return 'Price Drop';
      case 'diversity': return 'Discover New';
      default: return 'Recommended';
    }
  };

  const confidencePercentage = Math.round(recommendation.confidence * 100);
  const urgencyLevel = recommendation.urgency > 0.7 ? 'high' : recommendation.urgency > 0.4 ? 'medium' : 'low';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(recommendation.type)}`}>
            {getTypeIcon(recommendation.type)}
            <span>{getTypeName(recommendation.type)}</span>
          </div>
          
          {urgencyLevel === 'high' && (
            <div className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <Clock className="h-3 w-3" />
              <span>Urgent</span>
            </div>
          )}
        </div>

        <div className="flex items-start space-x-4">
          {/* Movie Poster */}
          <div className="flex-shrink-0">
            <div className="w-16 h-24 bg-slate-200 rounded-lg overflow-hidden">
              {recommendation.poster_url ? (
                <img 
                  src={recommendation.poster_url} 
                  alt={recommendation.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 mb-1 line-clamp-2">
              {recommendation.title}
              {recommendation.year && (
                <span className="text-slate-500 font-normal ml-1">({recommendation.year})</span>
              )}
            </h3>
            
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
              {recommendation.reason}
            </p>

            {/* Metadata */}
            {recommendation.metadata && (
              <div className="space-y-1 mb-3">
                {recommendation.metadata.current_format && recommendation.metadata.suggested_format && (
                  <div className="flex items-center text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded">
                      {recommendation.metadata.current_format}
                    </span>
                    <ChevronRight className="h-3 w-3 mx-1" />
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {recommendation.metadata.suggested_format}
                    </span>
                  </div>
                )}

                {recommendation.metadata.franchise_name && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Series:</span> {recommendation.metadata.franchise_name}
                  </div>
                )}

                {recommendation.metadata.similar_to && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Similar to:</span> {recommendation.metadata.similar_to.join(', ')}
                  </div>
                )}

                {recommendation.metadata.price_info && (
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-red-600 font-semibold">
                      ${recommendation.metadata.price_info.current_price}
                    </span>
                    <span className="text-slate-400 line-through">
                      ${recommendation.metadata.price_info.was_price}
                    </span>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                      {recommendation.metadata.price_info.discount_percent}% OFF
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Confidence & Score */}
            <div className="flex items-center space-x-4 text-xs text-slate-500 mb-3">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{Math.round(recommendation.score * 100)}% match</span>
              </div>
              <div>
                <span className="font-medium">Confidence:</span> {confidencePercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(recommendation)}
            className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Details</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAddToWishlist(recommendation)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add to Wishlist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SmartRecommendationsPage: React.FC = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const recs = await smartRecommendationsService.generateRecommendations(user.id, 20);
      setRecommendations(recs);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWishlist = async (recommendation: Recommendation) => {
    // TODO: Implement add to wishlist functionality
    console.log('Adding to wishlist:', recommendation.title);
    alert(`Added "${recommendation.title}" to your wishlist!`);
  };

  const handleViewDetails = (recommendation: Recommendation) => {
    // TODO: Open movie details modal or navigate to details page
    if (recommendation.imdb_id) {
      window.open(`https://www.imdb.com/title/${recommendation.imdb_id}`, '_blank');
    } else {
      alert(`More details for "${recommendation.title}" coming soon!`);
    }
  };

  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.type === selectedCategory);

  const categories = [
    { key: 'all', name: 'All Recommendations', icon: Star },
    { key: 'collection_gap', name: 'Collection Gaps', icon: Target },
    { key: 'format_upgrade', name: 'Format Upgrades', icon: ArrowUpCircle },
    { key: 'similar_title', name: 'Similar Titles', icon: Heart },
    { key: 'franchise_completion', name: 'Complete Series', icon: Users },
    { key: 'diversity', name: 'Discover New', icon: Sparkles },
  ];

  const getCategoryCount = (category: string) => {
    return category === 'all' ? recommendations.length : recommendations.filter(rec => rec.type === category).length;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Analyzing your collection and generating recommendations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error}</p>
          <button 
            onClick={loadRecommendations}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Smart Recommendations
        </h1>
        <p className="text-slate-600">
          Personalized suggestions based on your collection and preferences
        </p>
      </div>

      {/* Category Filters */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          {categories.map(category => {
            const Icon = category.icon;
            const count = getCategoryCount(category.key);
            const isActive = selectedCategory === category.key;

            return (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold ${
                    isActive 
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations Grid */}
      {filteredRecommendations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRecommendations.map(recommendation => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onAddToWishlist={handleAddToWishlist}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Recommendations Found</h3>
          <p className="text-slate-600 mb-4">
            {selectedCategory === 'all' 
              ? "We're analyzing your collection to generate personalized recommendations."
              : `No ${categories.find(c => c.key === selectedCategory)?.name.toLowerCase()} available at the moment.`
            }
          </p>
          <button 
            onClick={loadRecommendations}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Recommendations
          </button>
        </div>
      )}
    </div>
  );
};