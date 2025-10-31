// src/components/MyTagsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Settings, TrendingUp } from 'lucide-react';
import { TagManagementModal } from './TagManagementModal';
import { TAG_CATEGORIES } from '../data/taggingCategories';
import { useTags } from '../hooks/useTags';

interface CategoryStats {
  categoryId: number;
  tagCount: number;
  usageCount: number;
  recentActivity: number;
}

export function MyTagsPage() {
  const navigate = useNavigate();
  const { tags, loading } = useTags();
  const [showTagManagementModal, setShowTagManagementModal] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  useEffect(() => {
    if (!tags) return;

    // Calculate stats for each category
    const stats = TAG_CATEGORIES.map(category => {
      const categoryTags = tags.filter(t => t.category_id === category.id);
      const totalUsage = categoryTags.reduce((sum, t) => sum + (t.usage_count || 0), 0);
      
      // Calculate recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentTags = categoryTags.filter(t => 
        new Date(t.created_at) > sevenDaysAgo
      ).length;

      return {
        categoryId: category.id,
        tagCount: categoryTags.length,
        usageCount: totalUsage,
        recentActivity: recentTags
      };
    });

    setCategoryStats(stats);
  }, [tags]);

  const handleCategoryClick = (categoryId: number) => {
    navigate(`/my-tags/category/${categoryId}`);  // ← Note: /my-tags not /tags
  };

  const getCategoryStats = (categoryId: number): CategoryStats => {
    return categoryStats.find(s => s.categoryId === categoryId) || {
      categoryId,
      tagCount: 0,
      usageCount: 0,
      recentActivity: 0
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <Tag className="h-8 w-8 text-blue-500" />
              <span>My Tags</span>
            </h1>
            <p className="text-slate-600 mt-2">
              Organize your collection with custom tags and labels
            </p>
          </div>
          
          <button
            onClick={() => setShowTagManagementModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Tags</span>
          </button>
        </div>

        {/* Overall Stats */}
        {!loading && tags && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">
                {tags.length}
              </div>
              <div className="text-sm text-blue-700">Total Tags</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-900">
                {categoryStats.reduce((sum, s) => sum + s.usageCount, 0)}
              </div>
              <div className="text-sm text-green-700">Total Uses</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="text-2xl font-bold text-purple-900">
                {TAG_CATEGORIES.length}
              </div>
              <div className="text-sm text-purple-700">Categories</div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 3x3 Category Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TAG_CATEGORIES.map((category) => {
            const stats = getCategoryStats(category.id);
            
            return (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>

                <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>

                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {category.description}
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Tags:</span>
                    <span className="font-semibold text-slate-900">
                      {stats.tagCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Uses:</span>
                    <span className="font-semibold text-slate-900">
                      {stats.usageCount}
                    </span>
                  </div>
                  {stats.recentActivity > 0 && (
                    <div className="flex items-center gap-1 text-sm text-green-600 font-medium pt-2">
                      <TrendingUp className="h-3 w-3" />
                      <span>+{stats.recentActivity} this week</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && tags && tags.length === 0 && (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <Tag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No Tags Yet
          </h2>
          <p className="text-slate-600 mb-6">
            Get started by creating your first tag to organize your collection.
          </p>
          <button
            onClick={() => setShowTagManagementModal(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span>Create Your First Tag</span>
          </button>
        </div>
      )}

      <TagManagementModal
        isOpen={showTagManagementModal}
        onClose={() => setShowTagManagementModal(false)}
      />
    </div>
  );
}