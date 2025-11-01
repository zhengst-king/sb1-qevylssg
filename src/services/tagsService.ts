// src/services/tagsService.ts
// Service layer for tag CRUD operations (Create, Read, Update, Delete)

import { supabase } from '../lib/supabase';
import type { Tag, CreateTagDTO, UpdateTagDTO } from '../types/customCollections';

class TagsService {
  /**
   * Get all tags for the current user
   */
  async getTags(): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get usage counts for each tag from content_tags table
    const tagsWithUsage = await Promise.all(
      (data || []).map(async (tag) => {
        const { count } = await supabase
          .from('content_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        return {
          ...tag,
          usage_count: count || 0
        };
      })
    );

    return tagsWithUsage;
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(id: string): Promise<Tag> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    // Get usage count
    const { count } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', id);

    return {
      ...data,
      usage_count: count || 0
    };
  }

  /**
   * Create a new tag
   */
  async createTag(tagData: CreateTagDTO): Promise<Tag> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate required fields
    if (!tagData.name?.trim()) {
      throw new Error('Tag name is required');
    }

    if (!tagData.category_id) {
      throw new Error('Category is required');
    }

    if (!tagData.subcategory_id) {
      throw new Error('Subcategory is required');
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        category_id: tagData.category_id,
        subcategory_id: tagData.subcategory_id,
        name: tagData.name.trim(),
        description: tagData.description?.trim() || null,
        color: tagData.color || '#3B82F6'
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate tag error
      if (error.code === '23505') {
        throw new Error('A tag with this name already exists in this category/subcategory');
      }
      throw error;
    }

    return {
      ...data,
      usage_count: 0
    };
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, updates: UpdateTagDTO): Promise<Tag> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Clean up updates
    const cleanedUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new Error('Tag name cannot be empty');
      }
      cleanedUpdates.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      cleanedUpdates.description = updates.description?.trim() || null;
    }

    if (updates.color !== undefined) {
      cleanedUpdates.color = updates.color;
    }

    if (updates.is_public !== undefined) {
      cleanedUpdates.is_public = updates.is_public;
    }

    const { data, error } = await supabase
      .from('tags')
      .update(cleanedUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A tag with this name already exists');
      }
      throw error;
    }

    // Get current usage count
    const { count } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', id);

    return {
      ...data,
      usage_count: count || 0
    };
  }

  /**
   * Delete a tag
   * Note: This will cascade delete all content_tags associations
   */
  async deleteTag(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // The database CASCADE will handle deleting content_tags automatically
    // But we can be explicit for clarity
    await supabase
      .from('content_tags')
      .delete()
      .eq('tag_id', id)
      .eq('user_id', user.id);

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Search tags by name or description
   */
  async searchTags(query: string): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (!query.trim()) {
      return this.getTags();
    }

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;

    // Add usage counts
    const tagsWithUsage = await Promise.all(
      (data || []).map(async (tag) => {
        const { count } = await supabase
          .from('content_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        return {
          ...tag,
          usage_count: count || 0
        };
      })
    );

    return tagsWithUsage;
  }

  /**
   * Get tags by category
   */
  async getTagsByCategory(categoryId: number): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) throw error;

    // Add usage counts
    const tagsWithUsage = await Promise.all(
      (data || []).map(async (tag) => {
        const { count } = await supabase
          .from('content_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        return {
          ...tag,
          usage_count: count || 0
        };
      })
    );

    return tagsWithUsage;
  }

  /**
   * Get tags by subcategory
   */
  async getTagsBySubcategory(subcategoryId: number): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .eq('subcategory_id', subcategoryId)
      .order('name', { ascending: true });

    if (error) throw error;

    // Add usage counts
    const tagsWithUsage = await Promise.all(
      (data || []).map(async (tag) => {
        const { count } = await supabase
          .from('content_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        return {
          ...tag,
          usage_count: count || 0
        };
      })
    );

    return tagsWithUsage;
  }

  /**
   * Merge two tags (move all content from source to target, then delete source)
   */
  async mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify both tags exist and belong to user
    const { data: sourceTags } = await supabase
      .from('tags')
      .select('id')
      .eq('id', sourceTagId)
      .eq('user_id', user.id)
      .single();

    const { data: targetTags } = await supabase
      .from('tags')
      .select('id')
      .eq('id', targetTagId)
      .eq('user_id', user.id)
      .single();

    if (!sourceTags || !targetTags) {
      throw new Error('One or both tags not found');
    }

    if (sourceTagId === targetTagId) {
      throw new Error('Cannot merge a tag with itself');
    }

    // Get all content tagged with source tag
    const { data: sourceContent } = await supabase
      .from('content_tags')
      .select('content_id, content_type')
      .eq('tag_id', sourceTagId)
      .eq('user_id', user.id);

    if (sourceContent && sourceContent.length > 0) {
      // For each content, either update or delete based on if target already exists
      for (const content of sourceContent) {
        // Check if content already has target tag
        const { data: existing } = await supabase
          .from('content_tags')
          .select('id')
          .eq('tag_id', targetTagId)
          .eq('content_id', content.content_id)
          .eq('content_type', content.content_type)
          .single();

        if (!existing) {
          // Content doesn't have target tag, so update source to target
          await supabase
            .from('content_tags')
            .update({ tag_id: targetTagId })
            .eq('tag_id', sourceTagId)
            .eq('content_id', content.content_id)
            .eq('content_type', content.content_type);
        } else {
          // Content already has target tag, just delete the duplicate
          await supabase
            .from('content_tags')
            .delete()
            .eq('tag_id', sourceTagId)
            .eq('content_id', content.content_id)
            .eq('content_type', content.content_type);
        }
      }
    }

    // Delete the source tag (all content_tags have been moved or deleted)
    await this.deleteTag(sourceTagId);
  }

  /**
   * Get tag statistics
   */
  async getTagStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get total tags
    const { count: totalTags } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get total content tags (total usage across all tags)
    const { count: totalUsage } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get tags grouped by category
    const { data: tagsByCategory } = await supabase
      .from('tags')
      .select('category_id')
      .eq('user_id', user.id);

    // Count tags per category
    const categoryCounts: Record<number, number> = {};
    tagsByCategory?.forEach(tag => {
      categoryCounts[tag.category_id] = (categoryCounts[tag.category_id] || 0) + 1;
    });

    // Get most used tags (top 10)
    const allTags = await this.getTags();
    const mostUsed = allTags
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10)
      .map(tag => ({
        id: tag.id,
        name: tag.name,
        usage_count: tag.usage_count
      }));

    return {
      total_tags: totalTags || 0,
      total_usage: totalUsage || 0,
      tags_by_category: categoryCounts,
      most_used: mostUsed
    };
  }

  /**
   * Bulk create tags
   */
  async createTags(tagsData: CreateTagDTO[]): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const inserts = tagsData.map(tagData => ({
      user_id: user.id,
      category_id: tagData.category_id,
      subcategory_id: tagData.subcategory_id,
      name: tagData.name.trim(),
      description: tagData.description?.trim() || null,
      color: tagData.color || '#3B82F6'
    }));

    const { data, error } = await supabase
      .from('tags')
      .insert(inserts)
      .select();

    if (error) throw error;

    return (data || []).map(tag => ({
      ...tag,
      usage_count: 0
    }));
  }

  /**
   * Duplicate a tag (create a copy with a new name)
   */
  async duplicateTag(id: string, newName: string): Promise<Tag> {
    const originalTag = await this.getTagById(id);

    return this.createTag({
      category_id: originalTag.category_id,
      subcategory_id: originalTag.subcategory_id,
      name: newName,
      description: originalTag.description,
      color: originalTag.color
    });
  }
}

export const tagsService = new TagsService();