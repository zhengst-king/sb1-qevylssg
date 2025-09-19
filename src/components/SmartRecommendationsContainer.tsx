// src/components/SmartRecommendationsContainer.tsx
import React, { useState } from 'react';
import { Sparkles, BarChart3, History, Settings, TrendingUp, Target, Eye } from 'lucide-react';
import { SmartRecommendationsWithActions } from './SmartRecommendationsWithActions';
import { useAuth } from '../hooks/useAuth';
import { useCollections } from '../hooks/useCollections';

type TabType = 'recommendations' | 'analytics' | 'settings';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  description: string;
  badge?: number;
}

// Analytics Dashboard Component (Placeholder for now)
const RecommendationAnalytics: React.FC = () => {
  const { collections } = useCollections();
  
  const stats = {
    totalCollections: collections.length,
    genreBreakdown: collections.reduce((acc, item) => {
      const genre = item.genre || 'Unknown';
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    formatBreakdown: collections.reduce((acc, item) => {
      const format = item.format || 'Unknown';
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Collection Size */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-slate-600">Total Collection</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalCollections}</p>
            </div>
          </div>
        </div>

        {/* Recommendation Readiness */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-slate-600">Recommendation Ready</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.totalCollections >= 3 ? 'Yes' : 'Need ' + (3 - stats.totalCollections)}
              </p>
            </div>
          </div>
        </div>

        {/* Top Genre */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-slate-600">Top Genre</p>
              <p className="text-2xl font-bold text-slate-900">
                {Object.entries(stats.genreBreakdown).length > 0 
                  ? Object.entries(stats.genreBreakdown).sort(([,a], [,b]) => b - a)[0][0] 
                  : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Genre Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Collection Breakdown by Genre</h3>
        <div className="space-y-2">
          {Object.entries(stats.genreBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([genre, count]) => {
              const percentage = Math.round((count / stats.totalCollections) * 100);
              return (
                <div key={genre} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{genre}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-12">{count}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recommendations Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">💡 Recommendation Insights</h3>
        <p className="text-slate-700 mb-4">
          Based on your collection of {stats.totalCollections} items, our recommendation engine can:
        </p>
        <ul className="space-y-2 text-sm text-slate-600">
          {stats.totalCollections >= 3 && (
            <>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Find movies that complete your existing series and franchises
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Suggest similar titles based on your favorite genres and directors
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Identify format upgrades for your most highly-rated movies
              </li>
            </>
          )}
          {stats.totalCollections < 3 && (
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Add {3 - stats.totalCollections} more movies to unlock personalized recommendations
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// Settings Component (Placeholder)
const RecommendationSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommendation Preferences</h3>
        <p className="text-slate-600 mb-4">
          Customize how the recommendation system works for you.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900">Include wishlist items</label>
              <p className="text-xs text-slate-600">Show recommendations even if they're already in your wishlist</p>
            </div>
            <input type="checkbox" className="rounded" defaultChecked={false} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900">Focus on collection gaps</label>
              <p className="text-xs text-slate-600">Prioritize missing movies from series you already own</p>
            </div>
            <input type="checkbox" className="rounded" defaultChecked={true} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900">Format upgrade suggestions</label>
              <p className="text-xs text-slate-600">Suggest 4K/Blu-ray upgrades for DVDs you own</p>
            </div>
            <input type="checkbox" className="rounded" defaultChecked={true} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Advanced Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Maximum recommendations per session
            </label>
            <select className="w-full p-2 border border-slate-300 rounded-md">
              <option value="6">6 recommendations</option>
              <option value="12" selected>12 recommendations</option>
              <option value="18">18 recommendations</option>
              <option value="24">24 recommendations</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Minimum confidence threshold
            </label>
            <select className="w-full p-2 border border-slate-300 rounded-md">
              <option value="0.3">Low (30%)</option>
              <option value="0.5" selected>Medium (50%)</option>
              <option value="0.7">High (70%)</option>
              <option value="0.8">Very High (80%)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

const tabs: TabConfig[] = [
  {
    id: 'recommendations',
    label: 'Recommendations',
    icon: Sparkles,
    component: SmartRecommendationsWithActions,
    description: 'Discover new movies personalized for your collection'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    component: RecommendationAnalytics,
    description: 'View insights about your collection and recommendations'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    component: RecommendationSettings,
    description: 'Customize your recommendation preferences'
  }
];

export const SmartRecommendationsContainer: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { collections } = useCollections();
  const [activeTab, setActiveTab] = useState<TabType>('recommendations');

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Sparkles className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
          <p className="text-slate-600">Please sign in to access smart recommendations.</p>
        </div>
      </div>
    );
  }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || SmartRecommendationsWithActions;
  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <Sparkles className="h-8 w-8 text-purple-600" />
                <span>Smart Recommendations</span>
              </h1>
              <p className="text-slate-600 mt-2">
                {currentTab?.description}
              </p>
            </div>
            
            {/* Collection Status */}
            <div className="hidden md:block">
              <div className="text-right">
                <div className="text-sm text-slate-500">Collection Size</div>
                <div className="text-2xl font-bold text-slate-900">{collections.length}</div>
                {collections.length < 3 && (
                  <div className="text-xs text-orange-600">Need {3 - collections.length} more for recommendations</div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1 bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <ActiveComponent />
      </div>
    </div>
  );
};