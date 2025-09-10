import { useState, useEffect } from 'react';
import { supabase, type PhysicalMediaCollection } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useCollections() {
  const [collections, setCollections] = useState<PhysicalMediaCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const fetchCollections = async () => {
    if (!isAuthenticated || !user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('collections_with_technical_specs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async (item: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('physical_media_collections')
      .insert([{ ...item, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setCollections(prev => [data, ...prev]);
    return data;
  };

  const updateCollection = async (id: string, updates: Partial<PhysicalMediaCollection>) => {
    const { data, error } = await supabase
      .from('physical_media_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setCollections(prev => prev.map(item => 
      item.id === id ? { ...item, ...data } : item
    ));
    return data;
  };

  const removeFromCollection = async (id: string) => {
    const { error } = await supabase
      .from('physical_media_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setCollections(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    fetchCollections();
  }, [isAuthenticated, user]);

  return {
    collections,
    loading,
    error,
    fetchCollections,
    addToCollection,
    updateCollection,
    removeFromCollection
  };
}