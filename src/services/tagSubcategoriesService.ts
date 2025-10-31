// src/services/tagSubcategoriesService.ts
// Service layer for tag subcategory management

import { supabase } from '../lib/supabase';

export interface TagSubcategory {
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

interface CreateSubcategoryDTO {
  category_id: number;
  name: string;
  is_visible: boolean;
  is_custom: boolean;
  content_type?: 'Movie' | 'TV' | 'Both';
  genre_specific?: string | null;
}

class TagSubcategoriesService {
  /**
   * Get all subcategories (predefined + user's custom)
   */
  async getSubcategories(): Promise<TagSubcategory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tag_subcategories')
      .select('*')
      .or(`created_by.is.null,created_by.eq.${user.id}`)
      .order('category_id', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Get subcategories by category
   */
  async getSubcategoriesByCategory(categoryId: number): Promise<TagSubcategory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tag_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .or(`created_by.is.null,created_by.eq.${user.id}`)
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Create a custom subcategory
   */
  async createCustomSubcategory(subcategoryData: CreateSubcategoryDTO): Promise<TagSubcategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check for duplicate name (case-insensitive)
    const { data: existing } = await supabase
      .from('tag_subcategories')
      .select('id')
      .eq('category_id', subcategoryData.category_id)
      .ilike('name', subcategoryData.name)
      .or(`created_by.is.null,created_by.eq.${user.id}`)
      .single();

    if (existing) {
      throw new Error('A subcategory with this name already exists in this category');
    }

    const { data, error } = await supabase
      .from('tag_subcategories')
      .insert({
        category_id: subcategoryData.category_id,
        name: subcategoryData.name.trim(),
        is_visible: subcategoryData.is_visible,
        is_suggested: false,
        is_custom: true,
        content_type: subcategoryData.content_type || 'Both',
        genre_specific: subcategoryData.genre_specific || null,
        created_by: user.id,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Update a custom subcategory (only user's own)
   */
  async updateSubcategory(
    subcategoryId: string,
    updates: { name?: string; content_type?: 'Movie' | 'TV' | 'Both' }
  ): Promise<TagSubcategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tag_subcategories')
      .update(updates)
      .eq('id', subcategoryId)
      .eq('created_by', user.id)
      .eq('is_custom', true)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Delete a custom subcategory (only if not in use)
   */
  async deleteSubcategory(subcategoryId: string): Promise<void> {
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

    const { error } = await supabase
      .from('tag_subcategories')
      .delete()
      .eq('id', subcategoryId)
      .eq('created_by', user.id)
      .eq('is_custom', true);

    if (error) throw error;
  }

  /**
   * Move subcategory to different category (custom only)
   */
  async moveSubcategory(subcategoryId: string, newCategoryId: number): Promise<TagSubcategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tag_subcategories')
      .update({ category_id: newCategoryId })
      .eq('id', subcategoryId)
      .eq('created_by', user.id)
      .eq('is_custom', true)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

export const tagSubcategoriesService = new TagSubcategoriesService();