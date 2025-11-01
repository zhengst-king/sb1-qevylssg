// src/components/EnhancedTagManagementModal.tsx
// Complete tag management modal with 3 sections

import React, { useState, useEffect } from 'react';
import { X, Plus, Upload, Download, FileText, ChevronDown, ChevronUp, Trash2, Tag as TagIcon } from 'lucide-react';
import { TAG_CATEGORIES, getCategoryById } from '../data/taggingCategories';
import { useTags } from '../hooks/useTags';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { COLLECTION_COLORS } from '../types/customCollections';

interface EnhancedTagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategoryId?: number;
  onTagCreated?: () => void; // Callback to notify parent when tag is created
}

export const EnhancedTagManagementModal: React.FC<EnhancedTagManagementModalProps> = ({
  isOpen,
  onClose,
  defaultCategoryId,
  onTagCreated,
}) => {
  const { createTag, loading, refetch: refetchTags } = useTags();
  const { 
    subcategories, 
    createSubcategory, 
    makeSuggestedVisible,
    deleteSubcategory, 
    getVisibleSubcategories,
    getSuggestedSubcategories,
    loading: subcategoriesLoading,
    refetch: refetchSubcategories
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

  // Handle Esc key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showAddSubcategoryPopup) {
          // Close popup first if it's open
          setShowAddSubcategoryPopup(false);
          setNewSubcategoryInput('');
        } else {
          // Close main modal
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, showAddSubcategoryPopup, onClose]);

  // Refetch subcategories and tags when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Refetch when modal is closed to ensure parent components see updates
      refetchSubcategories();
      refetchTags();
    }
  }, [isOpen, refetchSubcategories, refetchTags]);

  if (!isOpen) return null;

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subcategory_id) {
      alert('Please select a subcategory');
      return;
    }

    console.log('Creating tag with data:', {
      category_id: formData.category_id,
      subcategory_id: formData.subcategory_id,
      subcategory_type: typeof formData.subcategory_id,
      name: formData.name,
      description: formData.description,
      color: formData.color,
    });

    console.log('Available subcategories:', subcategories);
    console.log('Subcategories count:', subcategories?.length);

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
          // Immediately refetch tags to update parent components
          await refetchTags();
          
          // Notify parent component that a tag was created
          if (onTagCreated) {
            onTagCreated();
          }
          
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
        // Immediately refetch tags to update parent components
        await refetchTags();
        
        // Notify parent component that a tag was created
        if (onTagCreated) {
          onTagCreated();
        }
        
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
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          // Close modal when clicking the backdrop (not the modal content)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
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
                    const visibleSubs = categorySubs.filter(s => s.is_visible);
                    const suggestedSubs = categorySubs.filter(s => s.is_suggested);
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
                                {visibleSubs.length} visible • {suggestedSubs.length} suggested • {customCount} custom
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Add Custom Subcategory Button */}
                            {isExpanded && (
                              showAddSubcategory === category.id ? (
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={newSubcategoryName}
                                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                                    placeholder="New subcategory..."
                                    className="px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    maxLength={50}
                                    autoFocus
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateSubcategory(category.id);
                                    }}
                                    disabled={!newSubcategoryName.trim()}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowAddSubcategory(null);
                                      setNewSubcategoryName('');
                                    }}
                                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddSubcategory(category.id);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm"
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Add Custom</span>
                                </button>
                              )
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-slate-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-600" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Content - Two Column Layout */}
                        {isExpanded && (
                          <div className="px-6 pb-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-6 py-4">
                              {/* LEFT COLUMN - Visible Subcategories */}
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-3">Visible</h4>
                                <div 
                                  className="grid grid-cols-3 gap-2 min-h-[100px] p-3 bg-green-50 rounded-lg border-2 border-dashed border-green-300"
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('bg-green-100');
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('bg-green-100');
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('bg-green-100');
                                    const subcategoryId = e.dataTransfer.getData('subcategoryId');
                                    const fromVisible = e.dataTransfer.getData('fromVisible') === 'true';
                                    
                                    if (!fromVisible && subcategoryId) {
                                      // Moving from suggested to visible
                                      makeSuggestedVisible(subcategoryId);
                                    }
                                  }}
                                >
                                  {visibleSubs.length === 0 ? (
                                    <p className="col-span-3 text-xs text-slate-500 text-center py-4">
                                      Drag items here
                                    </p>
                                  ) : (
                                    visibleSubs.map((sub) => (
                                      <div
                                        key={sub.id}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('subcategoryId', sub.id);
                                          e.dataTransfer.setData('fromVisible', 'true');
                                        }}
                                        className="px-2 py-1.5 bg-white border border-green-300 rounded text-xs font-medium text-slate-900 cursor-move hover:shadow-md transition-shadow flex items-center justify-between"
                                        title={sub.name}
                                      >
                                        <span className="truncate">{sub.name}</span>
                                        {sub.is_custom && (
                                          <button
                                            onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                                            className="ml-1 text-red-600 hover:text-red-800"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* RIGHT COLUMN - Suggested Subcategories */}
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-3">Suggested</h4>
                                <div 
                                  className="grid grid-cols-3 gap-2 min-h-[100px] p-3 bg-orange-50 rounded-lg border-2 border-dashed border-orange-300"
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('bg-orange-100');
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('bg-orange-100');
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('bg-orange-100');
                                    // Suggested column is view-only for now
                                    // Could implement "hide" functionality here if needed
                                  }}
                                >
                                  {suggestedSubs.length === 0 ? (
                                    <p className="col-span-3 text-xs text-slate-500 text-center py-4">
                                      No suggestions
                                    </p>
                                  ) : (
                                    suggestedSubs.map((sub) => (
                                      <div
                                        key={sub.id}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('subcategoryId', sub.id);
                                          e.dataTransfer.setData('fromVisible', 'false');
                                        }}
                                        className="px-2 py-1.5 bg-white border border-orange-300 rounded text-xs font-medium text-slate-900 cursor-move hover:shadow-md transition-shadow truncate"
                                        title={sub.name}
                                      >
                                        {sub.name}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            // Close popup when clicking the backdrop
            if (e.target === e.currentTarget) {
              setShowAddSubcategoryPopup(false);
              setNewSubcategoryInput('');
            }
          }}
        >
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