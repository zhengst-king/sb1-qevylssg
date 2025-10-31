// src/components/MyTagsPage.tsx
// Main landing page with 3x3 grid of category cards

import React, { useState } from 'react';
import { Tag, Settings, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTagCategories } from '../hooks/useTagCategories';
import { TagManagementModal } from './TagManagementModal';
import type { CategoryStats } from '../types/tagging';

export function MyTagsPage() {
  const navigate = useNavigate();
  const { categoryStats, loading } = useTagCategories();
  const [showTagManagementModal, setShowTagManagementModal] = useState(false);

  const handleCategoryClick = (categoryId: number) => {
    navigate(`/tags/category/${categoryId}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
              Organize your collection with custom tags across 9 categories
            </p>
          </div>

          {/* Manage Tags Button */}
          <button
            onClick={() => setShowTagManagementModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Tags</span>
          </button>
        </div>
      </div>

      {/* 3x3 Category Grid */}
      {categoryStats.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <Tag className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No categories found
          </h2>
          <p className="text-slate-600">
            Please ensure the tag categories are properly seeded in your database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryStats.map((stat) => (
            <CategoryCard
              key={stat.category.id}
              categoryStats={stat}
              onClick={() => handleCategoryClick(stat.category.id)}
            />
          ))}
        </div>
      )}

      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={showTagManagementModal}
        onClose={() => setShowTagManagementModal(false)}
      />
    </div>
  );
}

interface CategoryCardProps {
  categoryStats: CategoryStats;
  onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ categoryStats, onClick }) => {
  const { category, tag_count, usage_count, recent_activity } = categoryStats;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
    >
      {/* Icon */}
      <div className="text-5xl mb-3 transition-transform group-hover:scale-110">
        {category.icon}
      </div>

      {/* Category Name */}
      <h3 className="font-bold text-xl text-slate-900 mb-1">
        {category.name}
      </h3>

      {/* Description */}
      {category.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {category.description}
        </p>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Tags</span>
          <span className="font-semibold text-slate-900">{tag_count}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total uses</span>
          <span className="font-semibold text-slate-900">{usage_count}</span>
        </div>

        {recent_activity > 0 && (
          <div className="flex items-center gap-1 text-sm text-green-600 pt-2">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">+{recent_activity} this week</span>
          </div>
        )}
      </div>
    </div>
  );
};