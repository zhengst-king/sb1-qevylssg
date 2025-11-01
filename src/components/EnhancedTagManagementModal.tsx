// src/components/EnhancedTagManagementModal.tsx
// Complete tag management modal with 3 sections

import React, { useState } from 'react';
import { X, Plus, Upload, Download, FileText, ChevronDown, ChevronUp, Trash2, Tag as TagIcon } from 'lucide-react';
import { TAG_CATEGORIES, getCategoryById } from '../data/taggingCategories';
import { useTags } from '../hooks/useTags';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { COLLECTION_COLORS } from '../types/customCollections';

interface EnhancedTagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategoryId?: number;
}

export const EnhancedTagManagementModal: React.FC<EnhancedTagManagementModalProps> = ({
  isOpen,
  onClose,
  defaultCategoryId,
}) => {
  const { createTag, loading } = useTags();
  const { 
    subcategories, 
    createSubcategory, 
    makeSuggestedVisible,
    deleteSubcategory, 
    getVisibleSubcategories,
    getSuggestedSubcategories,
    loading: subcategoriesLoading 
  } = useTagSubcategories();

  const [activeSection, setActiveSection] = useState<'create' | 'import' | 'subcategories'>('create');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Create Tag Form State
  const [formData, setFormData] = useState({
    category_id: defaultCategoryId || 1,
    subcategory_id: '',
    name: '',
    description: '',
    color: COLLECTION_COLORS[11], // Default blue
  });

  const [showAddSubcategory, setShowAddSubcategory] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showAddSubcategoryPopup, setShowAddSubcategoryPopup] = useState(false);
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');

  if (!isOpen) return null;

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subcategory_id) {
      alert('Please select a subcategory');
      return;
    }

    // Validate subcategory exists
    const selectedSubcategory = subcategories.find(s => s.id === formData.subcategory_id);
    if (!selectedSubcategory) {
      console.error('Selected subcategory not found in subcategories list');
      console.error('Selected ID:', formData.subcategory_id);
      console.error('Available subcategories:', subcategories);
      alert('Invalid subcategory selected. Please try again.');
      return;
    }

    console.log('Creating tag with data:', {
      category_id: formData.category_id,
      subcategory_id: formData.subcategory_id,
      subcategory_details: selectedSubcategory,
      name: formData.name,
      description: formData.description,
      color: formData.color,
    });

    try {
      const result = await createTag({
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        name: formData.name,
        description: formData.description,
        color: formData.color,
      });

      console.log('CreateTag result:', result);

      // Handle both old (throws error) and new (returns result object) patterns
      if (result && typeof result === 'object' && 'success' in result) {
        // New pattern: returns { success, data, error }
        if (result.success) {
          // Reset form
          setFormData({
            category_id: defaultCategoryId || 1,
            subcategory_id: '',
            name: '',
            description: '',
            color: COLLECTION_COLORS[11],
          });
          alert('Tag created successfully!');
        } else {
          console.error('Tag creation failed:', result.error);
          alert(`Error: ${result.error || 'Failed to create tag'}`);
        }
      } else {
        // Old pattern: returns Tag object directly
        // Reset form
        setFormData({
          category_id: defaultCategoryId || 1,
          subcategory_id: '',
          name: '',
          description: '',
          color: COLLECTION_COLORS[11],
        });
        alert('Tag created successfully!');
      }
    } catch (error) {
      // Old pattern: throws error
      console.error('Error creating tag (caught):', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        formData: formData,
      });
      alert(`Error: ${(error as Error).message || 'Failed to create tag'}`);
    }
  };

  const handleSubcategoryChange = (value: string) => {
    if (value === '__add_new__') {
      setShowAddSubcategoryPopup(true);
      setNewSubcategoryInput('');
    } else {
      setFormData({ ...formData, subcategory_id: value });
    }
  };

  const handleCreateOrSelectSubcategory = async (subcategoryId?: string, isNew?: boolean) => {
    if (subcategoryId) {
      // User selected from suggested subcategories
      const result = await makeSuggestedVisible(subcategoryId);
      if (result.success && result.data) {
        setFormData({ ...formData, subcategory_id: result.data.id });
        setShowAddSubcategoryPopup(false);
        setNewSubcategoryInput('');
      } else {
        alert(`Error: ${result.error || 'Failed to make subcategory visible'}`);
      }
    } else if (isNew && newSubcategoryInput.trim()) {
      // User created a new custom subcategory
      const result = await createSubcategory({
        category_id: formData.category_id,
        name: newSubcategoryInput.trim(),
        is_custom: true,
      });
      
      if (result.success && result.data) {
        setFormData({ ...formData, subcategory_id: result.data.id });
        setShowAddSubcategoryPopup(false);
        setNewSubcategoryInput('');
      } else {
        alert(`Error: ${result.error || 'Failed to create subcategory'}`);
      }
    }
  };

  const handleCreateSubcategory = async (categoryId: number) => {
    if (!newSubcategoryName.trim()) return;

    const result = await createSubcategory({
      category_id: categoryId,
      name: newSubcategoryName.trim(),
      is_custom: true,
    });

    if (result.success) {
      setNewSubcategoryName('');
      setShowAddSubcategory(null);
      alert('Subcategory created successfully!');
    } else {
      alert(`Error: ${result.error || 'Failed to create subcategory'}`);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, name: string) => {
    if (window.confirm(`Delete subcategory "${name}"? This will fail if any tags use it.`)) {
      const result = await deleteSubcategory(subcategoryId);
      if (!result.success) {
        alert(`Error: ${result.error || 'Failed to delete subcategory'}`);
      }
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
    // Use the subcategories from the hook, not the static data file
    if (!subcategories || !Array.isArray(subcategories)) return [];
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  const selectedCategory = getCategoryById(formData.category_id);
  const visibleSubs = getVisibleSubcategories(formData.category_id);
  const suggestedSubs = getSuggestedSubcategories(formData.category_id);

  return (
    <>
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
            {/* SECTION 1: CREATE NEW TAG */}
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
                      subcategory_id: '' // Reset subcategory when category changes
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {TAG_CATEGORIES.map(cat => (
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
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a subcategory...</option>
                    
                    {/* Visible Subcategories (no label) */}
                    {visibleSubs.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                    
                    {/* Add SubCategory Option */}
                    <option value="__add_new__">+ Add SubCategory</option>
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
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.name.length}/100 characters
                  </p>
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
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.description.length}/500 characters
                  </p>
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
                            ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
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
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Tag'}
                </button>
              </form>
            )}

            {/* SECTION 2: IMPORT/EXPORT */}
            {activeSection === 'import' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      Premium Feature
                    </h3>
                    <p className="text-slate-600">
                      Bulk import and export your tags with spreadsheet templates
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Download className="h-5 w-5 text-slate-600" />
                        <h4 className="font-semibold text-slate-900">Download Template</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Get a pre-formatted spreadsheet with all categories and subcategories
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <h4 className="font-semibold text-slate-900">Export Your Tags</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Download all your tags as a spreadsheet for backup or sharing
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Upload className="h-5 w-5 text-slate-600" />
                        <h4 className="font-semibold text-slate-900">Import Tags</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Upload a completed template to create multiple tags at once
                      </p>
                    </div>
                  </div>

                  <button
                    className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
                    onClick={() => alert('Upgrade to Premium to unlock this feature!')}
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 3: SUBCATEGORY MANAGEMENT */}
            {activeSection === 'subcategories' && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                  <p className="text-sm text-blue-900">
                    <strong>Manage Subcategories:</strong> Create custom subcategories for better tag organization. 
                    Visible subcategories appear by default, while suggested ones can be added as needed.
                  </p>
                </div>

                {subcategoriesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-slate-500 mt-4">Loading subcategories...</p>
                  </div>
                ) : !subcategories || !Array.isArray(subcategories) ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Error loading subcategories. Please try again.</p>
                  </div>
                ) : (
                  /* 9 Category Tables */
                  TAG_CATEGORIES.map((category) => {
                  const categorySubs = getSubcategoriesForCategory(category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  const visibleCount = categorySubs.filter(s => s.is_visible).length;
                  const suggestedCount = categorySubs.filter(s => s.is_suggested).length;
                  const customCount = categorySubs.filter(s => s.is_custom).length;

                  return (
                    <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div className="text-left">
                            <h3 className="font-bold text-slate-900">{category.name}</h3>
                            <p className="text-sm text-slate-600">
                              {visibleCount} visible • {suggestedCount} suggested • {customCount} custom
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-600" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-6 pb-4 border-t border-slate-200">
                          {/* Add Subcategory Button */}
                          <div className="py-4">
                            {showAddSubcategory === category.id ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newSubcategoryName}
                                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                                  placeholder="New subcategory name..."
                                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  maxLength={50}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleCreateSubcategory(category.id)}
                                  disabled={!newSubcategoryName.trim()}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAddSubcategory(null);
                                    setNewSubcategoryName('');
                                  }}
                                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAddSubcategory(category.id)}
                                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add Custom Subcategory</span>
                              </button>
                            )}
                          </div>

                          {/* Subcategories List */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {categorySubs.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">
                                No subcategories yet. Add your first one above.
                              </p>
                            ) : (
                              categorySubs.map((sub) => (
                                <div
                                  key={sub.id}
                                  className={`
                                    flex items-center justify-between px-4 py-2 rounded-lg border
                                    ${sub.is_visible 
                                      ? 'bg-green-50 border-green-200' 
                                      : sub.is_suggested 
                                        ? 'bg-orange-50 border-orange-200'
                                        : 'bg-blue-50 border-blue-200'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-900">
                                      {sub.name}
                                    </span>
                                    <span className={`
                                      text-xs px-2 py-0.5 rounded-full
                                      ${sub.is_visible 
                                        ? 'bg-green-100 text-green-700' 
                                        : sub.is_suggested 
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }
                                    `}>
                                      {sub.is_visible ? 'Visible' : sub.is_suggested ? 'Suggested' : 'Custom'}
                                    </span>
                                    {sub.usage_count > 0 && (
                                      <span className="text-xs text-slate-500">
                                        {sub.usage_count} {sub.usage_count === 1 ? 'tag' : 'tags'}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {sub.is_custom && (
                                    <button
                                      onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                      title="Delete subcategory"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Subcategory Popup */}
      {showAddSubcategoryPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Subcategory</h3>
              <button
                onClick={() => {
                  setShowAddSubcategoryPopup(false);
                  setNewSubcategoryInput('');
                }}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newSubcategoryInput}
                  onChange={(e) => setNewSubcategoryInput(e.target.value)}
                  placeholder="Enter subcategory name..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <button
                onClick={() => handleCreateOrSelectSubcategory(undefined, true)}
                disabled={!newSubcategoryInput.trim() || subcategoriesLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subcategoriesLoading ? 'Creating...' : 'OK'}
              </button>

              {/* Suggested Subcategories */}
              {suggestedSubs.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Or select from suggested:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {suggestedSubs.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleCreateOrSelectSubcategory(sub.id)}
                        className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};