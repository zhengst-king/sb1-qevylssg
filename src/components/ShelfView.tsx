// src/components/ShelfView.tsx
import React, { useState, useEffect } from 'react';
import { Package, ArrowLeft } from 'lucide-react';
import { useMediaLibraryShelves } from '../hooks/useMediaLibraryShelves';
import { MediaLibraryItemCard } from './MediaLibraryItemCard';
import type { Shelf, MediaLibraryItem } from '../lib/supabase';

interface ShelfViewProps {
  shelf: Shelf;
  onBack: () => void;
  onItemUpdate?: () => void;
}

export function ShelfView({ shelf, onBack, onItemUpdate }: ShelfViewProps) {
  const { getShelfItems, removeItemFromShelf } = useMediaLibraryShelves();
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShelfItems();
  }, [shelf.id]);

  const loadShelfItems = async () => {
    setLoading(true);
    try {
      const shelfItems = await getShelfItems(shelf.id);
      setItems(shelfItems);
    } catch (error) {
      console.error('Error loading shelf items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromShelf = async (itemId: string) => {
    if (!confirm('Remove this item from the shelf?')) return;

    try {
      await removeItemFromShelf(shelf.id, itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      onItemUpdate?.();
    } catch (error) {
      console.error('Error removing from shelf:', error);
      alert('Failed to remove item from shelf');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Library</span>
        </button>

        {/* Shelf Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">{shelf.name}</h1>
          </div>
          {shelf.description && (
            <p className="text-slate-600 mt-2">{shelf.description}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">
            {items.length} {items.length === 1 ? 'item' : 'items'} in this shelf
          </p>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">
              This shelf is empty
            </h3>
            <p className="text-slate-500">
              Add items to this shelf from your library
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <MediaLibraryItemCard
                key={item.id}
                item={item}
                onRemove={() => handleRemoveFromShelf(item.id)}
                onUpdate={loadShelfItems}
                showCollectionType={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}