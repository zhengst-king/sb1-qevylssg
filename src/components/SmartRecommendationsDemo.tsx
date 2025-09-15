// src/components/SmartRecommendationsDemo.tsx
import React, { useState } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { useSmartRecommendations } from '../hooks/useSmartRecommendations';
import type { RecommendationType, RecommendationFilters } from '../types/smartRecommendations';

// Recommendation type configuration
const RECOMMENDATION_TYPES: Array<{
  key: RecommendationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = [
  {
    key: 'collection_gap',
    label: 'Collection Gaps',
    description: 'Missing movies from directors/franchises you collect',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  {
    key: 'format_upgrade',
    label: 'Format Upgrades',
    description: 'Better quality versions of your favorite movies',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  {
    key: 'similar_title',
    label: 'Similar Titles',
    description: 'Movies similar to ones you love',
    icon: Lightbulb,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200'
  }
];

export const SmartRecommendationsDemo: React.FC = () => {
  const {
    recommendations,
    userProfile,
    loading,
    error,
    generateRecommendations,
    refreshRecommendations,
    filterRecommendations,
    getRecommendationsByType,
    getStats,
    hasRecommendations,
    canGenerate,
    collectionSize
  } = useSmartRecommendations();

  const [activeFilters, setActiveFilters] = useState<RecommendationFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const stats = getStats();

  // Handle filter changes
  const handleFilterChange = (newFilters: RecommendationFilters) => {
    setActiveFilters(newFilters);
    generateRecommendations(newFilters);
  };

  // Handle type filter toggle
  const toggleTypeFilter = (type: RecommendationType) => {
    const currentTypes = activeFilters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    handleFilterChange({ ...activeFilters, types: newTypes });
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            Smart Recommendations
          </h1>
          <p className="text-gray-600 mt-1">
            Personalized movie suggestions based on your collection
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          
          <button
            onClick={() => refreshRecommendations()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Collection Stats */}
      {userProfile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Film className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Collection</h3>
            </div>
            <p className="text-2xl font-bold">{userProfile.collection_stats.total_items}</p>
            <p className="text-sm text-gray-600">Total items</p>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold">Avg Rating</h3>
            </div>
            <p className="text-2xl font-bold">{userProfile.rating_pattern.avg_rating.toFixed(1)}</p>
            <p className="text-sm text-gray-600">Out of 10</p>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Disc className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Top Format</h3>
            </div>
            <p className="text-2xl font-bold">{userProfile.format_preferences[0]?.format || 'N/A'}</p>
            <p className="text-sm text-gray-600">{userProfile.format_preferences[0]?.count || 0} items</p>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">Top Genre</h3>
            </div>
            <p className="text-2xl font-bold">{userProfile.favorite_genres[0]?.genre || 'N/A'}</p>
            <p className="text-sm text-gray-600">{userProfile.favorite_genres[0]?.count || 0} movies</p>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Filter Recommendations</h3>
          
          <div className="space-y-4">
            {/* Type Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendation Types
              </label>
              <div className="flex flex-wrap gap-2">
                {RECOMMENDATION_TYPES.map(type => (
                  <button
                    key={type.key}
                    onClick={() => toggleTypeFilter(type.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      activeFilters.types?.includes(type.key)
                        ? `${type.bgColor} ${type.color} border-current`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Confidence
              </label>
              <select
                value={activeFilters.min_confidence || ''}
                onChange={(e) => handleFilterChange({
                  ...activeFilters,
                  min_confidence: e.target.value ? parseFloat(e.target.value) : undefined
                })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Any confidence</option>
                <option value="0.8">High confidence (80%+)</option>
                <option value="0.6">Medium confidence (60%+)</option>
                <option value="0.4">Low confidence (40%+)</option>
              </select>
            </div>

            {/* Max Results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Results
              </label>
              <select
                value={activeFilters.max_results || ''}
                onChange={(e) => handleFilterChange({
                  ...activeFilters,
                  max_results: e.target.value ? parseInt(e.target.value) : undefined
                })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Show all</option>
                <option value="10">10 recommendations</option>
                <option value="20">20 recommendations</option>
                <option value="50">50 recommendations</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Error generating recommendations</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Recommendation Statistics</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.by_type.collection_gap}</p>
              <p className="text-sm text-gray-600">Collection Gaps</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.by_type.format_upgrade}</p>
              <p className="text-sm text-gray-600">Format Upgrades</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.by_type.similar_title}</p>
              <p className="text-sm text-gray-600">Similar Titles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{(stats.avg_confidence * 100).toFixed(0)}%</p>
              <p className="text-sm text-gray-600">Avg Confidence</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Generating personalized recommendations...</p>
        </div>
      ) : hasRecommendations ? (
        <div className="space-y-6">
          {RECOMMENDATION_TYPES.map(type => {
            const typeRecommendations = getRecommendationsByType(type.key);
            
            if (typeRecommendations.length === 0) return null;

            return (
              <div key={type.key} className="bg-white rounded-lg border">
                <div className={`px-6 py-4 border-b ${type.bgColor}`}>
                  <div className="flex items-center gap-3">
                    <type.icon className={`h-6 w-6 ${type.color}`} />
                    <div>
                      <h3 className={`font-semibold ${type.color}`}>{type.label}</h3>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${type.bgColor} ${type.color}`}>
                        {typeRecommendations.length} recommendations
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {typeRecommendations.slice(0, 6).map((rec, index) => (
                      <div key={`${rec.imdb_id}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex gap-4">
                          {rec.poster_url && (
                            <img 
                              src={rec.poster_url} 
                              alt={rec.title}
                              className="w-16 h-24 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{rec.title}</h4>
                            {rec.year && (
                              <p className="text-sm text-gray-600">{rec.year}</p>
                            )}
                            {rec.director && (
                              <p className="text-sm text-gray-600">Dir: {rec.director}</p>
                            )}
                            
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                              {rec.reasoning}
                            </p>
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs text-gray-600">
                                    {(rec.score.relevance * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-gray-600">
                                    {(rec.score.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                                {rec.score.urgency > 0.5 && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-orange-500" />
                                    <span className="text-xs text-gray-600">Urgent</span>
                                  </div>
                                )}
                              </div>
                              
                              {rec.suggested_format && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {rec.suggested_format}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {typeRecommendations.length > 6 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        And {typeRecommendations.length - 6} more {type.label.toLowerCase()}...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
    </div>
  );
};