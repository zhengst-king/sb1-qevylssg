// src/components/RecommendationHistory.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Heart,
  Package,
  X,
  Eye,
  Calendar,
  Filter,
  Search,
  Target,
  TrendingUp,
  Lightbulb,
  Clock,
  Star,
  MoreHorizontal,
  ExternalLink,
  RotateCcw,
  Download
} from 'lucide-react';
import { useRecommendationActions } from '../hooks/useRecommendationActions';
import type { RecommendationAction, RecommendationActionData } from '../services/recommendationActionsService';

interface ActionIconProps {
  action: RecommendationAction;
  size?: 'sm' | 'md' | 'lg';
}

const ActionIcon: React.FC<ActionIconProps> = ({ action, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const actionConfig = {
    add_to_wishlist: { icon: Heart, color: 'text-red-600', bgColor: 'bg-red-100' },
    mark_as_owned: { icon: Package, color: 'text-green-600', bgColor: 'bg-green-100' },
    not_interested: { icon: X, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    viewed: { icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100' }
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  return (
    <div className={`p-2 rounded-full ${config.bgColor}`}>
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
    </div>
  );
};

interface RecommendationTypeIconProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
}

const RecommendationTypeIcon: React.FC<RecommendationTypeIconProps> = ({ type, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const typeConfig = {
    collection_gap: { icon: Target, color: 'text-blue-600' },
    format_upgrade: { icon: TrendingUp, color: 'text-green-600' },
    similar_title: { icon: Lightbulb, color: 'text-purple-600' }
  };

  const config = typeConfig[type as keyof typeof typeConfig];
  if (!config) return null;

  const Icon = config.icon;

  return <Icon className={`${sizeClasses[size]} ${config.color}`} />;
};

interface FilterBarProps {
  actionFilter: RecommendationAction | 'all';
  typeFilter: string;
  searchQuery: string;
  onActionFilterChange: (action: RecommendationAction | 'all') => void;
  onTypeFilterChange: (type: string) => void;
  onSearchChange: (query: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  actionFilter,
  typeFilter,
  searchQuery,
  onActionFilterChange,
  onTypeFilterChange,
  onSearchChange
}) => {
  const actionOptions = [
    { value: 'all', label: 'All Actions', icon: MoreHorizontal },
    { value: 'add_to_wishlist', label: 'Added to Wishlist', icon: Heart },
    { value: 'mark_as_owned', label: 'Marked as Owned', icon: Package },
    { value: 'not_interested', label: 'Dismissed', icon: X },
    { value: 'viewed', label: 'Viewed', icon: Eye }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'collection_gap', label: 'Collection Gaps' },
    { value: 'format_upgrade', label: 'Format Upgrades' },
    { value: 'similar_title', label: 'Similar Titles' }
  ];

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => onActionFilterChange(e.target.value as RecommendationAction | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {actionOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {typeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

interface HistoryItemProps {
  action: RecommendationActionData;
  onRetryRecommendation?: (action: RecommendationActionData) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ action, onRetryRecommendation }) => {
  const [showDetails, setShowDetails] = useState(false);

  const actionLabels = {
    add_to_wishlist: 'Added to Wishlist',
    mark_as_owned: 'Marked as Owned',
    not_interested: 'Not Interested',
    viewed: 'Viewed'
  };

  const typeLabels = {
    collection_gap: 'Collection Gap',
    format_upgrade: 'Format Upgrade',
    similar_title: 'Similar Title'
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Action Icon */}
        <ActionIcon action={action.action} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {action.title}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span>{actionLabels[action.action]}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <RecommendationTypeIcon type={action.recommendation_type} size="sm" />
                  <span>{typeLabels[action.recommendation_type as keyof typeof typeLabels]}</span>
                </div>
                {action.suggested_format && (
                  <>
                    <span>•</span>
                    <span>{action.suggested_format}</span>
                  </>
                )}
              </div>
              
              {action.reasoning && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {action.reasoning}
                </p>
              )}
              
              {action.feedback_reason && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {action.feedback_reason.replace('_', ' ')}
                  </span>
                  {action.feedback_comment && (
                    <span className="text-xs text-gray-500 italic">
                      "{action.feedback_comment}"
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              <div className="text-xs text-gray-500">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDate(action.created_at || '')}
              </div>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Expandable Details */}
          {showDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border space-y-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-gray-700">Recommendation ID:</span>
                  <p className="text-gray-600 font-mono">{action.recommendation_id}</p>
                </div>
                {action.imdb_id && (
                  <div>
                    <span className="font-medium text-gray-700">IMDB ID:</span>
                    <p className="text-gray-600">{action.imdb_id}</p>
                  </div>
                )}
                {action.recommendation_score && (
                  <div>
                    <span className="font-medium text-gray-700">Score:</span>
                    <p className="text-gray-600">{(action.recommendation_score * 100).toFixed(1)}%</p>
                  </div>
                )}
                {action.session_id && (
                  <div>
                    <span className="font-medium text-gray-700">Session:</span>
                    <p className="text-gray-600 font-mono truncate">{action.session_id}</p>
                  </div>
                )}
              </div>
              
              {action.action_data && Object.keys(action.action_data).length > 0 && (
                <div>
                  <span className="font-medium text-gray-700 text-xs">Action Data:</span>
                  <pre className="text-xs text-gray-600 mt-1 bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(action.action_data, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-2 border-t">
                {action.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${action.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on IMDB
                  </a>
                )}
                
                {onRetryRecommendation && action.action === 'not_interested' && (
                  <button
                    onClick={() => onRetryRecommendation(action)}
                    className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry Recommendation
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const RecommendationHistory: React.FC = () => {
  const {
    actionHistory,
    loading,
    loadActionHistory,
    getActionsByType
  } = useRecommendationActions();

  const [actionFilter, setActionFilter] = useState<RecommendationAction | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Filter and search history
  const filteredHistory = useMemo(() => {
    let filtered = actionHistory;

    // Filter by action type
    if (actionFilter !== 'all') {
      filtered = filtered.filter(action => action.action === actionFilter);
    }

    // Filter by recommendation type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(action => action.recommendation_type === typeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(action =>
        action.title.toLowerCase().includes(query) ||
        action.reasoning?.toLowerCase().includes(query) ||
        action.feedback_comment?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [actionHistory, actionFilter, typeFilter, searchQuery]);

  // Paginate results
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredHistory.slice(startIndex, startIndex + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize);

  // Load history on mount
  useEffect(() => {
    loadActionHistory(500, 0); // Load more history for better filtering
  }, [loadActionHistory]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, typeFilter, searchQuery]);

  const handleRetryRecommendation = (action: RecommendationActionData) => {
    // This could trigger a new recommendation based on the dismissed item
    console.log('Retry recommendation for:', action.title);
    // Implementation would depend on your recommendation system
  };

  const handleExportHistory = () => {
    const csvContent = [
      ['Date', 'Title', 'Action', 'Type', 'Reasoning', 'Feedback', 'Score'].join(','),
      ...filteredHistory.map(action => [
        new Date(action.created_at || '').toISOString(),
        `"${action.title}"`,
        action.action,
        action.recommendation_type,
        `"${action.reasoning || ''}"`,
        action.feedback_reason || '',
        action.recommendation_score || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recommendation-history.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <History className="h-8 w-8 animate-pulse text-blue-600 mr-3" />
          <span className="text-gray-600">Loading recommendation history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recommendation History</h1>
          <p className="text-gray-600 mt-1">
            Review your past recommendation interactions and patterns
          </p>
        </div>
        
        <button
          onClick={handleExportHistory}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{actionHistory.length}</p>
          <p className="text-sm text-gray-600">Total Actions</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{getActionsByType('add_to_wishlist').length}</p>
          <p className="text-sm text-gray-600">Wishlist Adds</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{getActionsByType('mark_as_owned').length}</p>
          <p className="text-sm text-gray-600">Marked Owned</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{getActionsByType('not_interested').length}</p>
          <p className="text-sm text-gray-600">Dismissed</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        actionFilter={actionFilter}
        typeFilter={typeFilter}
        searchQuery={searchQuery}
        onActionFilterChange={setActionFilter}
        onTypeFilterChange={setTypeFilter}
        onSearchChange={setSearchQuery}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>
          Showing {paginatedHistory.length} of {filteredHistory.length} actions
          {filteredHistory.length !== actionHistory.length && ` (filtered from ${actionHistory.length} total)`}
        </p>
        
        {totalPages > 1 && (
          <p>
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {/* History List */}
      {paginatedHistory.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No history found</h3>
          <p className="text-gray-600">
            {filteredHistory.length === 0 && actionHistory.length > 0
              ? 'No actions match your current filters.'
              : 'Start using recommendations to see your history here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedHistory.map((action) => (
            <HistoryItem
              key={`${action.id}-${action.created_at}`}
              action={action}
              onRetryRecommendation={handleRetryRecommendation}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm rounded-lg ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};