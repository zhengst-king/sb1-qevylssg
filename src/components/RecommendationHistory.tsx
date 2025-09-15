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
  Download,
  SortAsc,
  SortDesc,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Archive
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRecommendationActions } from '../hooks/useRecommendationActions';
import type { 
  RecommendationAction, 
  RecommendationActionData, 
  FeedbackReason 
} from '../services/recommendationActionsService';

// Helper Components
interface ActionBadgeProps {
  action: RecommendationAction;
  size?: 'sm' | 'md' | 'lg';
}

const ActionBadge: React.FC<ActionBadgeProps> = ({ action, size = 'md' }) => {
  const configs = {
    add_to_wishlist: {
      icon: Heart,
      label: 'Added to Wishlist',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    mark_as_owned: {
      icon: Package,
      label: 'Marked as Owned',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    not_interested: {
      icon: X,
      label: 'Not Interested',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    viewed: {
      icon: Eye,
      label: 'Viewed',
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  };

  const config = configs[action];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  );
};

interface RecommendationTypeBadgeProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
}

const RecommendationTypeBadge: React.FC<RecommendationTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const configs = {
    collection_gap: {
      icon: Target,
      label: 'Collection Gap',
      color: 'bg-blue-100 text-blue-800'
    },
    format_upgrade: {
      icon: TrendingUp,
      label: 'Format Upgrade',
      color: 'bg-green-100 text-green-800'
    },
    similar_title: {
      icon: Lightbulb,
      label: 'Similar Title',
      color: 'bg-purple-100 text-purple-800'
    }
  };

  const config = configs[type as keyof typeof configs];
  if (!config) return <span className="text-xs text-gray-500">Unknown</span>;

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  );
};

// Filters Component
interface HistoryFiltersProps {
  actionFilter: RecommendationAction | 'all';
  typeFilter: string;
  dateRange: string;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onActionFilterChange: (action: RecommendationAction | 'all') => void;
  onTypeFilterChange: (type: string) => void;
  onDateRangeChange: (range: string) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  actionFilter,
  typeFilter,
  dateRange,
  searchQuery,
  sortBy,
  sortOrder,
  onActionFilterChange,
  onTypeFilterChange,
  onDateRangeChange,
  onSearchChange,
  onSortChange,
  onClearFilters
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      {/* Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => onActionFilterChange(e.target.value as RecommendationAction | 'all')}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Actions</option>
          <option value="add_to_wishlist">Added to Wishlist</option>
          <option value="mark_as_owned">Marked as Owned</option>
          <option value="not_interested">Not Interested</option>
          <option value="viewed">Viewed Only</option>
        </select>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Filter className="h-4 w-4" />
          <span>Advanced</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="collection_gap">Collection Gap</option>
            <option value="format_upgrade">Format Upgrade</option>
            <option value="similar_title">Similar Title</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="3months">Last 3 Months</option>
          </select>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value, sortOrder)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="created_at">Date</option>
              <option value="title">Title</option>
              <option value="action">Action</option>
              <option value="recommendation_type">Type</option>
            </select>
            
            <button
              onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>

          {/* Clear Filters */}
          <button
            onClick={onClearFilters}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Clear</span>
          </button>
        </div>
      )}
    </div>
  );
};

