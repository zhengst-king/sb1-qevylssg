// src/services/tagsService.ts
// Service layer for 3-level tagging system

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

    // Get usage counts for each tag
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

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        category_id: tagData.category_id,
        subcategory_id: tagData.subcategory_id,
        name: tagData.name.trim(),
        description: tagData.description?.trim() || null,
        color: tagData.color
      })
      .select()
      .single();

    if (error) throw error;

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

    const { data, error } = await supabase
      .from('tags')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

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
   */
  async deleteTag(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Delete all content associations (cascade should handle this, but being explicit)
    await supabase
      .from('content_tags')
      .delete()
      .eq('tag_id', id)
      .eq('user_id', user.id);

    // Delete the tag
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Add a tag to a content item
   */
  async addTagToContent(
    tagId: string,
    contentId: number,
    contentType: 'movie' | 'tv'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already tagged
    const { data: existing } = await supabase
      .from('content_tags')
      .select('id')
      .eq('tag_id', tagId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .single();

    if (existing) {
      throw new Error('Content is already tagged with this tag');
    }

    const { error } = await supabase
      .from('content_tags')
      .insert({
        tag_id: tagId,
        content_id: contentId,
        content_type: contentType,
        user_id: user.id
      });

    if (error) throw error;
  }

  /**
   * Remove a tag from a content item
   */
  async removeTagFromContent(
    tagId: string,
    contentId: number,
    contentType: 'movie' | 'tv'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_tags')
      .delete()
      .eq('tag_id', tagId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get all tags for a content item
   */
  async getTagsForContent(
    contentId: number,
    contentType: 'movie' | 'tv'
  ): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('content_tags')
      .select(`
        tag_id,
        tags (*)
      `)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (error) throw error;

    // Extract tags and add usage counts
    const tags = await Promise.all(
      (data || []).map(async (item: any) => {
        const tag = item.tags;
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

    return tags;
  }

  /**
   * Get all content items with a specific tag
   */
  async getContentByTag(tagId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('content_tags')
      .select('*')
      .eq('tag_id', tagId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Fetch details from collections table for each content item
    const contentDetails = await Promise.all(
      (data || []).map(async (item) => {
        const { data: contentData } = await supabase
          .from('collections')
          .select(`
            id,
            tmdb_id,
            type,
            title,
            release_year,
            poster_path,
            user_rating,
            user_notes
          `)
          .eq('tmdb_id', item.content_id)
          .eq('type', item.content_type)
          .eq('user_id', user.id)
          .single();

        return {
          id: item.id,
          tag_id: item.tag_id,
          content_id: item.content_id,
          content_type: item.content_type,
          title: contentData?.title || 'Unknown',
          year: contentData?.release_year,
          poster_path: contentData?.poster_path,
          user_rating: contentData?.user_rating,
          user_notes: contentData?.user_notes,
          created_at: item.created_at
        };
      })
    );

    return contentDetails;
  }

  /**
   * Set tags for a content item (replace all existing)
   */
  async setTagsForContent(
    contentId: number,
    contentType: 'movie' | 'tv',
    tagIds: string[]
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Remove all existing tags for this content
    await supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    // Add new tags
    if (tagIds.length > 0) {
      const inserts = tagIds.map(tagId => ({
        tag_id: tagId,
        content_id: contentId,
        content_type: contentType,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('content_tags')
        .insert(inserts);

      if (error) throw error;
    }
  }

  /**
   * Add multiple tags to a content item
   */
  async addTagsToContent(
    contentId: number,
    contentType: 'movie' | 'tv',
    tagIds: string[]
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const inserts = tagIds.map(tagId => ({
      tag_id: tagId,
      content_id: contentId,
      content_type: contentType,
      user_id: user.id
    }));

    const { error } = await supabase
      .from('content_tags')
      .insert(inserts);

    if (error) throw error;
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(20);

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
   * Merge two tags (move all content from source to target, then delete source)
   */
  async mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all content tagged with source
    const { data: sourceContent } = await supabase
      .from('content_tags')
      .select('content_id, content_type')
      .eq('tag_id', sourceTagId)
      .eq('user_id', user.id);

    if (sourceContent && sourceContent.length > 0) {
      for (const content of sourceContent) {
        // Check if already tagged with target
        const { data: existing } = await supabase
          .from('content_tags')
          .select('id')
          .eq('tag_id', targetTagId)
          .eq('content_id', content.content_id)
          .eq('content_type', content.content_type)
          .single();

        if (!existing) {
          // Update to target tag
          await supabase
            .from('content_tags')
            .update({ tag_id: targetTagId })
            .eq('tag_id', sourceTagId)
            .eq('content_id', content.content_id)
            .eq('content_type', content.content_type);
        } else {
          // Already tagged, just delete duplicate
          await supabase
            .from('content_tags')
            .delete()
            .eq('tag_id', sourceTagId)
            .eq('content_id', content.content_id)
            .eq('content_type', content.content_type);
        }
      }
    }

    // Delete source tag
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

    // Get total content tags (usage)
    const { count: totalUsage } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get tags by category
    const { data: tagsByCategory } = await supabase
      .from('tags')
      .select('category_id')
      .eq('user_id', user.id);

    const categoryCounts: Record<number, number> = {};
    tagsByCategory?.forEach(tag => {
      categoryCounts[tag.category_id] = (categoryCounts[tag.category_id] || 0) + 1;
    });

    return {
      total_tags: totalTags || 0,
      total_usage: totalUsage || 0,
      tags_by_category: categoryCounts
    };
  }
}

export const tagsService = new TagsService();