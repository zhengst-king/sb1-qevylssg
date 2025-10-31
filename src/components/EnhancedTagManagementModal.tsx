// src/components/EnhancedTagManagementModal.tsx
// Complete tag management modal with create form, import/export, and subcategory management

import React, { useState } from 'react';
import { X, Plus, Upload, Download, FileText, ChevronDown, ChevronUp, Move, Trash2 } from 'lucide-react';
import { useTagCategories } from '../hooks/useTagCategories';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { useTags } from '../hooks/useTags';

interface EnhancedTagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategoryId?: number;
}

const COLLECTION_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#71717A', '#A1A1AA'
];

export const EnhancedTagManagementModal: React.FC<EnhancedTagManagementModalProps> = ({
  isOpen,
  onClose,
  defaultCategoryId,
}) => {
  const { categories } = useTagCategories();
  const { subcategories, createSubcategory, deleteSubcategory } = useTagSubcategories();
  const { createTag } = useTags({ autoFetch: false });

  const [activeSection, setActiveSection] = useState<'create' | 'import' | 'subcategories'>('create');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Create Tag Form State
  const [formData, setFormData] = useState({
    category_id: defaultCategoryId || categories[0]?.id || 1,
    subcategory_id: '',
    name: '',
    description: '',
    color: COLLECTION_COLORS[11], // Default blue
  });

  const [showAddSubcategory, setShowAddSubcategory] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  if (!isOpen) return null;

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subcategory_id) {
      alert('Please select a subcategory');
      return;
    }

    const result = await createTag(formData);
    if (result.success) {
      // Reset form
      setFormData({
        category_id: defaultCategoryId || categories[0]?.id || 1,
        subcategory_id: '',
        name: '',
        description: '',
        color: COLLECTION_COLORS[11],
      });
      alert('Tag created successfully!');
    }
  };

  const handleCreateSubcategory = async (categoryId: number) => {
    if (!newSubcategoryName.trim()) return;

    const result = await createSubcategory({
      category_id: categoryId,
      name: newSubcategoryName.trim(),
      content_type: 'Both',
    });

    if (result.success) {
      setNewSubcategoryName('');
      setShowAddSubcategory(null);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, name: string) => {
    if (window.confirm(`Delete subcategory "${name}"? This will fail if any tags use it.`)) {
      await deleteSubcategory(subcategoryId);
    }
  };

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getSubcategoriesForCategory = (categoryId: number) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const availableSubcategories = subcategories.filter(
    sub => sub.category_id === formData.category_id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Manage Tags</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('create')}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${activeSection === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              Create Tag
            </button>
            <button
              onClick={() => setActiveSection('import')}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${activeSection === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              Import/Export
            </button>
            <button
              onClick={() => setActiveSection('subcategories')}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${activeSection === 'subcategories'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              Manage Subcategories
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Section 1: Create Tag */}
          {activeSection === 'create' && (
            <form onSubmit={handleCreateTag} className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({
                    ...formData,
                    category_id: parseInt(e.target.value),
                    subcategory_id: '', // Reset subcategory
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subcategory *
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a subcategory...</option>
                  {availableSubcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.is_custom && '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tag Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Action-Packed, Must Watch, Director's Cut"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a description to help you remember what this tag is for..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

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
                      className={`w-10 h-10 rounded-full transition-all ${
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

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Create Tag
              </button>
            </form>
          )}

          {/* Section 2: Import/Export */}
          {activeSection === 'import' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Premium Feature</h3>
                <p className="text-sm text-yellow-800">
                  Bulk tag import and export is available for Pro, Plus, and Enterprise users.
                  Upgrade your plan to unlock this feature.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
                >
                  <Download className="h-5 w-5" />
                  <span className="font-medium">Download Template</span>
                </button>

                <button
                  disabled
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
                >
                  <Download className="h-5 w-5" />
                  <span className="font-medium">Export My Tags</span>
                </button>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-2">Import Tags (Premium)</p>
                  <p className="text-sm text-slate-500">
                    Drag and drop or click to upload
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Subcategory Management */}
          {activeSection === 'subcategories' && (
            <div className="space-y-4">
              {categories.map((category) => {
                const categorySubcategories = getSubcategoriesForCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <div key={category.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <h3 className="font-semibold text-slate-900">{category.name}</h3>
                          <p className="text-sm text-slate-600">
                            {categorySubcategories.length} subcategories
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddSubcategory(category.id);
                          }}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Add subcategory"
                        >
                          <Plus className="h-5 w-5 text-blue-600" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-600" />
                        )}
                      </div>
                    </div>

                    {/* Subcategories List */}
                    {isExpanded && (
                      <div className="p-4 space-y-2">
                        {/* Add Subcategory Form */}
                        {showAddSubcategory === category.id && (
                          <div className="flex gap-2 mb-3 p-3 bg-blue-50 rounded-lg">
                            <input
                              type="text"
                              value={newSubcategoryName}
                              onChange={(e) => setNewSubcategoryName(e.target.value)}
                              placeholder="New subcategory name (max 20 chars)"
                              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              maxLength={20}
                            />
                            <button
                              onClick={() => handleCreateSubcategory(category.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowAddSubcategory(null);
                                setNewSubcategoryName('');
                              }}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Subcategory Rows */}
                        {categorySubcategories.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">
                            No subcategories yet. Click + to add one.
                          </p>
                        ) : (
                          categorySubcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all group"
                            >
                              <div className="flex-1">
                                <span className="font-medium text-slate-900">{sub.name}</span>
                                {sub.is_custom && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    Custom
                                  </span>
                                )}
                                <span className="ml-2 text-sm text-slate-500">
                                  ({sub.usage_count} tags)
                                </span>
                              </div>

                              {sub.is_custom && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete subcategory"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};