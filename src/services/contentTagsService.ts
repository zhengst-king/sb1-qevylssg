// src/services/contentTagsService.ts
// Service layer for managing tag-content associations (many-to-many relationships)

import { supabase } from '../lib/supabase';
import type { Tag } from '../types/customCollections';

export interface ContentTag {
  id: string;
  tag_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  user_id: string;
  created_at: string;
}

export interface TaggedContent {
  id: string;
  tag_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  title: string;
  year?: number;
  poster_path?: string;
  user_rating?: number;
  user_notes?: string;
  created_at: string;
}

class ContentTagsService {
  /**
   * Add a tag to a content item (movie or TV show)
   */
  async addTagToContent(
    tagId: string,
    contentId: number,
    contentType: 'movie' | 'tv'
  ): Promise<ContentTag> {
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
      throw new Error('This content is already tagged with this tag');
    }

    const { data, error } = await supabase
      .from('content_tags')
      .insert({
        tag_id: tagId,
        content_id: contentId,
        content_type: contentType,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return data;
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
   * Remove a content tag by its ID (alternative removal method)
   */
  async removeContentTagById(contentTagId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_tags')
      .delete()
      .eq('id', contentTagId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get all tags for a specific content item
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

    // Extract and enrich tags with usage counts
    const tags = await Promise.all(
      (data || []).map(async (item: any) => {
        const tag = item.tags;
        
        // Get usage count for this tag
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
   * Get all content items that have a specific tag
   */
  async getContentByTag(tagId: string): Promise<TaggedContent[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all content_tags for this tag
    const { data: taggedItems, error } = await supabase
      .from('content_tags')
      .select('*')
      .eq('tag_id', tagId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!taggedItems || taggedItems.length === 0) {
      return [];
    }

    // Fetch details for each content item from collections table
    const contentDetails = await Promise.all(
      taggedItems.map(async (item) => {
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
          title: contentData?.title || 'Unknown Title',
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
   * Set tags for a content item (replace all existing tags with new ones)
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

    // Add new tags if any
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
   * Add multiple tags to a content item at once
   */
  async addTagsToContent(
    contentId: number,
    contentType: 'movie' | 'tv',
    tagIds: string[]
  ): Promise<ContentTag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (tagIds.length === 0) {
      return [];
    }

    const inserts = tagIds.map(tagId => ({
      tag_id: tagId,
      content_id: contentId,
      content_type: contentType,
      user_id: user.id
    }));

    const { data, error } = await supabase
      .from('content_tags')
      .insert(inserts)
      .select();

    if (error) {
      // If some tags already exist, filter them out and retry
      if (error.code === '23505') {
        // Get existing tags
        const { data: existing } = await supabase
          .from('content_tags')
          .select('tag_id')
          .eq('content_id', contentId)
          .eq('content_type', contentType)
          .in('tag_id', tagIds)
          .eq('user_id', user.id);

        const existingTagIds = new Set(existing?.map(ct => ct.tag_id) || []);
        const newTagIds = tagIds.filter(id => !existingTagIds.has(id));

        if (newTagIds.length === 0) {
          throw new Error('All tags are already applied to this content');
        }

        // Retry with only new tags
        const newInserts = newTagIds.map(tagId => ({
          tag_id: tagId,
          content_id: contentId,
          content_type: contentType,
          user_id: user.id
        }));

        const { data: retryData, error: retryError } = await supabase
          .from('content_tags')
          .insert(newInserts)
          .select();

        if (retryError) throw retryError;
        return retryData || [];
      }
      throw error;
    }

    return data || [];
  }

  /**
   * Remove all tags from a content item
   */
  async removeAllTagsFromContent(
    contentId: number,
    contentType: 'movie' | 'tv'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get content that has ALL of the specified tags (AND logic)
   */
  async getContentByMultipleTags(
    tagIds: string[],
    contentType?: 'movie' | 'tv'
  ): Promise<TaggedContent[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (tagIds.length === 0) {
      return [];
    }

    // Get all content_tags for these tags
    let query = supabase
      .from('content_tags')
      .select('content_id, content_type, tag_id')
      .in('tag_id', tagIds)
      .eq('user_id', user.id);

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    const { data: taggedItems, error } = await query;

    if (error) throw error;

    // Group by content and count how many tags each has
    const contentCounts = new Map<string, { count: number; content_id: number; content_type: 'movie' | 'tv' }>();
    
    taggedItems?.forEach(item => {
      const key = `${item.content_id}-${item.content_type}`;
      const existing = contentCounts.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        contentCounts.set(key, {
          count: 1,
          content_id: item.content_id,
          content_type: item.content_type
        });
      }
    });

    // Filter to only content that has ALL tags
    const matchingContent = Array.from(contentCounts.values())
      .filter(item => item.count === tagIds.length);

    if (matchingContent.length === 0) {
      return [];
    }

    // Fetch full details for matching content
    const contentDetails = await Promise.all(
      matchingContent.map(async (item) => {
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
          id: contentData?.id || '',
          tag_id: tagIds[0], // First tag ID as representative
          content_id: item.content_id,
          content_type: item.content_type,
          title: contentData?.title || 'Unknown Title',
          year: contentData?.release_year,
          poster_path: contentData?.poster_path,
          user_rating: contentData?.user_rating,
          user_notes: contentData?.user_notes,
          created_at: contentData?.created_at || new Date().toISOString()
        };
      })
    );

    return contentDetails;
  }

  /**
   * Get content that has ANY of the specified tags (OR logic)
   */
  async getContentByAnyTag(
    tagIds: string[],
    contentType?: 'movie' | 'tv'
  ): Promise<TaggedContent[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (tagIds.length === 0) {
      return [];
    }

    // Get all content_tags for these tags
    let query = supabase
      .from('content_tags')
      .select('*')
      .in('tag_id', tagIds)
      .eq('user_id', user.id);

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    const { data: taggedItems, error } = await query;

    if (error) throw error;

    if (!taggedItems || taggedItems.length === 0) {
      return [];
    }

    // Get unique content (remove duplicates)
    const uniqueContent = new Map<string, typeof taggedItems[0]>();
    taggedItems.forEach(item => {
      const key = `${item.content_id}-${item.content_type}`;
      if (!uniqueContent.has(key)) {
        uniqueContent.set(key, item);
      }
    });

    // Fetch details for each unique content item
    const contentDetails = await Promise.all(
      Array.from(uniqueContent.values()).map(async (item) => {
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
          title: contentData?.title || 'Unknown Title',
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
   * Check if content has a specific tag
   */
  async hasTag(
    contentId: number,
    contentType: 'movie' | 'tv',
    tagId: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data } = await supabase
      .from('content_tags')
      .select('id')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('tag_id', tagId)
      .eq('user_id', user.id)
      .single();

    return !!data;
  }

  /**
   * Get tag usage statistics
   */
  async getTagUsageStats(tagId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Count movies
    const { count: movieCount } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)
      .eq('content_type', 'movie')
      .eq('user_id', user.id);

    // Count TV shows
    const { count: tvCount } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)
      .eq('content_type', 'tv')
      .eq('user_id', user.id);

    return {
      total: (movieCount || 0) + (tvCount || 0),
      movies: movieCount || 0,
      tv_shows: tvCount || 0
    };
  }

  /**
   * Copy tags from one content item to another
   */
  async copyTagsToContent(
    sourceContentId: number,
    sourceContentType: 'movie' | 'tv',
    targetContentId: number,
    targetContentType: 'movie' | 'tv'
  ): Promise<void> {
    // Get tags from source
    const sourceTags = await this.getTagsForContent(sourceContentId, sourceContentType);
    
    // Apply to target
    if (sourceTags.length > 0) {
      const tagIds = sourceTags.map(tag => tag.id);
      await this.addTagsToContent(targetContentId, targetContentType, tagIds);
    }
  }

  /**
   * Copy tags from one content item to another
   */
  async copyTagsToContent(
    sourceContentId: number,
    sourceContentType: 'movie' | 'tv',
    targetContentId: number,
    targetContentType: 'movie' | 'tv'
  ): Promise<void> {
    // Get tags from source
    const sourceTags = await this.getTagsForContent(sourceContentId, sourceContentType);
    
    // Apply to target
    if (sourceTags.length > 0) {
      const tagIds = sourceTags.map(tag => tag.id);
      await this.addTagsToContent(targetContentId, targetContentType, tagIds);
    }
  }

  /**
   * Get content_tags records with full metadata for a specific content item
   * Returns the content_tags records (not just the tags) including start_time, end_time, notes
   */
  async getContentTagsForItem(
    contentId: number,
    contentType: 'movie' | 'tv'
  ): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('content_tags')
      .select(`
        id,
        tag_id,
        content_id,
        content_type,
        start_time,
        end_time,
        notes,
        created_at,
        updated_at,
        tags (*)
      `)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update metadata for an assigned tag (content_tags record)
   */
  /**
   * Update metadata for an assigned tag (content_tags record)
   */
  async updateAssignedTagMetadata(
    contentTagId: string,
    metadata: {
      start_time?: string | null;
      end_time?: string | null;
      notes?: string | null;
    }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('[updateAssignedTagMetadata] Updating content_tag:', contentTagId);
    console.log('[updateAssignedTagMetadata] With metadata:', metadata);

    const { data, error } = await supabase
      .from('content_tags')
      .update({
        start_time: metadata.start_time,
        end_time: metadata.end_time,
        notes: metadata.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentTagId)
      .eq('user_id', user.id)
      .select();

    console.log('[updateAssignedTagMetadata] Update result:', { data, error });

    if (error) {
      console.error('[updateAssignedTagMetadata] Error:', error);
      throw error;
    }
    
    console.log('[updateAssignedTagMetadata] Update successful!');
  }

  /**
   * Get a single assigned tag with full metadata
   */
  async getAssignedTag(contentTagId: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('content_tags')
      .select(`
        id,
        tag_id,
        content_id,
        content_type,
        start_time,
        end_time,
        notes,
        created_at,
        updated_at,
        tags (*)
      `)
      .eq('id', contentTagId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  }
}

export const contentTagsService = new ContentTagsService();