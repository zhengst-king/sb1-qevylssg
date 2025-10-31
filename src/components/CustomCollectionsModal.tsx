// src/components/CustomCollectionsModal.tsx
// Modal for creating and managing custom collections

import React, { useState } from 'react';
import { X, Plus, Folder, Edit2, Trash2, Star, Copy, Check } from 'lucide-react';
import { useCustomCollections } from '../hooks/useCustomCollections';
import type { CustomCollection } from '../types/customCollections';
import { COLLECTION_COLORS, COLLECTION_ICONS } from '../types/customCollections';
import { Shuffle } from 'lucide-react';
import { COLLECTION_ICONS, COLLECTION_COLORS, getRandomColor, getIconComponent } from '../utils/collectionHelpers';

interface CustomCollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCollection?: (collection: CustomCollection) => void;
}

export const CustomCollectionsModal: React.FC<CustomCollectionsModalProps> = ({
  isOpen,
  onClose,
  onSelectCollection,
}) => {
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    toggleFavorite,
    loading,
  } = useCustomCollections();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: getRandomColor(),
    icon: 'folder',
    privacy: 'private' as 'private' | 'public',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateCollection(editingId, formData);
        setEditingId(null);
      } else {
        await createCollection(formData);
        setShowCreateForm(false);
      }
      
      setFormData({
        name: '',
        description: '',
        color: COLLECTION_COLORS[0],
        icon: COLLECTION_ICONS[0],
      });
    } catch (error) {
      console.error('Error saving collection:', error);
    }
  };

  const handleEdit = (collection: CustomCollection) => {
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color,
      icon: collection.icon,
    });
    setEditingId(collection.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this collection? Items will not be deleted.')) {
      try {
        await deleteCollection(id);
      } catch (error) {
        console.error('Error deleting collection:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      color: COLLECTION_COLORS[0],
      icon: COLLECTION_ICONS[0],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Custom Collections</h2>
            <p className="text-sm text-slate-600 mt-1">
              Organize your items into themed collections
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and Privacy Row */}
              <div className="grid grid-cols-3 gap-4">
                {/* Collection Name - 2 columns */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Marvel Cinematic Universe"
                    required
                  />
                </div>

                {/* Privacy - 1 column */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Privacy
                  </label>
                  <select
                    value={formData.privacy}
                    onChange={(e) => setFormData({ ...formData, privacy: e.target.value as 'private' | 'public' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              {/* Color Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Color
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, color: getRandomColor() })}
                    className="inline-flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span>Random</span>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-purple-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {COLLECTION_ICONS.map((iconOption) => {
                    const IconComponent = iconOption.icon;
                    return (
                      <button
                        key={iconOption.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconOption.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.icon === iconOption.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        title={iconOption.label}
                      >
                        <IconComponent 
                          className="h-5 w-5 text-slate-700" 
                          style={{ color: formData.icon === iconOption.value ? formData.color : undefined }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Create Collection
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Collection</span>
            </button>
          )}

          {/* Collections List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 mt-2">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                No collections yet
              </h3>
              <p className="text-slate-500">
                Create your first custom collection to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => onSelectCollection?.(collection)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${collection.color}20` }}
                      >
                        <Folder
                          className="h-5 w-5"
                          style={{ color: collection.color }}
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{collection.name}</h4>
                        <p className="text-sm text-slate-600">
                          {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(collection.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        collection.is_favorite
                          ? 'text-yellow-500'
                          : 'text-slate-300 hover:text-yellow-500'
                      }`}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={collection.is_favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  {collection.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {collection.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(collection);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium text-slate-700 flex items-center justify-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(collection.id);
                      }}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors text-sm font-medium text-red-700 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600 text-center">
            Collections help you organize items across different themes and categories
          </p>
        </div>
      </div>
    </div>
  );
};