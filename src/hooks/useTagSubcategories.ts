// src/hooks/useTagSubcategories.ts
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CreateSubcategoryData {
  category_id: number;
  name: string;
  is_visible?: boolean;
  is_custom: boolean;
}

export function useTagSubcategories() {
  const [loading, setLoading] = useState(false);

  const createCustomSubcategory = async (data: CreateSubcategoryData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tag_subcategories')
        .insert({
          category_id: data.category_id,
          name: data.name.trim(),
          is_visible: data.is_visible || false,
          is_suggested: false,
          is_custom: true,
          content_type: 'Both',
          created_by: user.id,
          usage_count: 0
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating subcategory:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteSubcategory = async (subcategoryId: number) => {
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
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCustomSubcategory,
    deleteSubcategory,
    loading
  };
}