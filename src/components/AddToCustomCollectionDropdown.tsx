// src/components/AddToCustomCollectionDropdown.tsx
// Dropdown for adding/removing items from custom collections

import React, { useState, useRef, useEffect } from 'react';
import { Check, Folder, Plus } from 'lucide-react';
import { useCustomCollections } from '../hooks/useCustomCollections';
import { customCollectionsService } from '../services/customCollectionsService';

interface AddToCustomCollectionDropdownProps {
  collectionItemId: string;
  onClose?: () => void;
  onCollectionsChange?: () => void;
}

export const AddToCustomCollectionDropdown: React.FC<AddToCustomCollectionDropdownProps> = ({
  collectionItemId,
  onClose,
  onCollectionsChange,
}) => {
  const { collections, addItemToCollection, removeItemFromCollection } = useCustomCollections();
  const [itemCollections, setItemCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load collections for this item
  useEffect(() => {
    const loadItemCollections = async () => {
      try {
        setLoading(true);
        const collections = await customCollectionsService.getCollectionsForItem(collectionItemId);
        setItemCollections(new Set(collections.map(c => c.id)));
      } catch (error) {
        console.error('Error loading item collections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadItemCollections();
  }, [collectionItemId]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggleCollection = async (collectionId: string, isInCollection: boolean) => {
    try {
      if (isInCollection) {
        await removeItemFromCollection(collectionItemId, collectionId);
        setItemCollections(prev => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await addItemToCollection(collectionItemId, collectionId);
        setItemCollections(prev => new Set(prev).add(collectionId));
      }
      onCollectionsChange?.();
    } catch (error) {
      console.error('Error toggling collection:', error);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      // This will be implemented with the create collection modal
      // For now, just close the form
      setShowCreateForm(false);
      setNewCollectionName('');
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  if (loading) {
    return (
      <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-50">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-200">
        <h4 className="font-semibold text-slate-900 text-sm">Add to Collections</h4>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto p-2">
        {collections.length === 0 ? (
          <div className="text-center py-6 px-3">
            <Folder className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">No custom collections yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first collection
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {collections.map((collection) => {
              const isInCollection = itemCollections.has(collection.id);
              
              return (
                <button
                  key={collection.id}
                  onClick={() => handleToggleCollection(collection.id, isInCollection)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${collection.color}20` }}
                  >
                    <Folder className="h-4 w-4" style={{ color: collection.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {collection.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  
                  {isInCollection && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create New Collection Form */}
      {showCreateForm ? (
        <form onSubmit={handleCreateAndAdd} className="p-3 border-t border-slate-200 bg-slate-50">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="New collection name..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create & Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewCollectionName('');
              }}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full p-3 border-t border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-blue-600"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Collection</span>
        </button>
      )}
    </div>
  );
};