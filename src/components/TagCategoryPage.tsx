// src/components/TagCategoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Search, Settings, Calendar } from 'lucide-react';
import { TAG_CATEGORIES, getCategoryById } from '../data/taggingCategories';
import { getSubcategoriesByCategory, getVisibleSubcategories } from '../data/taggingSubcategories';
import { useTags } from '../hooks/useTags';
import { TagCard } from './TagCard';
import { TagDetailModal } from './TagDetailModal';
import { TagManagementModal } from './TagManagementModal';
import type { Tag } from '../types/customCollections';

export function TagCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { tags, loading } = useTags();
  
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showManagementModal, setShowManagementModal] = useState(false);
  
  const categoryIdNum = parseInt(categoryId || '0');
  const category = getCategoryById(categoryIdNum);
  
  // Get all subcategories for this category (both visible and suggested + custom)
  const allSubcategories = getSubcategoriesByCategory(categoryIdNum);
  const visibleSubcategories = getVisibleSubcategories(categoryIdNum);
  
  // Filter tags by category
  const categoryTags = tags?.filter(tag => tag.category_id === categoryIdNum) || [];
  
  // Get unique subcategories that have tags (including custom ones)
  const subcategoriesWithTags = React.useMemo(() => {
    const subcatIds = new Set(categoryTags.map(t => t.subcategory_id));
    return allSubcategories.filter(sub => subcatIds.has(sub.id));
  }, [categoryTags, allSubcategories]);
  
  // Filter tags by subcategory and search
  const filteredTags = React.useMemo(() => {
    let filtered = categoryTags;
    
    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(t => t.subcategory_id === selectedSubcategory);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [categoryTags, selectedSubcategory, searchQuery]);
  
  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Category Not Found</h2>
        <button
          onClick={() => navigate('/my-tags')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to My Tags
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center text-sm text-slate-600">
        <Link to="/my-tags" className="hover:text-blue-600">
          My Tags
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-slate-900 font-medium">{category.name}</span>
      </div>
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-5xl">{category.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {category.name}
              </h1>
              <p className="text-slate-600">{category.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Shortened Search Bar */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowManagementModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Manage Tags</span>
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{categoryTags.length} tags</span>
          </div>
          <div>
            {categoryTags.reduce((sum, t) => sum + (t.usage_count || 0), 0)} total uses
          </div>
        </div>
        
        {/* Visible Subcategories as Filter Labels */}
        {visibleSubcategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleSubcategories.map((subcategory) => {
              const tagCount = categoryTags.filter(t => t.subcategory_id === subcategory.id).length;
              if (tagCount === 0) return null;
              
              return (
                <button
                  key={subcategory.id}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    ${selectedSubcategory === subcategory.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }
                  `}
                >
                  {subcategory.name} ({tagCount})
                </button>
              );
            })}
            {selectedSubcategory !== 'all' && (
              <button
                onClick={() => setSelectedSubcategory('all')}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Tags Grid */}
      {!loading && filteredTags.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              categoryIcon={category.icon}
              onClick={() => setSelectedTag(tag)}
            />
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {!loading && filteredTags.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <div className="text-5xl mb-4">{category.icon}</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery || selectedSubcategory !== 'all' 
              ? 'No tags found'
              : 'No tags in this category yet'
            }
          </h3>
          <p className="text-slate-600">
            {searchQuery || selectedSubcategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Use the "Manage Tags" button above to create your first tag'
            }
          </p>
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
      
      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
      />
    </div>
  );
}