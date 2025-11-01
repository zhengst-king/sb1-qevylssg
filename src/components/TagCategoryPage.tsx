// src/components/TagCategoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Settings, Calendar } from 'lucide-react';
import { TAG_CATEGORIES, getCategoryById } from '../data/taggingCategories';
import { useTags } from '../hooks/useTags';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { TagCard } from './TagCard';
import { TagDetailModal } from './TagDetailModal';
import { EnhancedTagManagementModal } from './EnhancedTagManagementModal';
import type { Tag } from '../types/customCollections';

export function TagCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { tags, loading, refetch } = useTags();
  const { subcategories, getVisibleSubcategories, refetch: refetchSubcategories } = useTagSubcategories();
  
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showManagementModal, setShowManagementModal] = useState(false);
  
  // Callback to refetch tags and subcategories when a new tag is created
  const handleTagCreated = () => {
    refetch();
    refetchSubcategories();
  };
  
  const categoryIdNum = parseInt(categoryId || '0');
  const category = getCategoryById(categoryIdNum);
  
  // Get visible subcategories for this category from the hook
  const visibleSubcategories = getVisibleSubcategories(categoryIdNum);
  
  // Filter tags by category
  const categoryTags = tags?.filter(tag => tag.category_id === categoryIdNum) || [];
  
  // Filter tags by subcategory and search
  const filteredTags = React.useMemo(() => {
    let filtered = categoryTags;
    
    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(t => 
        String(t.subcategory_id) === String(selectedSubcategory)
      );
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-visible">
      {/* Category Navigation Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2">
          {/* All Categories Tab */}
          <Link
            to="/my-tags"
            className={`
              flex items-center justify-center px-4 py-3 rounded-t-lg transition-all whitespace-nowrap
              ${!categoryId || categoryId === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
            title="All Categories"
          >
            <span className="text-base font-semibold">All</span>
          </Link>
          
          {/* Category Tabs */}
          {TAG_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/my-tags/category/${cat.id}`}
              className={`
                flex items-center justify-center px-4 py-3 rounded-t-lg transition-all min-w-[60px]
                ${categoryIdNum === cat.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 hover:bg-slate-200'
                }
              `}
              title={cat.name}
            >
              <span className="text-2xl">{cat.icon}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-3">
            <span className="text-5xl">{category.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {category.name}
              </h1>
              {/* Stats moved here */}
              <div className="flex items-center gap-6 text-sm text-slate-600 mt-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{categoryTags.length} tags</span>
                </div>
                <div>
                  {categoryTags.reduce((sum, t) => sum + (t.usage_count || 0), 0)} total uses
                </div>
              </div>
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
        
        {/* Stacked Tabs - Subcategory Filters (File Folder Style) */}
        {visibleSubcategories.length > 0 && (
          <div className="-mt-4 relative" style={{ position: 'relative', zIndex: 100 }}>
            <div className="flex items-end justify-start overflow-x-auto gap-0 w-full pr-8" style={{ position: 'relative', zIndex: 50 }}>
              {/* "All" Tab */}
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`
                  relative px-4 py-2.5 rounded-t-lg font-medium 
                  transition-all duration-300 flex flex-col items-center justify-center
                  border-t-2 border-l-2 border-r-2 flex-1
                  ${selectedSubcategory === 'all'
                    ? 'bg-blue-600 text-white shadow-lg -translate-y-10 min-w-[100px] max-w-[140px] h-[65px] border-blue-700'
                    : 'bg-slate-300 text-slate-700 hover:-translate-y-10 min-w-[80px] max-w-[120px] h-[56px] border-slate-400'
                  }
                `}
                style={{
                  marginLeft: 0,
                  marginRight: selectedSubcategory === 'all' ? '-12px' : '-30px',
                  zIndex: selectedSubcategory === 'all' ? 100 : 50,
                  marginBottom: '0',
                  borderBottom: selectedSubcategory === 'all' ? '2px solid rgb(37, 99, 235)' : 'none'
                }}
              >
                <div className="text-xs font-bold leading-tight text-center">All</div>
                {selectedSubcategory === 'all' && (
                  <div className="text-[10px] mt-1 opacity-90">{categoryTags.length}</div>
                )}
              </button>
              
              {/* Subcategory Tabs */}
              {visibleSubcategories.map((subcategory, index) => {
                const isSelected = String(selectedSubcategory) === String(subcategory.id);
                const tagCount = categoryTags.filter(t => 
                  String(t.subcategory_id) === String(subcategory.id)
                ).length;
                const hasContent = tagCount > 0;
                
                return (
                  <button
                    key={subcategory.id}
                    onClick={() => setSelectedSubcategory(subcategory.id)}
                    className={`
                      relative px-4 py-2.5 rounded-t-lg font-medium 
                      transition-all duration-300 flex flex-col items-center justify-center
                      border-t-2 border-l-2 border-r-2 flex-1
                      ${isSelected
                        ? hasContent
                          ? 'bg-blue-600 text-white shadow-lg -translate-y-3 min-w-[120px] max-w-[160px] h-[65px] border-blue-700'
                          : 'bg-slate-500 text-white shadow-lg -translate-y-3 min-w-[120px] max-w-[160px] h-[65px] border-slate-600'
                        : hasContent
                          ? 'bg-blue-200 text-blue-900 hover:-translate-y-3 min-w-[90px] max-w-[140px] h-[56px] border-blue-300'
                          : 'bg-slate-300 text-slate-700 hover:-translate-y-3 min-w-[90px] max-w-[140px] h-[56px] border-slate-400'
                      }
                    `}
                    style={{
                      marginLeft: isSelected ? '-12px' : '0',
                      marginRight: isSelected ? '-12px' : '-30px',
                      zIndex: isSelected ? 100 : 50 - index,
                      marginBottom: '0',
                      borderBottom: isSelected ? (hasContent ? '2px solid rgb(37, 99, 235)' : '2px solid rgb(100, 116, 139)') : 'none'
                    }}
                    title={subcategory.name}
                  >
                    <div className={`text-xs font-bold leading-tight text-center px-1 ${isSelected ? 'line-clamp-2' : 'line-clamp-1'}`}>
                      {subcategory.name}
                    </div>
                    {isSelected && (
                      <div className="text-[10px] mt-1 opacity-90">
                        {tagCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Bottom Border - Connected to tabs */}
            <div className="h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 w-full relative" style={{ marginTop: '-2px', zIndex: 150 }}></div>
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
      
      {/* Enhanced Tag Management Modal */}
      <EnhancedTagManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        defaultCategoryId={categoryIdNum}
        onTagCreated={handleTagCreated}
      />
    </div>
  );
}