import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { PhysicalMediaCollection } from '../lib/supabase';

export function useCollections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<PhysicalMediaCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch collections from the database
  const fetchCollections = async () => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to use the view first, fall back to direct table query
      let { data, error: fetchError } = await supabase
        .from('collections_with_technical_specs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // If the view doesn't exist, fall back to the direct table
      if (fetchError && fetchError.message.includes('does not exist')) {
        console.log('[useCollections] View not found, using direct table query');
        const { data: directData, error: directError } = await supabase
          .from('physical_media_collections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        data = directData;
        fetchError = directError;
      }

      if (fetchError) {
        throw fetchError;
      }

      setCollections(data || []);
      console.log('[useCollections] Loaded', data?.length || 0, 'items');
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

// SAFE SOLUTION: Delete dependent records first, then the main record
// SIMPLIFIED: Use database function for safe deletion
const removeFromCollection = async (itemId: string) => {
  if (!user) throw new Error('User not authenticated');

  try {
    console.log('[removeFromCollection] Using database function for itemId:', itemId);
    console.log('[removeFromCollection] User ID:', user.id);

    // Method 1: Try using the database function (if available)
    try {
      const { data: dbResult, error: dbError } = await supabase
        .rpc('safe_delete_collection_item', {
          item_id: itemId,
          user_id: user.id
        });

      if (dbError) {
        console.log('[removeFromCollection] Database function not available, falling back to manual method');
        throw dbError;
      }

      if (!dbResult) {
        throw new Error('Item not found or you do not have permission to delete it');
      }

      console.log('[removeFromCollection] ✅ Successfully deleted using database function');
      
      // Update local state
      setCollections(prev => prev.filter(item => item.id !== itemId));
      return true;

    } catch (dbFunctionError) {
      console.log('[removeFromCollection] Database function failed, trying manual cleanup...');
      
      // Method 2: Manual cleanup (fallback)
      // First verify the item exists
      const { data: existingItem, error: checkError } = await supabase
        .from('physical_media_collections')
        .select('id, title, user_id')
        .eq('id', itemId)
        .eq('user_id', user.id)
        .single();

      if (checkError || !existingItem) {
        throw new Error('Item not found or you do not have permission to delete it');
      }

      // Clean up scraping queue records
      await supabase
        .from('scraping_queue')
        .delete()
        .eq('collection_item_id', itemId);

      // Clear technical specs reference
      await supabase
        .from('physical_media_collections')
        .update({ technical_specs_id: null })
        .eq('id', itemId)
        .eq('user_id', user.id);

      // Delete the main record
      const { error: deleteError } = await supabase
        .from('physical_media_collections')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[removeFromCollection] Manual delete failed:', deleteError);
        throw new Error(`Delete failed: ${deleteError.message}`);
      }

      console.log('[removeFromCollection] ✅ Successfully deleted using manual cleanup');
      
      // Update local state
      setCollections(prev => prev.filter(item => item.id !== itemId));
      return true;
    }

  } catch (err) {
    console.error('[removeFromCollection] ❌ Error:', err);
    throw err;
  }
};

  // Update single collection item
  const updateCollectionItem = async (itemId: string, updates: Partial<PhysicalMediaCollection>) => {
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

  // Load collections on mount and when user changes
  useEffect(() => {
    fetchCollections();
  }, [user]);

  return {
    collections,
    loading,
    error,
    addToCollection,
    removeFromCollection,
    updateCollectionItem,
    refetch: fetchCollections
  };
}