// src/hooks/useTagSubcategories.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Subcategory {
  id: string;
  category_id: number;
  name: string;
  is_visible: boolean;
  is_suggested: boolean;
  is_custom: boolean;
  content_type: string;
  usage_count: number;
}

interface CreateSubcategoryData {
  category_id: number;
  name: string;
  is_visible?: boolean;
  is_custom: boolean;
}

export function useTagSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all subcategories for the current user
  const fetchSubcategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tag_subcategories')
        .select('*')
        .or(`created_by.eq.${user.id},is_custom.eq.false`)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load subcategories on mount
  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // Create a new custom subcategory (marked as visible)
  const createSubcategory = async (data: CreateSubcategoryData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newSubcategory, error } = await supabase
        .from('tag_subcategories')
        .insert({
          category_id: data.category_id,
          name: data.name.trim(),
          is_visible: true, // Always visible when custom created
          is_suggested: false,
          is_custom: true,
          content_type: 'Both',
          created_by: user.id,
          usage_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      if (newSubcategory) {
        setSubcategories(prev => [...prev, newSubcategory]);
      }

      return { success: true, data: newSubcategory };
    } catch (error) {
      console.error('Error creating subcategory:', error);
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Make a suggested subcategory visible for this user
  // For system subcategories, creates a user-specific copy
  const makeSuggestedVisible = async (subcategoryId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First, get the suggested subcategory details
      const { data: suggestedSub, error: fetchError } = await supabase
        .from('tag_subcategories')
        .select('*')
        .eq('id', subcategoryId)
        .single();

      if (fetchError) throw fetchError;
      if (!suggestedSub) throw new Error('Subcategory not found');

      // Check if this is a custom user subcategory or a system subcategory
      if (suggestedSub.created_by === user.id) {
        // User's own subcategory - just update it
        const { data: updatedSubcategory, error: updateError } = await supabase
          .from('tag_subcategories')
          .update({
            is_visible: true,
            is_suggested: false
          })
          .eq('id', subcategoryId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        if (updatedSubcategory) {
          setSubcategories(prev =>
            prev.map(sub =>
              sub.id === subcategoryId ? updatedSubcategory : sub
            )
          );
        }

        return { success: true, data: updatedSubcategory };
      } else {
        // System subcategory - create a user-specific visible copy
        const { data: newSubcategory, error: createError } = await supabase
          .from('tag_subcategories')
          .insert({
            category_id: suggestedSub.category_id,
            name: suggestedSub.name,
            is_visible: true,
            is_suggested: false,
            is_custom: false, // It's based on a system subcategory
            content_type: suggestedSub.content_type,
            created_by: user.id,
            usage_count: 0
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add to local state
        if (newSubcategory) {
          setSubcategories(prev => [...prev, newSubcategory]);
        }

        return { success: true, data: newSubcategory };
      }
    } catch (error) {
      console.error('Error making subcategory visible:', error);
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  };

  const deleteSubcategory = async (subcategoryId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { count } = await supabase
        .from('tags')
        .select('*', { count: 'exact', head: true })
        .eq('subcategory_id', subcategoryId)
        .eq('user_id', user.id);

      if (count && count > 0) {
        throw new Error(`Cannot delete: ${count} tag(s) are using this subcategory`);
      }

      const { error } = await supabase
        .from('tag_subcategories')
        .delete()
        .eq('id', subcategoryId)
        .eq('created_by', user.id)
        .eq('is_custom', true);

      if (error) throw error;

      // Remove from local state
      setSubcategories(prev => prev.filter(sub => sub.id !== subcategoryId));

      return { success: true };
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Get visible subcategories for a category
  const getVisibleSubcategories = useCallback((categoryId: number) => {
    return subcategories.filter(
      sub => sub.category_id === categoryId && sub.is_visible
    );
  }, [subcategories]);

  // Get suggested subcategories for a category
  const getSuggestedSubcategories = useCallback((categoryId: number) => {
    return subcategories.filter(
      sub => sub.category_id === categoryId && sub.is_suggested && !sub.is_visible
    );
  }, [subcategories]);

  return {
    subcategories,
    loading,
    createSubcategory,
    makeSuggestedVisible,
    deleteSubcategory,
    getVisibleSubcategories,
    getSuggestedSubcategories,
    refetch: fetchSubcategories
  };
}