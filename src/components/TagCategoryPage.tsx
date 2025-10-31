// src/components/TagCategoryPage.tsx
// Individual category page with subcategory tabs and tag cards

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Settings, Calendar } from 'lucide-react';
import { useTagCategories } from '../hooks/useTagCategories';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { useTags } from '../hooks/useTags';
import { TagCard } from './TagCard';
import { TagDetailModal } from './TagDetailModal';
import { TagManagementModal } from './TagManagementModal';
import type { Tag } from '../types/tagging';

export function TagCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  const { categories } = useTagCategories();
  const { subcategories, loading: subcategoriesLoading } = useTagSubcategories({
    categoryId: categoryId ? parseInt(categoryId) : undefined,
  });
  const { tags, loading: tagsLoading } = useTags({
    categoryId: categoryId ? parseInt(categoryId) : undefined,
  });

  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);

  const category = categories.find(c => c.id === parseInt(categoryId || ''));

  // Filter tags by subcategory and search
  const filteredTags = tags.filter(tag => {
    const matchesSubcategory = activeSubcategoryId === 'all' || tag.subcategory_id === activeSubcategoryId;
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubcategory && matchesSearch;
  });

  // Get visible subcategories (predefined visible + user custom)
  const visibleSubcategories = subcategories.filter(sub => sub.is_visible || sub.is_custom);

  // Count tags per subcategory
  const subcategoryTagCounts = subcategories.reduce((acc, sub) => {
    acc[sub.id] = tags.filter(t => t.subcategory_id === sub.id).length;
    return acc;
  }, {} as Record<string, number>);

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Category not found</h2>
          <button
            onClick={() => navigate('/tags')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tags
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
        <button
          onClick={() => navigate('/tags')}
          className="hover:text-blue-600 transition-colors"
        >
          My Tags
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">{category.name}</span>
      </div>

      {/* Top Bar */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{category.icon}</span>
              <h1 className="text-3xl font-bold text-slate-900">{category.name}</h1>
            </div>
            {category.description && (
              <p className="text-slate-600">{category.description}</p>
            )}
          </div>

          <button
            onClick={() => setShowManageModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Tags</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date Created */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
          <Calendar className="h-4 w-4" />
          <span>Category created: {new Date(category.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Subcategory Tabs (Horizontal Scrollable) */}
      <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setActiveSubcategoryId('all')}
            className={`
              px-4 py-2 rounded-lg whitespace-nowrap transition-all font-medium
              ${activeSubcategoryId === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }
            `}
          >
            All ({tags.length})
          </button>
          
          {visibleSubcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubcategoryId(sub.id)}
              className={`
                px-4 py-2 rounded-lg whitespace-nowrap transition-all font-medium
                ${activeSubcategoryId === sub.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              {sub.name} ({subcategoryTagCounts[sub.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Tags Grid */}
      {tagsLoading || subcategoriesLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl">
          <div className="text-6xl mb-4">{category.icon}</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No tags yet
          </h3>
          <p className="text-slate-600 mb-4">
            {searchQuery
              ? 'No tags match your search'
              : activeSubcategoryId !== 'all'
              ? 'No tags in this subcategory'
              : 'Create your first tag to get started'}
          </p>
          <button
            onClick={() => setShowManageModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Tag
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onClick={setSelectedTag}
            />
          ))}
        </div>
      )}

      {/* Tag Detail Modal */}
      {selectedTag && (
        <TagDetailModal
          tag={selectedTag}
          isOpen={!!selectedTag}
          onClose={() => setSelectedTag(null)}
        />
      )}

      {/* Manage Tags Modal */}
      <TagManagementModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
      />
    </div>
  );
}