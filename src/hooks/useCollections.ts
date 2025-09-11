import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { PhysicalMediaCollection, BlurayTechnicalSpecs } from '../lib/supabase';

// Enhanced collection type with technical specs
type CollectionWithSpecs = PhysicalMediaCollection & {
  technical_specs?: BlurayTechnicalSpecs;
};

interface CollectionUpdate {
  format?: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  condition?: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  purchase_date?: string | null;
  purchase_price?: number | null;
  purchase_location?: string | null;
  personal_rating?: number | null;
  notes?: string | null;
}

interface BulkUpdateOptions {
  itemIds: string[];
  updates: CollectionUpdate;
}

export function useCollections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionWithSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch collections with technical specs
  const fetchCollections = async () => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the view that joins with technical specs
      const { data, error: fetchError } = await supabase
        .from('collections_with_technical_specs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setCollections(data || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  // Add new item to collection
  const addToCollection = async (item: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error: addError } = await supabase
        .from('physical_media_collections')
        .insert([{ ...item, user_id: user.id }])
        .select()
        .single();

      if (addError) {
        throw addError;
      }

      // Refresh collections
      await fetchCollections();
      return data;
    } catch (err) {
      console.error('Error adding to collection:', err);
      throw err;
    }
  };

  // Update single collection item
  const updateCollectionItem = async (itemId: string, updates: CollectionUpdate) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('physical_media_collections')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', user.id) // Security: only update user's own items
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state immediately for better UX
      setCollections(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, ...updateData }
            : item
        )
      );

      return data;
    } catch (err) {
      console.error('Error updating collection item:', err);
      throw err;
    }
  };

  // Bulk update multiple items
  const bulkUpdateItems = async ({ itemIds, updates }: BulkUpdateOptions) => {
    if (!user) throw new Error('User not authenticated');
    if (itemIds.length === 0) throw new Error('No items selected');

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('physical_media_collections')
        .update(updateData)
        .in('id', itemIds)
        .eq('user_id', user.id) // Security: only update user's own items
        .select();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setCollections(prev => 
        prev.map(item => 
          itemIds.includes(item.id)
            ? { ...item, ...updateData }
            : item
        )
      );

      return data;
    } catch (err) {
      console.error('Error bulk updating items:', err);
      throw err;
    }
  };

  // Remove item from collection
  const removeFromCollection = async (itemId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error: deleteError } = await supabase
        .from('physical_media_collections')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id); // Security: only delete user's own items

      if (deleteError) {
        throw deleteError;
      }

      // Update local state immediately
      setCollections(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Error removing from collection:', err);
      throw err;
    }
  };

  // Find potential duplicates
  const findDuplicates = () => {
    const duplicateGroups: CollectionWithSpecs[][] = [];
    const processed = new Set<string>();

    collections.forEach(item => {
      if (processed.has(item.id)) return;

      const duplicates = collections.filter(other => 
        other.id !== item.id &&
        !processed.has(other.id) &&
        (
          // Same IMDB ID
          (item.imdb_id && other.imdb_id && item.imdb_id === other.imdb_id) ||
          // Same title and year (case-insensitive)
          (item.title.toLowerCase() === other.title.toLowerCase() && 
           item.year === other.year)
        )
      );

      if (duplicates.length > 0) {
        const group = [item, ...duplicates];
        duplicateGroups.push(group);
        
        // Mark all items in this group as processed
        group.forEach(groupItem => processed.add(groupItem.id));
      }
    });

    return duplicateGroups;
  };

  // Merge duplicate items (keep first, delete others)
  const mergeDuplicates = async (itemsToMerge: string[], keepItemId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const itemsToDelete = itemsToMerge.filter(id => id !== keepItemId);
      
      if (itemsToDelete.length === 0) return;

      const { error: deleteError } = await supabase
        .from('physical_media_collections')
        .delete()
        .in('id', itemsToDelete)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setCollections(prev => 
        prev.filter(item => !itemsToDelete.includes(item.id))
      );

      return itemsToDelete.length;
    } catch (err) {
      console.error('Error merging duplicates:', err);
      throw err;
    }
  };

  // Get collection statistics
  const getCollectionStats = () => {
    const stats = {
      total: collections.length,
      byFormat: {
        dvd: collections.filter(item => item.format === 'DVD').length,
        bluray: collections.filter(item => item.format === 'Blu-ray').length,
        uhd: collections.filter(item => item.format === '4K UHD').length,
        threeDee: collections.filter(item => item.format === '3D Blu-ray').length,
      },
      byCondition: {
        new: collections.filter(item => item.condition === 'New').length,
        likeNew: collections.filter(item => item.condition === 'Like New').length,
        good: collections.filter(item => item.condition === 'Good').length,
        fair: collections.filter(item => item.condition === 'Fair').length,
        poor: collections.filter(item => item.condition === 'Poor').length,
      },
      withSpecs: collections.filter(item => item.technical_specs_id).length,
      totalValue: collections.reduce((sum, item) => sum + (item.purchase_price || 0), 0),
      averageRating: collections.length > 0 
        ? collections.reduce((sum, item) => sum + (item.personal_rating || 0), 0) / collections.length
        : 0,
      duplicates: findDuplicates().length
    };

    return stats;
  };

  // Load collections on mount and when user changes
  useEffect(() => {
    fetchCollections();
  }, [user]);

  return {
    collections,
    loading,
    error,
    
    // CRUD operations
    addToCollection,
    updateCollectionItem,
    bulkUpdateItems,
    removeFromCollection,
    
    // Duplicate management
    findDuplicates,
    mergeDuplicates,
    
    // Utility functions
    getCollectionStats,
    refetch: fetchCollections
  };
}