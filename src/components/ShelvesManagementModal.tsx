// src/components/ShelvesManagementModal.tsx
import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, GripVertical, Package } from 'lucide-react';
import { useMediaLibraryShelves } from '../hooks/useMediaLibraryShelves';
import type { Shelf } from '../lib/supabase';

interface ShelvesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShelvesManagementModal({ isOpen, onClose }: ShelvesManagementModalProps) {
  const { shelves, loading, createShelf, updateShelf, deleteShelf } = useMediaLibraryShelves();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a shelf name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingShelf) {
        await updateShelf(editingShelf.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      } else {
        await createShelf({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          sort_order: shelves.length
        });
      }
      
      // Reset form
      setFormData({ name: '', description: '' });
      setIsCreating(false);
      setEditingShelf(null);
    } catch (error) {
      console.error('Error saving shelf:', error);
      alert(error instanceof Error ? error.message : 'Failed to save shelf');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (shelf: Shelf) => {
    setEditingShelf(shelf);
    setFormData({
      name: shelf.name,
      description: shelf.description || ''
    });
    setIsCreating(true);
  };

  const handleDelete = async (shelf: Shelf) => {
    if (!confirm(`Delete shelf "${shelf.name}"? Items will not be deleted, only removed from this shelf.`)) {
      return;
    }

    try {
      await deleteShelf(shelf.id);
    } catch (error) {
      console.error('Error deleting shelf:', error);
      alert('Failed to delete shelf');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setIsCreating(false);
    setEditingShelf(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">Manage Shelves</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Create/Edit Form */}
          {isCreating ? (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editingShelf ? 'Edit Shelf' : 'Create New Shelf'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Shelf Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., 4K HDR Demos, Christmas Movies"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this shelf is for..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={submitting || !formData.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Saving...' : editingShelf ? 'Update Shelf' : 'Create Shelf'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mb-6 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Shelf</span>
            </button>
          )}

          {/* Shelves List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading shelves...</p>
            </div>
          ) : shelves.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No shelves yet</p>
              <p className="text-sm text-slate-500">Create your first shelf to organize your library</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shelves.map((shelf) => (
                <div
                  key={shelf.id}
                  className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <GripVertical className="h-5 w-5 text-slate-400 mt-1 cursor-move" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{shelf.name}</h4>
                        {shelf.description && (
                          <p className="text-sm text-slate-600 mt-1">{shelf.description}</p>
                        )}
                        <p className="text-sm text-slate-500 mt-2">
                          {shelf.item_count} {shelf.item_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(shelf)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit shelf"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shelf)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete shelf"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}