// src/components/TagSelectorModal.tsx
// Reusable modal for adding tags to movies or TV episodes

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useTags, useContentTags } from '../hooks/useTags';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { tagsService } from '../services/tagsService';
import { contentTagsService } from '../services/contentTagsService';
import { getCategoryById } from '../data/taggingCategories';
import type { Tag } from '../types/customCollections';

interface TagSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: number;
  contentType: 'movie' | 'tv';
  contentTitle: string;
  onTagsUpdated?: () => void;
}

export const TagSelectorModal: React.FC<TagSelectorModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle,
  onTagsUpdated,
}) => {
  const { tags } = useTags();
  const { subcategories } = useTagSubcategories();
  const { contentTags, addTag, removeTag: removeContentTag, refetch: refetchContentTags } = useContentTags(
    contentId,
    contentType
  );

  const [showCreateNewForm, setShowCreateNewForm] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [selectedDropdownCategory, setSelectedDropdownCategory] = useState<number | null>(null);
  const [selectedDropdownSubcategory, setSelectedDropdownSubcategory] = useState<number | null>(null);

  // Create new tag state
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<number>(1);
  const [newTagSubcategory, setNewTagSubcategory] = useState<number>(1);
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const handleClose = () => {
    setShowCreateNewForm(false);
    setSelectedDropdownCategory(null);
    setSelectedDropdownSubcategory(null);
    onClose();
  };

  const handleAddExistingTag = async (tagId: string) => {
    setAddingTag(true);
    try {
      await addTag(tagId);
      await refetchContentTags();
      if (onTagsUpdated) onTagsUpdated();
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('Failed to add tag');
    } finally {
      setAddingTag(false);
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!newTagName.trim()) {
      alert('Tag name is required');
      return;
    }

    setAddingTag(true);
    try {
      // Create the tag
      const newTag = await tagsService.createTag({
        name: newTagName.trim(),
        description: newTagDescription.trim() || null,
        category_id: newTagCategory,
        subcategory_id: newTagSubcategory,
        color: newTagColor,
      });

      // Add it to this content
      await contentTagsService.addTagToContent(newTag.id, contentId, contentType);
      await refetchContentTags();

      // Reset form
      setNewTagName('');
      setNewTagDescription('');
      setNewTagColor('#3B82F6');
      setShowCreateNewForm(false);
      
      if (onTagsUpdated) onTagsUpdated();
      alert(`Tag "${newTag.name}" created and added!`);
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeContentTag(tagId);
      await refetchContentTags();
      if (onTagsUpdated) onTagsUpdated();
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">Add Tags to "{contentTitle}"</h3>
          <div className="flex items-center space-x-3">
            {/* Create New Tag Button */}
            <button
              onClick={() => setShowCreateNewForm(!showCreateNewForm)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                showCreateNewForm
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {showCreateNewForm ? (
                <>
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New Tag</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showCreateNewForm ? (
            /* Create New Tag Form */
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 text-lg mb-4">Create New Tag</h4>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tag Name *
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Mind-Bending, Feel-Good, etc."
                    maxLength={100}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={newTagCategory}
                      onChange={(e) => {
                        setNewTagCategory(parseInt(e.target.value));
                        const firstSubcat = subcategories?.find(s => s.category_id === parseInt(e.target.value));
                        if (firstSubcat) setNewTagSubcategory(firstSubcat.id);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(id => {
                        const cat = getCategoryById(id);
                        return (
                          <option key={id} value={id}>
                            {cat?.icon} {cat?.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Subcategory *
                    </label>
                    <select
                      value={newTagSubcategory}
                      onChange={(e) => setNewTagSubcategory(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {subcategories
                        ?.filter(s => s.category_id === newTagCategory && s.is_visible)
                        .map(subcat => (
                          <option key={subcat.id} value={subcat.id}>
                            {subcat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTagDescription}
                    onChange={(e) => setNewTagDescription(e.target.value)}
                    placeholder="What does this tag represent?"
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-600">{newTagColor}</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateAndAddTag}
                  disabled={!newTagName.trim() || addingTag}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {addingTag ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Create & Add Tag</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* 3-Column Tag Browser */
            <div className="space-y-6">
              {/* 3 Columns */}
              <div className="grid grid-cols-3 gap-4" style={{ height: '400px' }}>
                {/* Column 1: Categories */}
                <div className="border-2 border-slate-200 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-900">Categories</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(id => {
                      const category = getCategoryById(id);
                      const categoryTags = tags.filter(t => t.category_id === id);
                      if (categoryTags.length === 0) return null;
                      
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedDropdownCategory(id);
                            setSelectedDropdownSubcategory(null);
                          }}
                          className={`w-full px-3 py-2.5 rounded-lg transition-all text-left mb-1 ${
                            selectedDropdownCategory === id
                              ? 'bg-blue-100 border-2 border-blue-500'
                              : 'hover:bg-slate-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{category?.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 text-sm">{category?.name}</div>
                              <div className="text-xs text-slate-500">{categoryTags.length} tags</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Subcategories */}
                <div className="border-2 border-slate-200 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-900">
                      {selectedDropdownCategory ? 'Subcategories' : 'Select a category'}
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {selectedDropdownCategory ? (
                      subcategories
                        ?.filter(s => s.category_id === selectedDropdownCategory)
                        .map(subcat => {
                          const subcatTags = tags.filter(
                            t => t.category_id === selectedDropdownCategory && t.subcategory_id === subcat.id
                          );
                          if (subcatTags.length === 0) return null;
                          
                          return (
                            <button
                              key={subcat.id}
                              onClick={() => setSelectedDropdownSubcategory(subcat.id)}
                              className={`w-full px-3 py-2.5 rounded-lg transition-all text-left mb-1 ${
                                selectedDropdownSubcategory === subcat.id
                                  ? 'bg-blue-100 border-2 border-blue-500'
                                  : 'hover:bg-slate-50 border-2 border-transparent'
                              }`}
                            >
                              <div className="font-medium text-slate-900 text-sm">{subcat.name}</div>
                              <div className="text-xs text-slate-500">{subcatTags.length} tags</div>
                            </button>
                          );
                        })
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        ← Select a category
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Tags */}
                <div className="border-2 border-slate-200 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-900">
                      {selectedDropdownSubcategory ? 'Tags' : 'Select a subcategory'}
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {selectedDropdownCategory && selectedDropdownSubcategory ? (
                      tags
                        .filter(
                          t => 
                            t.category_id === selectedDropdownCategory && 
                            t.subcategory_id === selectedDropdownSubcategory
                        )
                        .map(tag => {
                          const isAlreadyAdded = contentTags.some(ct => ct.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => !isAlreadyAdded && handleAddExistingTag(tag.id)}
                              disabled={isAlreadyAdded || addingTag}
                              className={`w-full px-3 py-2.5 rounded-lg transition-all text-left mb-1 ${
                                isAlreadyAdded
                                  ? 'bg-green-50 border-2 border-green-300 cursor-not-allowed'
                                  : 'hover:bg-blue-50 border-2 border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: tag.color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-900 text-sm">{tag.name}</div>
                                  {tag.description && (
                                    <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                                      {tag.description}
                                    </div>
                                  )}
                                </div>
                                {isAlreadyAdded && (
                                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        ← Select a subcategory
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Tags Display */}
              {contentTags.length > 0 && (
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    <span>Tags on this {contentType === 'movie' ? 'movie' : 'episode'} ({contentTags.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {contentTags.map((tag) => {
                      const category = getCategoryById(tag.category_id);
                      
                      return (
                        <div
                          key={tag.id}
                          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <span className="text-xs">{category?.icon}</span>
                          <div 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-medium text-slate-900 text-sm">{tag.name}</span>
                          <button
                            onClick={() => handleRemoveTag(tag.id)}
                            className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove tag"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};