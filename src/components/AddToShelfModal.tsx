// src/components/AddToShelfModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Package, Check } from 'lucide-react';
import { useMediaLibraryShelves } from '../hooks/useMediaLibraryShelves';
import type { MediaLibraryItem } from '../lib/supabase';

interface AddToShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaLibraryItem;
  onSuccess?: () => void;
}

export function AddToShelfModal({ isOpen, onClose, item, onSuccess }: AddToShelfModalProps) {
  const { shelves, loading, addItemToMultipleShelves, getItemShelves } = useMediaLibraryShelves();
  
  const [selectedShelves, setSelectedShelves] = useState<Set<string>>(new Set());
  const [existingShelves, setExistingShelves] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Load existing shelves for this item
  useEffect(() => {
    if (isOpen && item) {
      loadExistingShelves();
    }
  }, [isOpen, item]);

  const loadExistingShelves = async () => {
    try {
      const itemShelves = await getItemShelves(item.id);
      const existingIds = new Set(itemShelves.map(s => s.id));
      setExistingShelves(existingIds);
      setSelectedShelves(new Set(existingIds));
    } catch (error) {
      console.error('Error loading existing shelves:', error);
    }
  };

  const toggleShelf = (shelfId: string) => {
    setSelectedShelves(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shelfId)) {
        newSet.delete(shelfId);
      } else {
        newSet.add(shelfId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      // Determine which shelves to add to (not already in)
      const shelvesToAdd = Array.from(selectedShelves).filter(
        id => !existingShelves.has(id)
      );

      if (shelvesToAdd.length > 0) {
        await addItemToMultipleShelves(shelvesToAdd, item.id);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding to shelves:', error);
      alert(error instanceof Error ? error.message : 'Failed to add to shelves');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasChanges = Array.from(selectedShelves).some(id => !existingShelves.has(id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Add to Shelves</h2>
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
          
          {/* Item Info */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex items-start space-x-3">
              {item.poster_url && (
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-16 h-24 object-cover rounded"
                />
              )}
              <div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                {item.year && <p className="text-sm text-slate-600">{item.year}</p>}
                <p className="text-sm text-slate-500 mt-1">{item.format}</p>
              </div>
            </div>
          </div>

          {/* Shelves List */}
          <form onSubmit={handleSubmit}>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-2">Loading shelves...</p>
              </div>
            ) : shelves.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">No shelves yet</p>
                <p className="text-sm text-slate-500">Create shelves to organize your library</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shelves.map((shelf) => {
                  const isSelected = selectedShelves.has(shelf.id);
                  const isExisting = existingShelves.has(shelf.id);
                  
                  return (
                    <label
                      key={shelf.id}
                      className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleShelf(shelf.id)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{shelf.name}</span>
                          {isExisting && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Already added
                            </span>
                          )}
                        </div>
                        {shelf.description && (
                          <p className="text-sm text-slate-600 mt-1">{shelf.description}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {shelf.item_count} {shelf.item_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center space-x-3">
              <button
                type="submit"
                disabled={submitting || !hasChanges || shelves.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Add to Selected</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}