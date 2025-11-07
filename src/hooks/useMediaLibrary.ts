// src/hooks/useMediaLibrary.ts - NEW HOOK WITH MEDIA LIBRARY TERMINOLOGY
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';

// Type alias for semantic clarity
export type MediaLibraryItem = PhysicalMediaCollection;
export type ItemStatus = CollectionType;

// Enhanced interface for library filtering
interface UseMediaLibraryOptions {
  itemStatus?: ItemStatus | 'all';
  includeAll?: boolean;
}

// Library statistics interface
interface MediaLibraryStats {
  owned: number;
  wishlist: number;
  for_sale: number;
  loaned_out: number;
  missing: number;
  total: number;
}

export function useMediaLibrary(options: UseMediaLibraryOptions = {}) {
  const { user } = useAuth();
  const [libraryItems, setLibraryItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { itemStatus = 'all', includeAll = false } = options;

  // Fetch library items from the database with optional filtering
  const fetchLibraryItems = async () => {
    if (!user) {
      setLibraryItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query with optional collection_type filter (database field name unchanged)
      let query = supabase
        .from('physical_media_collections')
        .select(`
          *,
          bluray_technical_specs:technical_specs_id(*)
        `)
        .eq('user_id', user.id);

      // Add collection_type filter if specified
      if (itemStatus !== 'all') {
        query = query.eq('collection_type', itemStatus);
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Ensure collection_type defaults to 'owned' for existing items
      const processedData = (data || []).map(item => ({
        ...item,
        collection_type: item.collection_type || 'owned'
      }));

      setLibraryItems(processedData);
      console.log('[useMediaLibrary] Loaded', processedData?.length || 0, 'items', 
                  itemStatus !== 'all' ? `(status: ${itemStatus})` : '(all statuses)');
    } catch (err) {
      console.error('Error fetching library items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch library items');
    } finally {
      setLoading(false);
    }
  };

  // Add item to library
  const addToLibrary = async (
    itemData: Omit<MediaLibraryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('physical_media_collections')
        .insert([{ 
          ...itemData, 
          user_id: user.id,
          collection_type: itemData.collection_type || 'owned' // Default to 'owned'
        }])
        .select()
        .single();

      if (error) throw error;

      // Only add to local state if it matches the current filter
      if (itemStatus === 'all' || data.collection_type === itemStatus) {
        setLibraryItems(prev => [data, ...prev]);
      }

      console.log('[useMediaLibrary] Added item:', data.title, 'status:', data.collection_type);
      return data;
    } catch (error) {
      console.error('[useMediaLibrary] Add error:', error);
      throw error;
    }
  };

  // Update library item
  const updateLibraryItem = async (
    id: string, 
    updates: Partial<MediaLibraryItem>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('physical_media_collections')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setLibraryItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...data } : item
      ));

      console.log('[useMediaLibrary] Updated item:', data.title, 'changes:', Object.keys(updates));
      return data;
    } catch (error) {
      console.error('[useMediaLibrary] Update error:', error);
      throw error;
    }
  };

  // Remove from library
  const removeFromLibrary = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('physical_media_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setLibraryItems(prev => prev.filter(item => item.id !== id));
      console.log('[useMediaLibrary] Removed item:', id);
    } catch (error) {
      console.error('[useMediaLibrary] Remove error:', error);
      throw error;
    }
  };

  // Move item between statuses (e.g., wishlist to owned)
  const moveItemStatus = async (id: string, newStatus: ItemStatus) => {
    try {
      const updatedItem = await updateLibraryItem(id, { collection_type: newStatus });
      
      // If we're filtering by status and the item no longer matches, remove it from local state
      if (itemStatus !== 'all' && newStatus !== itemStatus) {
        setLibraryItems(prev => prev.filter(item => item.id !== id));
      }
      
      console.log('[useMediaLibrary] Moved item to status:', newStatus);
      return updatedItem;
    } catch (error) {
      console.error('[useMediaLibrary] Move to status error:', error);
      throw error;
    }
  };

  // Bulk update multiple items
  const bulkUpdateLibraryItems = async (
    itemIds: string[],
    updates: Partial<MediaLibraryItem>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updatePromises = itemIds.map(id => updateLibraryItem(id, updates));
      const results = await Promise.all(updatePromises);
      
      console.log('[useMediaLibrary] Bulk updated', results.length, 'items');
      return results;
    } catch (error) {
      console.error('[useMediaLibrary] Bulk update error:', error);
      throw error;
    }
  };

  // Get all library items (ignoring current filter) for statistics
  const getAllLibraryItems = async (): Promise<MediaLibraryItem[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('physical_media_collections')
        .select(`
          *,
          bluray_technical_specs:technical_specs_id(*)
        `)
        .eq('user_id', user.id)
        .order('title', { ascending: true }); // Sort by title for CSV exports

      if (error) throw error;

      // Ensure collection_type defaults to 'owned' for existing items
      return (data || []).map(item => ({
        ...item,
        collection_type: item.collection_type || 'owned'
      }));
    } catch (error) {
      console.error('[useMediaLibrary] Get all library items error:', error);
      return [];
    }
  };

  // Get library statistics by status
  const getLibraryStats = (): MediaLibraryStats => {
    // For accurate stats, we need to consider all items, not just filtered ones
    // This is a limitation - in a real app, you'd want to fetch stats separately
    // or maintain a separate state for all items
    
    const stats: MediaLibraryStats = {
      owned: 0,
      wishlist: 0,
      for_sale: 0,
      loaned_out: 0,
      missing: 0,
      total: 0
    };

    // If we're viewing all items, we can calculate accurate stats
    if (itemStatus === 'all') {
      libraryItems.forEach(item => {
        const status = (item.collection_type || 'owned') as ItemStatus;
        stats[status]++;
        stats.total++;
      });
    } else {
      // If we're viewing a filtered set, we can only provide partial stats
      // In a production app, you'd want to fetch stats separately
      stats.total = libraryItems.length;
      libraryItems.forEach(item => {
        const status = (item.collection_type || 'owned') as ItemStatus;
        stats[status]++;
      });
    }

    return stats;
  };

  // Get library value statistics
  const getLibraryValueStats = () => {
    const ownedItems = libraryItems.filter(item => 
      (item.collection_type || 'owned') === 'owned'
    );
    const wishlistItems = libraryItems.filter(item => 
      item.collection_type === 'wishlist'
    );
    
    const ownedValue = ownedItems.reduce((sum, item) => 
      sum + (item.purchase_price || 0), 0
    );
    const wishlistValue = wishlistItems.reduce((sum, item) => 
      sum + (item.purchase_price || 0), 0
    );

    return {
      ownedValue,
      wishlistValue,
      totalItems: libraryItems.length,
      ownedItems: ownedItems.length,
      wishlistItems: wishlistItems.length
    };
  };

  // Get items by specific status
  const getItemsByStatus = (status: ItemStatus): MediaLibraryItem[] => {
    return libraryItems.filter(item => 
      (item.collection_type || 'owned') === status
    );
  };

  // Check if item already exists in library
  const itemExists = (imdbId: string, format?: string): boolean => {
    return libraryItems.some(item => 
      item.imdb_id === imdbId && 
      (!format || item.format === format)
    );
  };

  // Search library by title, director, genre, etc.
  const searchLibrary = (query: string): MediaLibraryItem[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return libraryItems;

    return libraryItems.filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.director?.toLowerCase().includes(searchTerm) ||
      item.genre?.toLowerCase().includes(searchTerm) ||
      item.notes?.toLowerCase().includes(searchTerm)
    );
  };

  // Refetch library items (useful for refreshing data)
  const refetch = async () => {
    await fetchLibraryItems();
  };

  // Initialize: Fetch library items when user or item status changes
  useEffect(() => {
    fetchLibraryItems();
  }, [user, itemStatus]); // Refetch when user or item status changes

  return {
    // Data
    libraryItems,
    loading,
    error,

    // CRUD Operations  
    addToLibrary,
    updateLibraryItem,
    removeFromLibrary,
    bulkUpdateLibraryItems,

    // Status Operations
    moveItemStatus,
    getItemsByStatus,

    // Statistics & Analytics
    getLibraryStats,
    getLibraryValueStats,

    // Utility Functions
    getAllLibraryItems,
    itemExists,
    searchLibrary,
    refetch
  };
}