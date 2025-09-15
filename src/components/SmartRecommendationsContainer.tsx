// src/components/SmartRecommendationsContainer.tsx
import React, { useState } from 'react';
import { Sparkles, BarChart3, History, Settings } from 'lucide-react';
import { SmartRecommendationsWithActions } from './SmartRecommendationsWithActions';
import { RecommendationAnalyticsDashboard } from './RecommendationAnalyticsDashboard';
import { RecommendationHistory } from './RecommendationHistory';
import { useAuth } from '../hooks/useAuth';

type TabType = 'recommendations' | 'analytics' | 'history';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'recommendations',
    label: 'Recommendations',
    icon: Sparkles,
    component: SmartRecommendationsWithActions,
    description: 'Discover new movies for your collection'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    component: RecommendationAnalyticsDashboard,
    description: 'View your recommendation insights'
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    component: RecommendationHistory,
    description: 'Review your recommendation interactions'
  }
];

export const SmartRecommendationsContainer: React.FC = () => {
  const { isAuthenticated } = useAuth();
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
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
            
            {/* Quick Settings Link */}
            <div className="hidden md:block">
              <button
                onClick={() => {
                  // This would open the preferences modal from the settings page
                  // For now, we'll alert - you can implement this to open the modal directly
                  alert('Tip: Go to Settings > Smart Recommendations to customize your preferences!');
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-600"
              >
                <Settings className="h-4 w-4" />
                <span>Preferences</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen bg-slate-50">
        <ActiveComponent />
      </div>
    </div>
  );
};