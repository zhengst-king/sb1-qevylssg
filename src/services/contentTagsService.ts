// src/services/contentTagsService.ts
// Service layer for managing tag-content associations (many-to-many relationships)

import { supabase } from '../lib/supabase';
import type { Tag } from '../types/customCollections';

export interface ContentTag {
  id: string;
  tag_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  season_number?: number | null;
  episode_number?: number | null;
  user_id: string;
  created_at: string;
}

export interface TaggedContent {
  id: string;
  tag_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  season_number?: number | null;
  episode_number?: number | null;
  title: string;
  year?: number;
  poster_path?: string;
  user_rating?: number;
  user_notes?: string;
  created_at: string;
}

class ContentTagsService {
  /**
   * Add a tag to content (movie, TV series, or TV episode)
   */
  async addTagToContent(
    tagId: string,
    contentId: number,
    contentType: 'movie' | 'tv',
    episodeInfo?: { season: number; episode: number }
  ): Promise<ContentTag> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('[addTagToContent] Adding tag:', { tagId, contentId, contentType, episodeInfo });

    // Check if already tagged
    let checkQuery = supabase
      .from('content_tags')
      .select('id')
      .eq('tag_id', tagId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (episodeInfo) {
      checkQuery = checkQuery
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      checkQuery = checkQuery
        .is('season_number', null)
        .is('episode_number', null);
    }

    const { data: existing } = await checkQuery.single();

    if (existing) {
      console.log('[addTagToContent] Tag already exists:', existing);
      throw new Error('This content is already tagged with this tag');
    }

    const insertData: any = {
      tag_id: tagId,
      content_id: contentId,
      content_type: contentType,
      user_id: user.id
    };

    // Add episode info if provided
    if (episodeInfo) {
      insertData.season_number = episodeInfo.season;
      insertData.episode_number = episodeInfo.episode;
    }

    console.log('[addTagToContent] Inserting:', insertData);

    const { data, error } = await supabase
      .from('content_tags')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[addTagToContent] Database error:', error);
      console.error('[addTagToContent] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('[addTagToContent] Successfully added:', data);
    return data;
  }

  /**
   * Remove a tag from content
   */
  async removeTagFromContent(
    tagId: string,
    contentId: number,
    contentType: 'movie' | 'tv',
    episodeInfo?: { season: number; episode: number }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('content_tags')
      .delete()
      .eq('tag_id', tagId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    // Filter by episode if provided
    if (episodeInfo) {
      query = query
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      query = query
        .is('season_number', null)
        .is('episode_number', null);
    }

    const { error } = await query;
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
    contentType: 'movie' | 'tv',
    episodeInfo?: { season: number; episode: number }
  ): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('content_tags')
      .select(`
        tag_id,
        tags (*)
      `)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    // Filter by episode if provided
    if (episodeInfo) {
      query = query
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      query = query
        .is('season_number', null)
        .is('episode_number', null);
    }

    const { data, error } = await query;

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
          season_number: item.season_number,
          episode_number: item.episode_number,
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
    tagIds: string[],
    episodeInfo?: { season: number; episode: number }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Remove all existing tags for this content
    let deleteQuery = supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (episodeInfo) {
      deleteQuery = deleteQuery
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      deleteQuery = deleteQuery
        .is('season_number', null)
        .is('episode_number', null);
    }

    await deleteQuery;

    // Add new tags if any
    if (tagIds.length > 0) {
      const inserts = tagIds.map(tagId => {
        const record: any = {
          tag_id: tagId,
          content_id: contentId,
          content_type: contentType,
          user_id: user.id
        };

        if (episodeInfo) {
          record.season_number = episodeInfo.season;
          record.episode_number = episodeInfo.episode;
        }

        return record;
      });

      const { error } = await supabase
        .from('content_tags')
        .insert(inserts);

      if (error) throw error;
    }
  }

  /**
   * Add multiple tags to content at once
   */
  async addTagsToContent(
    contentId: number,
    contentType: 'movie' | 'tv',
    tagIds: string[],
    episodeInfo?: { season: number; episode: number }
  ): Promise<ContentTag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (tagIds.length === 0) {
      return [];
    }

    const inserts = tagIds.map(tagId => {
      const record: any = {
        tag_id: tagId,
        content_id: contentId,
        content_type: contentType,
        user_id: user.id
      };

      if (episodeInfo) {
        record.season_number = episodeInfo.season;
        record.episode_number = episodeInfo.episode;
      }

      return record;
    });

    const { data, error } = await supabase
      .from('content_tags')
      .insert(inserts)
      .select();

    if (error) {
      // If some tags already exist, filter them out and retry
      if (error.code === '23505') {
        // Get existing tags
        let existingQuery = supabase
          .from('content_tags')
          .select('tag_id')
          .eq('content_id', contentId)
          .eq('content_type', contentType)
          .in('tag_id', tagIds)
          .eq('user_id', user.id);

        if (episodeInfo) {
          existingQuery = existingQuery
            .eq('season_number', episodeInfo.season)
            .eq('episode_number', episodeInfo.episode);
        } else {
          existingQuery = existingQuery
            .is('season_number', null)
            .is('episode_number', null);
        }

        const { data: existing } = await existingQuery;

        const existingTagIds = new Set(existing?.map(ct => ct.tag_id) || []);
        const newTagIds = tagIds.filter(id => !existingTagIds.has(id));

        if (newTagIds.length === 0) {
          throw new Error('All tags are already applied to this content');
        }

        // Retry with only new tags
        const newInserts = newTagIds.map(tagId => {
          const record: any = {
            tag_id: tagId,
            content_id: contentId,
            content_type: contentType,
            user_id: user.id
          };

          if (episodeInfo) {
            record.season_number = episodeInfo.season;
            record.episode_number = episodeInfo.episode;
          }

          return record;
        });

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
    contentType: 'movie' | 'tv',
    episodeInfo?: { season: number; episode: number }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    if (episodeInfo) {
      query = query
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      query = query
        .is('season_number', null)
        .is('episode_number', null);
    }

    const { error } = await query;
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
      .select('content_id, content_type, tag_id, season_number, episode_number')
      .in('tag_id', tagIds)
      .eq('user_id', user.id);

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    const { data: taggedItems, error } = await query;

    if (error) throw error;

    // Group by content and count how many tags each has
    const contentCounts = new Map<string, { 
      count: number; 
      content_id: number; 
      content_type: 'movie' | 'tv';
      season_number?: number | null;
      episode_number?: number | null;
    }>();
    
    taggedItems?.forEach(item => {
      const key = `${item.content_id}-${item.content_type}-${item.season_number || 'null'}-${item.episode_number || 'null'}`;
      const existing = contentCounts.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        contentCounts.set(key, {
          count: 1,
          content_id: item.content_id,
          content_type: item.content_type,
          season_number: item.season_number,
          episode_number: item.episode_number
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
          season_number: item.season_number,
          episode_number: item.episode_number,
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
      const key = `${item.content_id}-${item.content_type}-${item.season_number || 'null'}-${item.episode_number || 'null'}`;
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
          season_number: item.season_number,
          episode_number: item.episode_number,
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
    tagId: string,
    episodeInfo?: { season: number; episode: number }
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('content_tags')
      .select('id')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('tag_id', tagId)
      .eq('user_id', user.id);

    if (episodeInfo) {
      query = query
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      query = query
        .is('season_number', null)
        .is('episode_number', null);
    }

    const { data } = await query.single();

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

    // Count TV shows (series-level only)
    const { count: tvCount } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)
      .eq('content_type', 'tv')
      .is('season_number', null)
      .is('episode_number', null)
      .eq('user_id', user.id);

    // Count TV episodes
    const { count: episodeCount } = await supabase
      .from('content_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)
      .eq('content_type', 'tv')
      .not('season_number', 'is', null)
      .not('episode_number', 'is', null)
      .eq('user_id', user.id);

    return {
      total: (movieCount || 0) + (tvCount || 0) + (episodeCount || 0),
      movies: movieCount || 0,
      tv_shows: tvCount || 0,
      tv_episodes: episodeCount || 0
    };
  }

  /**
   * Copy tags from one content item to another
   */
  async copyTagsToContent(
    sourceContentId: number,
    sourceContentType: 'movie' | 'tv',
    targetContentId: number,
    targetContentType: 'movie' | 'tv',
    sourceEpisodeInfo?: { season: number; episode: number },
    targetEpisodeInfo?: { season: number; episode: number }
  ): Promise<void> {
    // Get tags from source
    const sourceTags = await this.getTagsForContent(
      sourceContentId, 
      sourceContentType,
      sourceEpisodeInfo
    );
    
    // Apply to target
    if (sourceTags.length > 0) {
      const tagIds = sourceTags.map(tag => tag.id);
      await this.addTagsToContent(
        targetContentId, 
        targetContentType, 
        tagIds,
        targetEpisodeInfo
      );
    }
  }

  /**
   * Get all content_tags records for a specific content item (with tag details)
   * Optionally filter by episode
   */
  async getContentTagsForItem(
    contentId: number,
    contentType: 'movie' | 'tv',
    episodeInfo?: { season: number; episode: number }
  ): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('content_tags')
      .select(`
        id,
        tag_id,
        start_time,
        end_time,
        notes,
        created_at,
        season_number,
        episode_number,
        tags (
          id,
          name,
          description,
          color,
          category_id,
          subcategory_id,
          is_public,
          usage_count
        )
      `)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('user_id', user.id);

    // Filter by episode if provided
    if (episodeInfo) {
      query = query
        .eq('season_number', episodeInfo.season)
        .eq('episode_number', episodeInfo.episode);
    } else {
      // If no episode info, only get series-level tags (where season/episode are NULL)
      query = query
        .is('season_number', null)
        .is('episode_number', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

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
        season_number,
        episode_number,
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