// History Item Component
interface HistoryItemProps {
  action: RecommendationActionData;
  onRetryRecommendation?: (action: RecommendationActionData) => void;
  onViewDetails?: (action: RecommendationActionData) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ 
  action, 
  onRetryRecommendation, 
  onViewDetails 
}) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDateTime(action.created_at || '');

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title and Basic Info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 truncate">
                {action.title}
              </h3>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-slate-500 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {date} at {time}
                </span>
                {action.recommendation_score && (
                  <span className="text-sm text-slate-500 flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-400" />
                    {Math.round(action.recommendation_score * 100)}% match
                  </span>
                )}
              </div>
            </div>
            
            <div className="ml-4 flex flex-col items-end space-y-2">
              <ActionBadge action={action.action} size="sm" />
              {action.recommendation_type && (
                <RecommendationTypeBadge type={action.recommendation_type} size="sm" />
              )}
            </div>
          </div>

          {/* Reasoning */}
          {action.reasoning && (
            <div className="mb-4">
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                {action.reasoning}
              </p>
            </div>
          )}

          {/* Feedback */}
          {action.feedback_reason && (
            <div className="mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Feedback: {action.feedback_reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {action.feedback_comment && (
                    <p className="text-sm text-slate-600 mt-1">"{action.feedback_comment}"</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
            {action.suggested_format && (
              <div>
                <span className="font-medium text-slate-700">Suggested Format:</span>
                <p className="text-slate-600">{action.suggested_format}</p>
              </div>
            )}
            {action.recommendation_score && (
              <div>
                <span className="font-medium text-slate-700">Score:</span>
                <p className="text-slate-600">{(action.recommendation_score * 100).toFixed(1)}%</p>
              </div>
            )}
            {action.session_id && (
              <div>
                <span className="font-medium text-slate-700">Session:</span>
                <p className="text-slate-600 font-mono truncate">{action.session_id}</p>
              </div>
            )}
          </div>
          
          {action.action_data && Object.keys(action.action_data).length > 0 && (
            <div className="mb-4">
              <span className="font-medium text-slate-700 text-sm">Action Data:</span>
              <pre className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border overflow-x-auto">
                {JSON.stringify(action.action_data, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              {action.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${action.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View on IMDB</span>
                </a>
              )}
              
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(action)}
                  className="text-sm text-slate-600 hover:text-slate-800 flex items-center space-x-1 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {onRetryRecommendation && action.action === 'not_interested' && (
                <button
                  onClick={() => onRetryRecommendation(action)}
                  className="text-sm text-green-600 hover:text-green-800 flex items-center space-x-1 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Retry Recommendation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export const RecommendationHistory: React.FC = () => {
  const { user } = useAuth();
  const { actionHistory, loadActionHistory, loading } = useRecommendationActions();

  // Filter states
  const [actionFilter, setActionFilter] = useState<RecommendationAction | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI states
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Load history on mount
  useEffect(() => {
    if (user) {
      loadActionHistory(200); // Load more for history view
    }
  }, [user, loadActionHistory]);

  // Filter and sort actions
  const filteredActions = useMemo(() => {
    if (!actionHistory) return [];

    let filtered = [...actionHistory];

    // Apply filters
    if (actionFilter !== 'all') {
      filtered = filtered.filter(action => action.action === actionFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(action => action.recommendation_type === typeFilter);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case '3months':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(action => {
        const actionDate = new Date(action.created_at || '');
        return actionDate >= cutoffDate;
      });
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(action =>
        action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.reasoning?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        case 'recommendation_type':
          aValue = a.recommendation_type || '';
          bValue = b.recommendation_type || '';
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || '').getTime();
          bValue = new Date(b.created_at || '').getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [actionHistory, actionFilter, typeFilter, dateRange, searchQuery, sortBy, sortOrder]);

  // Clear all filters
  const handleClearFilters = () => {
    setActionFilter('all');
    setTypeFilter('all');
    setDateRange('all');
    setSearchQuery('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  // Export history
  const handleExport = () => {
    if (!filteredActions.length) return;

    const csvContent = [
      ['Date', 'Title', 'Action', 'Type', 'Score', 'Reasoning', 'Feedback'].join(','),
      ...filteredActions.map(action => [
        new Date(action.created_at || '').toLocaleDateString(),
        `"${action.title}"`,
        action.action,
        action.recommendation_type || '',
        action.recommendation_score ? (action.recommendation_score * 100).toFixed(1) : '',
        `"${action.reasoning || ''}"`,
        action.feedback_reason || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recommendation-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
          <p className="text-slate-600">Please sign in to view your recommendation history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <History className="h-8 w-8 text-purple-600" />
              <span>Recommendation History</span>
            </h1>
            <p className="text-slate-600 mt-2">
              Track and manage all your recommendation interactions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={filteredActions.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            <button
              onClick={() => loadActionHistory(200)}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <HistoryFilters
          actionFilter={actionFilter}
          typeFilter={typeFilter}
          dateRange={dateRange}
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onActionFilterChange={setActionFilter}
          onTypeFilterChange={setTypeFilter}
          onDateRangeChange={setDateRange}
          onSearchChange={setSearchQuery}
          onSortChange={(sort, order) => {
            setSortBy(sort);
            setSortOrder(order);
          }}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {filteredActions.length} of {actionHistory?.length || 0} actions
            {(actionFilter !== 'all' || typeFilter !== 'all' || dateRange !== 'all' || searchQuery) && (
              <span className="ml-2 text-purple-600">(filtered)</span>
            )}
          </span>
          {filteredActions.length > 0 && (
            <span>
              Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && !actionHistory && (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            <span className="text-lg text-slate-600">Loading history...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredActions.length === 0 && (
        <div className="text-center py-12">
          <History className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {actionHistory?.length === 0 ? 'No History Yet' : 'No Results Found'}
          </h3>
          <p className="text-slate-600 mb-6">
            {actionHistory?.length === 0 
              ? 'Start exploring recommendations to build your history.'
              : 'Try adjusting your filters to see more results.'
            }
          </p>
          {(actionFilter !== 'all' || typeFilter !== 'all' || dateRange !== 'all' || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      )}

      {/* History Items */}
      {filteredActions.length > 0 && (
        <div className="space-y-4">
          {filteredActions.map((action) => (
            <HistoryItem
              key={action.id}
              action={action}
              onRetryRecommendation={(action) => {
                // TODO: Implement retry recommendation functionality
                alert(`Retry functionality for "${action.title}" coming soon!`);
              }}
              onViewDetails={(action) => {
                // TODO: Implement view details functionality
                console.log('View details for:', action);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};