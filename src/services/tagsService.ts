// src/services/tagsService.ts
// Service for Tags CRUD operations and associations

import { supabase } from '../lib/supabase';
import type {
  Tag,
  CreateTagDTO,
  UpdateTagDTO,
  TagStats,
  TagCategory
} from '../types/customCollections';

export const tagsService = {
  /**
   * Get all tags for the current user
   */
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a single tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tag:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get tags by category
   */
  async getTagsByCategory(category: TagCategory): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags by category:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get most used tags
   */
  async getMostUsedTags(limit: number = 10): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching most used tags:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Create a new tag
   */
  async createTag(tagData: CreateTagDTO): Promise<Tag> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }

    // Check if tag with same name already exists
    const { data: existingTag } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userData.user.id)
      .ilike('name', tagData.name)
      .single();

    if (existingTag) {
      return existingTag; // Return existing tag instead of creating duplicate
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: userData.user.id,
        name: tagData.name.trim(),
        color: tagData.color || '#6B7280',
        category: tagData.category || 'other',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create multiple tags at once (returns existing or creates new)
   */
  async createTags(tagNames: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];
    
    for (const name of tagNames) {
      const tag = await this.createTag({ name: name.trim() });
      tags.push(tag);
    }

    return tags;
  },

  /**
   * Update a tag
   */
  async updateTag(id: string, updates: UpdateTagDTO): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  },

  /**
   * Add a tag to an item
   */
  async addTagToItem(collectionItemId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('collection_items_tags')
      .insert({
        collection_item_id: collectionItemId,
        tag_id: tagId,
      });

    if (error) {
      console.error('Error adding tag to item:', error);
      throw error;
    }
  },

  /**
   * Add multiple tags to an item
   */
  async addTagsToItem(collectionItemId: string, tagIds: string[]): Promise<void> {
    const insertData = tagIds.map(tagId => ({
      collection_item_id: collectionItemId,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('collection_items_tags')
      .insert(insertData);

    if (error) {
      console.error('Error adding tags to item:', error);
      throw error;
    }
  },

  /**
   * Add a tag to multiple items (bulk operation)
   */
  async addTagToItems(collectionItemIds: string[], tagId: string): Promise<void> {
    const insertData = collectionItemIds.map(itemId => ({
      collection_item_id: itemId,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('collection_items_tags')
      .insert(insertData);

    if (error) {
      console.error('Error adding tag to items:', error);
      throw error;
    }
  },

  /**
   * Remove a tag from an item
   */
  async removeTagFromItem(collectionItemId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('collection_items_tags')
      .delete()
      .eq('collection_item_id', collectionItemId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('Error removing tag from item:', error);
      throw error;
    }
  },

  /**
   * Remove all tags from an item
   */
  async removeAllTagsFromItem(collectionItemId: string): Promise<void> {
    const { error } = await supabase
      .from('collection_items_tags')
      .delete()
      .eq('collection_item_id', collectionItemId);

    if (error) {
      console.error('Error removing all tags from item:', error);
      throw error;
    }
  },

  /**
   * Get tags for a specific item
   */
  async getTagsForItem(collectionItemId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('collection_items_tags')
      .select(`
        tag:tags(*)
      `)
      .eq('collection_item_id', collectionItemId);

    if (error) {
      console.error('Error fetching tags for item:', error);
      throw error;
    }

    return data?.map(item => item.tag).filter(Boolean) || [];
  },

  /**
   * Get items with a specific tag
   */
  async getItemsWithTag(tagId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('collection_items_tags')
      .select(`
        collection_item:physical_media_collection(*)
      `)
      .eq('tag_id', tagId);

    if (error) {
      console.error('Error fetching items with tag:', error);
      throw error;
    }

    return data?.map(item => item.collection_item).filter(Boolean) || [];
  },

  /**
   * Search tags by name
   */
  async searchTags(query: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching tags:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get tag statistics
   */
  async getTagStats(): Promise<TagStats> {
    const tags = await this.getTags();
    
    const totalTags = tags.length;
    
    const tagsByCategory: Record<TagCategory, number> = {
      genre: 0,
      mood: 0,
      theme: 0,
      occasion: 0,
      quality: 0,
      format_detail: 0,
      collection_status: 0,
      personal: 0,
      other: 0,
    };
    
    tags.forEach(tag => {
      tagsByCategory[tag.category] = (tagsByCategory[tag.category] || 0) + 1;
    });
    
    const mostUsedTags = await this.getMostUsedTags(10);
    
    // Calculate average tags per item
    const { count, error } = await supabase
      .from('collection_items_tags')
      .select('*', { count: 'exact', head: true });

    const totalTagAssignments = count || 0;
    
    const { count: itemCount } = await supabase
      .from('physical_media_collection')
      .select('*', { count: 'exact', head: true });

    const totalItems = itemCount || 1;
    const averageTagsPerItem = totalTagAssignments / totalItems;

    return {
      totalTags,
      tagsByCategory,
      mostUsedTags,
      averageTagsPerItem,
    };
  },

  /**
   * Merge two tags (combines them into one)
   */
  async mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
    // Get all items with source tag
    const { data: itemsWithSourceTag, error: fetchError } = await supabase
      .from('collection_items_tags')
      .select('collection_item_id')
      .eq('tag_id', sourceTagId);

    if (fetchError) {
      throw fetchError;
    }

    // Add target tag to all items (will be ignored if already exists due to unique constraint)
    if (itemsWithSourceTag && itemsWithSourceTag.length > 0) {
      for (const item of itemsWithSourceTag) {
        try {
          await this.addTagToItem(item.collection_item_id, targetTagId);
        } catch (error) {
          // Ignore duplicate errors
        }
      }
    }

    // Delete source tag (cascade will remove all associations)
    await this.deleteTag(sourceTagId);
  },

  /**
   * Get or create tag by name (useful for quick tagging)
   */
  async getOrCreateTag(name: string, category?: TagCategory): Promise<Tag> {
    const trimmedName = name.trim();
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }

    // Try to find existing tag
    const { data: existingTag } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userData.user.id)
      .ilike('name', trimmedName)
      .single();

    if (existingTag) {
      return existingTag;
    }

    // Create new tag
    return this.createTag({ name: trimmedName, category });
  },

  /**
   * Bulk set tags for an item (replaces all existing tags)
   */
  async setTagsForItem(collectionItemId: string, tagIds: string[]): Promise<void> {
    // Remove all existing tags
    await this.removeAllTagsFromItem(collectionItemId);
    
    // Add new tags
    if (tagIds.length > 0) {
      await this.addTagsToItem(collectionItemId, tagIds);
    }
  },
};