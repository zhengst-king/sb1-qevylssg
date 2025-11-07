// src/hooks/useMediaLibraryShelves.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Shelf, ShelfWithCount, ShelfItem } from '../lib/supabase';

interface UseMediaLibraryShelvesOptions {
  autoFetch?: boolean;
}

export function useMediaLibraryShelves(options: UseMediaLibraryShelvesOptions = {}) {
  const { user } = useAuth();
  const { autoFetch = true } = options;
  
  const [shelves, setShelves] = useState<ShelfWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all shelves with item counts
  const fetchShelves = async () => {
    if (!user) {
      setShelves([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch shelves
      const { data: shelvesData, error: shelvesError } = await supabase
        .from('shelves')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (shelvesError) throw shelvesError;

      // Fetch item counts for each shelf
      const shelvesWithCounts: ShelfWithCount[] = await Promise.all(
        (shelvesData || []).map(async (shelf) => {
          const { count } = await supabase
            .from('shelf_items')
            .select('*', { count: 'exact', head: true })
            .eq('shelf_id', shelf.id);

          return {
            ...shelf,
            item_count: count || 0
          };
        })
      );

      setShelves(shelvesWithCounts);
      console.log('[useMediaLibraryShelves] Loaded', shelvesWithCounts.length, 'shelves');
    } catch (err) {
      console.error('Error fetching shelves:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shelves');
    } finally {
      setLoading(false);
    }
  };

  // Create a new shelf
  const createShelf = async (
    shelfData: Omit<Shelf, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Shelf | null> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('shelves')
        .insert([{
          ...shelfData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state with count 0
      setShelves(prev => [...prev, { ...data, item_count: 0 }]);
      console.log('[useMediaLibraryShelves] Created shelf:', data.name);
      return data;
    } catch (error) {
      console.error('[useMediaLibraryShelves] Create error:', error);
      throw error;
    }
  };

  // Update shelf
  const updateShelf = async (
    shelfId: string,
    updates: Partial<Omit<Shelf, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<Shelf | null> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('shelves')
        .update(updates)
        .eq('id', shelfId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setShelves(prev => prev.map(shelf => 
        shelf.id === shelfId 
          ? { ...shelf, ...data }
          : shelf
      ));

      console.log('[useMediaLibraryShelves] Updated shelf:', data.name);
      return data;
    } catch (error) {
      console.error('[useMediaLibraryShelves] Update error:', error);
      throw error;
    }
  };

  // Delete shelf
  const deleteShelf = async (shelfId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('shelves')
        .delete()
        .eq('id', shelfId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setShelves(prev => prev.filter(shelf => shelf.id !== shelfId));
      console.log('[useMediaLibraryShelves] Deleted shelf:', shelfId);
    } catch (error) {
      console.error('[useMediaLibraryShelves] Delete error:', error);
      throw error;
    }
  };

  // Add item to shelf
  const addItemToShelf = async (
    shelfId: string,
    libraryItemId: string,
    sortOrder: number = 0
  ): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('shelf_items')
        .insert([{
          shelf_id: shelfId,
          library_item_id: libraryItemId,
          sort_order: sortOrder
        }]);

      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
          throw new Error('Item already exists in this shelf');
        }
        throw error;
      }

      // Update item count in local state
      setShelves(prev => prev.map(shelf =>
        shelf.id === shelfId
          ? { ...shelf, item_count: shelf.item_count + 1 }
          : shelf
      ));

      console.log('[useMediaLibraryShelves] Added item to shelf');
    } catch (error) {
      console.error('[useMediaLibraryShelves] Add item error:', error);
      throw error;
    }
  };

  // Remove item from shelf
  const removeItemFromShelf = async (
    shelfId: string,
    libraryItemId: string
  ): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('shelf_items')
        .delete()
        .eq('shelf_id', shelfId)
        .eq('library_item_id', libraryItemId);

      if (error) throw error;

      // Update item count in local state
      setShelves(prev => prev.map(shelf =>
        shelf.id === shelfId
          ? { ...shelf, item_count: Math.max(0, shelf.item_count - 1) }
          : shelf
      ));

      console.log('[useMediaLibraryShelves] Removed item from shelf');
    } catch (error) {
      console.error('[useMediaLibraryShelves] Remove item error:', error);
      throw error;
    }
  };

  // Add item to multiple shelves
  const addItemToMultipleShelves = async (
    shelfIds: string[],
    libraryItemId: string
  ): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const insertData = shelfIds.map(shelfId => ({
        shelf_id: shelfId,
        library_item_id: libraryItemId,
        sort_order: 0
      }));

      const { error } = await supabase
        .from('shelf_items')
        .insert(insertData);

      if (error) throw error;

      // Update item counts in local state
      setShelves(prev => prev.map(shelf =>
        shelfIds.includes(shelf.id)
          ? { ...shelf, item_count: shelf.item_count + 1 }
          : shelf
      ));

      console.log('[useMediaLibraryShelves] Added item to', shelfIds.length, 'shelves');
    } catch (error) {
      console.error('[useMediaLibraryShelves] Add to multiple shelves error:', error);
      throw error;
    }
  };

  // Get items in a specific shelf
  const getShelfItems = async (shelfId: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('shelf_items')
        .select(`
          sort_order,
          added_at,
          library_item:physical_media_collections(*)
        `)
        .eq('shelf_id', shelfId)
        .order('sort_order', { ascending: true })
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Extract library items from the join
      return (data || []).map(item => item.library_item).filter(Boolean);
    } catch (error) {
      console.error('[useMediaLibraryShelves] Get shelf items error:', error);
      return [];
    }
  };

  // Get shelves for a specific item
  const getItemShelves = async (libraryItemId: string): Promise<Shelf[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('shelf_items')
        .select(`
          shelf:shelves(*)
        `)
        .eq('library_item_id', libraryItemId);

      if (error) throw error;

      // Extract shelves from the join
      return (data || []).map(item => item.shelf).filter(Boolean);
    } catch (error) {
      console.error('[useMediaLibraryShelves] Get item shelves error:', error);
      return [];
    }
  };

  // Check if item exists in shelf
  const isItemInShelf = async (shelfId: string, libraryItemId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { count } = await supabase
        .from('shelf_items')
        .select('*', { count: 'exact', head: true })
        .eq('shelf_id', shelfId)
        .eq('library_item_id', libraryItemId);

      return (count || 0) > 0;
    } catch (error) {
      console.error('[useMediaLibraryShelves] Check item in shelf error:', error);
      return false;
    }
  };

  // Reorder shelves
  const reorderShelves = async (reorderedShelves: Shelf[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Update sort_order for each shelf
      const updates = reorderedShelves.map((shelf, index) =>
        supabase
          .from('shelves')
          .update({ sort_order: index })
          .eq('id', shelf.id)
          .eq('user_id', user.id)
      );

      await Promise.all(updates);

      // Update local state
      setShelves(reorderedShelves.map((shelf, index) => ({
        ...shelf,
        sort_order: index
      })));

      console.log('[useMediaLibraryShelves] Reordered shelves');
    } catch (error) {
      console.error('[useMediaLibraryShelves] Reorder error:', error);
      throw error;
    }
  };

  // Initialize: Fetch shelves when user changes
  useEffect(() => {
    if (autoFetch) {
      fetchShelves();
    }
  }, [user, autoFetch]);

  return {
    // Data
    shelves,
    loading,
    error,

    // CRUD Operations
    createShelf,
    updateShelf,
    deleteShelf,

    // Shelf-Item Operations
    addItemToShelf,
    removeItemFromShelf,
    addItemToMultipleShelves,
    getShelfItems,
    getItemShelves,
    isItemInShelf,

    // Utility
    reorderShelves,
    refetch: fetchShelves
  };
}