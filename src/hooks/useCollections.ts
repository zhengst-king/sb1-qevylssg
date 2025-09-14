// src/hooks/useCollections.ts - COMPLETE REWRITE WITH WISHLIST SEPARATION
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';

// Enhanced interface for collection filtering
interface UseCollectionsOptions {
  collectionType?: CollectionType | 'all';
  includeAll?: boolean;
}

// Collection statistics interface
interface CollectionStats {
  owned: number;
  wishlist: number;
  for_sale: number;
  loaned_out: number;
  missing: number;
  total: number;
}

export function useCollections(options: UseCollectionsOptions = {}) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<PhysicalMediaCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { collectionType = 'all', includeAll = false } = options;

  // Fetch collections from the database with optional filtering
  const fetchCollections = async () => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query with optional collection_type filter
      let query = supabase
        .from('physical_media_collections')
        .select(`
          *,
          bluray_technical_specs:technical_specs_id(*)
        `)
        .eq('user_id', user.id);

      // Add collection_type filter if specified
      if (collectionType !== 'all') {
        query = query.eq('collection_type', collectionType);
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

      setCollections(processedData);
      console.log('[useCollections] Loaded', processedData?.length || 0, 'items', 
                  collectionType !== 'all' ? `(type: ${collectionType})` : '(all types)');
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  // Add item to collection
  const addToCollection = async (
    collectionData: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('physical_media_collections')
        .insert([{ 
          ...collectionData, 
          user_id: user.id,
          collection_type: collectionData.collection_type || 'owned' // Default to 'owned'
        }])
        .select()
        .single();

      if (error) throw error;

      // Only add to local state if it matches the current filter
      if (collectionType === 'all' || data.collection_type === collectionType) {
        setCollections(prev => [data, ...prev]);
      }

      console.log('[useCollections] Added item:', data.title, 'type:', data.collection_type);
      return data;
    } catch (error) {
      console.error('[useCollections] Add error:', error);
      throw error;
    }
  };

  // Update collection item
  const updateCollection = async (
    id: string, 
    updates: Partial<PhysicalMediaCollection>
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
      setCollections(prev => prev.map(item => 
        item.id === id ? { ...item, ...data } : item
      ));

      console.log('[useCollections] Updated item:', data.title, 'changes:', Object.keys(updates));
      return data;
    } catch (error) {
      console.error('[useCollections] Update error:', error);
      throw error;
    }
  };

  // Remove from collection
  const removeFromCollection = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('physical_media_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setCollections(prev => prev.filter(item => item.id !== id));
      console.log('[useCollections] Removed item:', id);
    } catch (error) {
      console.error('[useCollections] Remove error:', error);
      throw error;
    }
  };

  // Move item between collection types (e.g., wishlist to owned)
  const moveToCollectionType = async (id: string, newType: CollectionType) => {
    try {
      const updatedItem = await updateCollection(id, { collection_type: newType });
      
      // If we're filtering by collection type and the item no longer matches, remove it from local state
      if (collectionType !== 'all' && newType !== collectionType) {
        setCollections(prev => prev.filter(item => item.id !== id));
      }
      
      console.log('[useCollections] Moved item to:', newType);
      return updatedItem;
    } catch (error) {
      console.error('[useCollections] Move to collection type error:', error);
      throw error;
    }
  };

  // Bulk update multiple items
  const bulkUpdateCollections = async (
    itemIds: string[],
    updates: Partial<PhysicalMediaCollection>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updatePromises = itemIds.map(id => updateCollection(id, updates));
      const results = await Promise.all(updatePromises);
      
      console.log('[useCollections] Bulk updated', results.length, 'items');
      return results;
    } catch (error) {
      console.error('[useCollections] Bulk update error:', error);
      throw error;
    }
  };

  // Get all collections (ignoring current filter) for statistics
  const getAllCollections = async (): Promise<PhysicalMediaCollection[]> => {
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
      console.error('[useCollections] Get all collections error:', error);
      return [];
    }
  };

  // Get collection statistics by type
  const getCollectionStats = (): CollectionStats => {
    // For accurate stats, we need to consider all collections, not just filtered ones
    // This is a limitation - in a real app, you'd want to fetch stats separately
    // or maintain a separate state for all collections
    
    const stats: CollectionStats = {
      owned: 0,
      wishlist: 0,
      for_sale: 0,
      loaned_out: 0,
      missing: 0,
      total: 0
    };

    // If we're viewing all collections, we can calculate accurate stats
    if (collectionType === 'all') {
      collections.forEach(item => {
        const type = (item.collection_type || 'owned') as CollectionType;
        stats[type]++;
        stats.total++;
      });
    } else {
      // If we're viewing a filtered set, we can only provide partial stats
      // In a production app, you'd want to fetch stats separately
      stats.total = collections.length;
      collections.forEach(item => {
        const type = (item.collection_type || 'owned') as CollectionType;
        stats[type]++;
      });
    }

    return stats;
  };

  // Get collection value statistics
  const getCollectionValueStats = () => {
    const ownedItems = collections.filter(item => 
      (item.collection_type || 'owned') === 'owned'
    );
    const wishlistItems = collections.filter(item => 
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
      totalItems: collections.length,
      ownedItems: ownedItems.length,
      wishlistItems: wishlistItems.length
    };
  };

  // Get items by specific collection type
  const getItemsByType = (type: CollectionType): PhysicalMediaCollection[] => {
    return collections.filter(item => 
      (item.collection_type || 'owned') === type
    );
  };

  // Check if item already exists in collection
  const itemExists = (imdbId: string, format?: string): boolean => {
    return collections.some(item => 
      item.imdb_id === imdbId && 
      (!format || item.format === format)
    );
  };

  // Search collections by title, director, genre, etc.
  const searchCollections = (query: string): PhysicalMediaCollection[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return collections;

    return collections.filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.director?.toLowerCase().includes(searchTerm) ||
      item.genre?.toLowerCase().includes(searchTerm) ||
      item.notes?.toLowerCase().includes(searchTerm)
    );
  };

  // Refetch collections (useful for refreshing data)
  const refetch = async () => {
    await fetchCollections();
  };

  // Initialize: Fetch collections when user or collection type changes
  useEffect(() => {
    fetchCollections();
  }, [user, collectionType]); // Refetch when user or collection type changes

  return {
    // Data
    collections,
    loading,
    error,

    // CRUD Operations  
    addToCollection,
    updateCollection,
    removeFromCollection,
    bulkUpdateCollections,

    // Collection Type Operations
    moveToCollectionType,
    getItemsByType,

    // Statistics & Analytics
    getCollectionStats,
    getCollectionValueStats,

    // Utility Functions
    getAllCollections,
    itemExists,
    searchCollections,
    refetch
  };
}