// src/hooks/useTagSubcategories.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TagSubcategory {
  id: string;
  category_id: number;
  name: string;
  is_visible: boolean;
  is_suggested: boolean;
  is_custom: boolean;
  content_type: 'Movie' | 'TV' | 'Both';
  genre_specific: string | null;
  created_by: string | null;
  usage_count: number;
  created_at: string;
}

interface CreateSubcategoryData {
  category_id: number;
  name: string;
  is_visible: boolean;
  is_custom: boolean;
  content_type?: 'Movie' | 'TV' | 'Both';
  genre_specific?: string | null;
}

export function useTagSubcategories() {
  const [subcategories, setSubcategories] = useState<TagSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all subcategories (both predefined and user's custom ones)
  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch both predefined (created_by IS NULL) and user's custom subcategories
      const { data, error: fetchError } = await supabase
        .from('tag_subcategories')
        .select('*')
        .or(`created_by.is.null,created_by.eq.${user.id}`)
        .order('category_id', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setSubcategories(data || []);
    } catch (err) {
      console.error('Error fetching subcategories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subcategories');
    } finally {
      setLoading(false);
    }
  };

  // Create a custom subcategory
  const createCustomSubcategory = async (data: CreateSubcategoryData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if subcategory name already exists for this category (case-insensitive)
      const { data: existing } = await supabase
        .from('tag_subcategories')
        .select('id')
        .eq('category_id', data.category_id)
        .ilike('name', data.name)
        .or(`created_by.is.null,created_by.eq.${user.id}`)
        .single();

      if (existing) {
        throw new Error('A subcategory with this name already exists in this category');
      }

      const { data: newSubcategory, error: createError } = await supabase
        .from('tag_subcategories')
        .insert({
          category_id: data.category_id,
          name: data.name.trim(),
          is_visible: data.is_visible,
          is_suggested: false, // Custom subcategories start as not suggested
          is_custom: true,
          content_type: data.content_type || 'Both',
          genre_specific: data.genre_specific || null,
          created_by: user.id,
          usage_count: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add to local state
      setSubcategories(prev => [...prev, newSubcategory]);

      return newSubcategory;
    } catch (err) {
      console.error('Error creating subcategory:', err);
      throw err;
    }
  };

  // Update a subcategory (only custom ones can be updated)
  const updateSubcategory = async (
    subcategoryId: string, 
    updates: { name?: string; content_type?: 'Movie' | 'TV' | 'Both' }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: updatedSubcategory, error: updateError } = await supabase
        .from('tag_subcategories')
        .update(updates)
        .eq('id', subcategoryId)
        .eq('created_by', user.id) // Only update if user owns it
        .eq('is_custom', true) // Only update custom subcategories
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setSubcategories(prev => prev.map(sub => 
        sub.id === subcategoryId 
          ? { ...sub, ...updatedSubcategory }
          : sub
      ));

      return updatedSubcategory;
    } catch (err) {
      console.error('Error updating subcategory:', err);
      throw err;
    }
  };

  // Delete a custom subcategory (only if not in use)
  const deleteSubcategory = async (subcategoryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if any tags are using this subcategory
      const { count } = await supabase
        .from('tags')
        .select('*', { count: 'exact', head: true })
        .eq('subcategory_id', subcategoryId)
        .eq('user_id', user.id);

      if (count && count > 0) {
        throw new Error(`Cannot delete subcategory: ${count} tag(s) are using it`);
      }

      // Delete the subcategory
      const { error: deleteError } = await supabase
        .from('tag_subcategories')
        .delete()
        .eq('id', subcategoryId)
        .eq('created_by', user.id) // Only delete if user owns it
        .eq('is_custom', true); // Only delete custom subcategories

      if (deleteError) throw deleteError;

      // Remove from local state
      setSubcategories(prev => prev.filter(sub => sub.id !== subcategoryId));
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      throw err;
    }
  };

  // Move a subcategory to a different category (custom only)
  const moveSubcategory = async (subcategoryId: string, newCategoryId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: updatedSubcategory, error: updateError } = await supabase
        .from('tag_subcategories')
        .update({ category_id: newCategoryId })
        .eq('id', subcategoryId)
        .eq('created_by', user.id)
        .eq('is_custom', true)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setSubcategories(prev => prev.map(sub => 
        sub.id === subcategoryId 
          ? { ...sub, category_id: newCategoryId }
          : sub
      ));

      return updatedSubcategory;
    } catch (err) {
      console.error('Error moving subcategory:', err);
      throw err;
    }
  };

  // Get subcategories by category ID
  const getSubcategoriesByCategory = (categoryId: number) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  // Get only visible subcategories for a category
  const getVisibleSubcategories = (categoryId: number) => {
    return subcategories.filter(sub => 
      sub.category_id === categoryId && sub.is_visible
    );
  };

  // Get only suggested subcategories for a category
  const getSuggestedSubcategories = (categoryId: number) => {
    return subcategories.filter(sub => 
      sub.category_id === categoryId && sub.is_suggested
    );
  };

  // Get only custom subcategories for a category
  const getCustomSubcategories = (categoryId: number) => {
    return subcategories.filter(sub => 
      sub.category_id === categoryId && sub.is_custom
    );
  };

  // Initial fetch
  useEffect(() => {
    fetchSubcategories();
  }, []);

  return {
    subcategories,
    loading,
    error,
    createCustomSubcategory,
    updateSubcategory,
    deleteSubcategory,
    moveSubcategory,
    getSubcategoriesByCategory,
    getVisibleSubcategories,
    getSuggestedSubcategories,
    getCustomSubcategories,
    refetch: fetchSubcategories
  };
}