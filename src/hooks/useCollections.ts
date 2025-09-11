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