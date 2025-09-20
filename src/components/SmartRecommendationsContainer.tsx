// src/components/SmartRecommendationsContainer.tsx
import React from 'react';
import { Sparkles } from 'lucide-react';
import { SmartRecommendationsWithActions } from './SmartRecommendationsWithActions';
import { useAuth } from '../hooks/useAuth';
import { useCollections } from '../hooks/useCollections';

export const SmartRecommendationsContainer: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { collections } = useCollections();

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Sparkles className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
          <p className="text-slate-600">Please sign in to access personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <Sparkles className="h-8 w-8 text-purple-600" />
                <span>New2Me</span>
              </h1>
              <p className="text-slate-600 mt-2">
                Discover new movies and shows personalized for your collection
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
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <SmartRecommendationsWithActions />
      </div>
    </div>
  );
};