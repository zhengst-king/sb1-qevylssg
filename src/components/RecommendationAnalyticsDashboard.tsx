// src/components/RecommendationAnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Heart,
  Package,
  X,
  Eye,
  Sparkles,
  Clock,
  Star,
  Users,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Lightbulb,
  PieChart,
  Activity,
  Award,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRecommendationActions } from '../hooks/useRecommendationActions';
import { useCollections } from '../hooks/useCollections';

interface AnalyticsCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const AnalyticsCard: React.FC<AnalyticsCard> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
  description
}) => (
  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {change && (
          <p className={`text-sm mt-1 ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 'text-slate-600'
          }`}>
            {change}
          </p>
        )}
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

const SimpleChart: React.FC<{ 
  data: ChartData[]; 
  title: string; 
  type: 'bar' | 'pie';
  height?: number;
}> = ({ data, title, type, height = 200 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map(item => item.value));

  if (type === 'bar') {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="space-y-3" style={{ height }}>
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-900 font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Pie chart (simplified visualization)
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-3" style={{ height }}>
        {data.map((item, index) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-700">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-900">{item.value}</span>
                <span className="text-xs text-slate-500 ml-1">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimeRangeSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const options = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: 'all', label: 'All time' }
  ];

  return (
    <div className="flex space-x-2">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export const RecommendationAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { collections } = useCollections({ collectionType: 'all' });
  const { 
    actionStats, 
    actionHistory, 
    loadActionStats, 
    loadActionHistory,
    loading 
  } = useRecommendationActions();

  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount and when time range changes
  useEffect(() => {
    if (user) {
      loadActionStats();
      loadActionHistory(100); // Load more for analytics
    }
  }, [user, timeRange, loadActionStats, loadActionHistory]);

  // Calculate analytics metrics
  const analytics = useMemo(() => {
    if (!actionStats || !actionHistory) return null;

    const filteredHistory = actionHistory.filter(action => {
      if (timeRange === 'all') return true;
      
      const actionDate = new Date(action.created_at || '');
      const now = new Date();
      const daysAgo = parseInt(timeRange);
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      return actionDate >= cutoffDate;
    });

    const totalActions = filteredHistory.length;
    const conversionActions = filteredHistory.filter(
      action => action.action === 'add_to_wishlist' || action.action === 'mark_as_owned'
    ).length;
    const conversionRate = totalActions > 0 ? (conversionActions / totalActions) * 100 : 0;

    // Action breakdown
    const actionBreakdown = {
      add_to_wishlist: filteredHistory.filter(a => a.action === 'add_to_wishlist').length,
      mark_as_owned: filteredHistory.filter(a => a.action === 'mark_as_owned').length,
      not_interested: filteredHistory.filter(a => a.action === 'not_interested').length,
      viewed: filteredHistory.filter(a => a.action === 'viewed').length
    };

    // Recommendation type breakdown
    const typeBreakdown = {
      collection_gap: filteredHistory.filter(a => a.recommendation_type === 'collection_gap').length,
      format_upgrade: filteredHistory.filter(a => a.recommendation_type === 'format_upgrade').length,
      similar_title: filteredHistory.filter(a => a.recommendation_type === 'similar_title').length
    };

    // Calculate engagement trends
    const avgActionsPerSession = filteredHistory.length > 0 ? 
      (filteredHistory.length / new Set(filteredHistory.map(a => a.session_id)).size) : 0;

    // Top dismissed reasons
    const dismissalReasons = filteredHistory
      .filter(a => a.action === 'not_interested' && a.feedback_reason)
      .reduce((acc, action) => {
        const reason = action.feedback_reason!;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalActions,
      conversionRate,
      actionBreakdown,
      typeBreakdown,
      avgActionsPerSession,
      dismissalReasons,
      filteredHistory
    };
  }, [actionStats, actionHistory, timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadActionStats();
      await loadActionHistory(100);
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
          <p className="text-slate-600">Please sign in to view your recommendation analytics.</p>
        </div>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            <span className="text-lg text-slate-600">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalActions === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Analytics Data</h2>
          <p className="text-slate-600 mb-6">
            Start using recommendations to see your analytics here.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            <span>View Recommendations</span>
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const actionChartData: ChartData[] = [
    { name: 'Added to Wishlist', value: analytics.actionBreakdown.add_to_wishlist, color: '#dc2626' },
    { name: 'Marked as Owned', value: analytics.actionBreakdown.mark_as_owned, color: '#16a34a' },
    { name: 'Not Interested', value: analytics.actionBreakdown.not_interested, color: '#ea580c' },
    { name: 'Viewed Only', value: analytics.actionBreakdown.viewed, color: '#6b7280' }
  ].filter(item => item.value > 0);

  const typeChartData: ChartData[] = [
    { name: 'Collection Gaps', value: analytics.typeBreakdown.collection_gap, color: '#2563eb' },
    { name: 'Format Upgrades', value: analytics.typeBreakdown.format_upgrade, color: '#16a34a' },
    { name: 'Similar Titles', value: analytics.typeBreakdown.similar_title, color: '#9333ea' }
  ].filter(item => item.value > 0);

  const dismissalChartData: ChartData[] = Object.entries(analytics.dismissalReasons)
    .map(([reason, count], index) => ({
      name: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#f97316'][index % 6]
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <span>Recommendation Analytics</span>
            </h1>
            <p className="text-slate-600 mt-2">
              Insights into your recommendation engagement and preferences
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AnalyticsCard
          title="Total Actions"
          value={analytics.totalActions}
          icon={Activity}
          color="bg-blue-600"
          description="All recommendation interactions"
        />
        
        <AnalyticsCard
          title="Conversion Rate"
          value={`${analytics.conversionRate.toFixed(1)}%`}
          changeType={analytics.conversionRate > 15 ? 'positive' : analytics.conversionRate < 5 ? 'negative' : 'neutral'}
          change={analytics.conversionRate > 15 ? 'Excellent!' : analytics.conversionRate < 5 ? 'Could improve' : 'Good'}
          icon={TrendingUp}
          color="bg-green-600"
          description="Added to collection or wishlist"
        />
        
        <AnalyticsCard
          title="Avg Actions/Session"
          value={analytics.avgActionsPerSession.toFixed(1)}
          icon={Target}
          color="bg-purple-600"
          description="Engagement per visit"
        />
        
        <AnalyticsCard
          title="Collection Size"
          value={collections.length}
          icon={Package}
          color="bg-orange-600"
          description="Items in your collection"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SimpleChart
          data={actionChartData}
          title="Actions Breakdown"
          type="pie"
          height={250}
        />
        
        <SimpleChart
          data={typeChartData}
          title="Recommendation Types"
          type="bar"
          height={250}
        />
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {dismissalChartData.length > 0 && (
          <SimpleChart
            data={dismissalChartData.slice(0, 5)}
            title="Top Dismissal Reasons"
            type="bar"
            height={200}
          />
        )}
        
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Insights</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Lightbulb className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-slate-900">Most Successful Type</h4>
                <p className="text-sm text-slate-600">
                  {typeChartData.length > 0 
                    ? `${typeChartData.sort((a, b) => b.value - a.value)[0].name} recommendations work best for you`
                    : 'Not enough data yet'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-slate-900">Engagement Level</h4>
                <p className="text-sm text-slate-600">
                  {analytics.conversionRate > 20 ? 'Excellent! You act on most recommendations.' :
                   analytics.conversionRate > 10 ? 'Good engagement with recommendations.' :
                   'Consider exploring more recommendations to find what you like.'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-slate-900">Activity Pattern</h4>
                <p className="text-sm text-slate-600">
                  You average {analytics.avgActionsPerSession.toFixed(1)} actions per session.
                  {analytics.avgActionsPerSession > 3 ? ' Very engaged!' : ' Consider exploring more each visit.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Export Analytics</h3>
            <p className="text-sm text-slate-600 mt-1">
              Download your recommendation data for further analysis
            </p>
          </div>
          
          <button
            onClick={() => {
              // TODO: Implement analytics export
              alert('Analytics export coming soon!');
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};