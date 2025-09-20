// src/components/AnalyticsPage.tsx
import React from 'react';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

export function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-purple-500" />
          <span>Analytics</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Deep insights into your collection patterns and preferences
        </p>
      </div>
      
      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Collection Growth</h3>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-slate-600">Track how your collection grows over time</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Genre Distribution</h3>
            <PieChart className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-slate-600">Visualize your collection by genres and formats</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Activity Trends</h3>
            <Activity className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-slate-600">Analyze your viewing and collection patterns</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <BarChart3 className="h-16 w-16 text-purple-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Advanced Analytics Coming Soon</h2>
        <p className="text-slate-600">
          This page will provide comprehensive analytics for your collection including recommendation performance,
          spending analytics, collection value tracking, and advanced insights.
        </p>
      </div>
    </div>
  );
}