// src/components/TagManagementModal.tsx
// Modal for managing all tags

import React, { useState } from 'react';
import { X, Tag as TagIcon, Edit2, Trash2, Plus, Merge } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import type { Tag, TagCategory } from '../types/customCollections';
import { COLLECTION_COLORS } from '../types/customCollections';

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAG_CATEGORIES: { value: TagCategory; label: string }[] = [
  { value: 'genre', label: 'Genre' },
  { value: 'mood', label: 'Mood' },
  { value: 'theme', label: 'Theme' },
  { value: 'occasion', label: 'Occasion' },
  { value: 'quality', label: 'Quality' },
  { value: 'format_detail', label: 'Format Detail' },
  { value: 'collection_status', label: 'Collection Status' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export const TagManagementModal: React.FC<TagManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tags, createTag, updateTag, deleteTag, mergeTags, loading } = useTags();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: COLLECTION_COLORS[12], // Gray default
    category: 'other' as TagCategory,
  });
  const [filterCategory, setFilterCategory] = useState<TagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateTag(editingId, formData);
        setEditingId(null);
      } else {
        await createTag(formData);
        setShowCreateForm(false);
      }
      
      setFormData({
        name: '',
        color: COLLECTION_COLORS[12],
        category: 'other',
      });
    } catch (error) {
      console.error('Error saving tag:', error);
    }
  };

  const handleEdit = (tag: Tag) => {
    setFormData({
      name: tag.name,
      color: tag.color,
      category: tag.category,
    });
    setEditingId(tag.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tag? It will be removed from all items.')) {
      try {
        await deleteTag(id);
      } catch (error) {
        console.error('Error deleting tag:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      color: COLLECTION_COLORS[12],
      category: 'other',
    });
  };

  // Filter tags
  const filteredTags = tags.filter(tag => {
    const matchesCategory = filterCategory === 'all' || tag.category === filterCategory;
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group tags by category
  const tagsByCategory = filteredTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<TagCategory, Tag[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manage Tags</h2>
            <p className="text-sm text-slate-600 mt-1">
              Create and organize tags for flexible categorization
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create/Edit Form */}
          {showCreateForm ? (
            <form onSubmit={handleSubmit} className="mb-6 bg-slate-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editingId ? 'Edit Tag' : 'Create New Tag'}
              </h3>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tag Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Action-Packed, Must Watch"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TagCategory })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TAG_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLLECTION_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.color === color
                            ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingId ? 'Update Tag' : 'Create Tag'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Tag</span>
            </button>
          )}

          {/* Search and Filter */}
          <div className="mb-4 flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TagCategory | 'all')}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {TAG_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 mt-2">Loading tags...</p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                No tags found
              </h3>
              <p className="text-slate-500">
                {searchQuery || filterCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first tag to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase">
                    {TAG_CATEGORIES.find(c => c.value === category)?.label || category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:shadow-sm transition-all group"
                        style={{
                          backgroundColor: `${tag.color}10`,
                          borderColor: `${tag.color}40`,
                        }}
                      >
                        <TagIcon className="h-4 w-4" style={{ color: tag.color }} />
                        <span className="font-medium text-slate-900">{tag.name}</span>
                        <span className="text-xs text-slate-500">
                          ({tag.usage_count})
                        </span>
                        
                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(tag)}
                            className="p-1 hover:bg-white rounded transition-colors"
                            title="Edit tag"
                          >
                            <Edit2 className="h-3 w-3 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            className="p-1 hover:bg-white rounded transition-colors"
                            title="Delete tag"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {tags.length} {tags.length === 1 ? 'tag' : 'tags'} • 
            {' '}{tags.reduce((sum, t) => sum + t.usage_count, 0)} total uses
          </p>
        </div>
      </div>
    </div>
  );
};