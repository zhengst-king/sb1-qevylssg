// src/services/customCollectionsService.ts
// Service for Custom Collections CRUD operations and associations

import { supabase } from '../lib/supabase';
import type {
  CustomCollection,
  CreateCustomCollectionDTO,
  UpdateCustomCollectionDTO,
  CustomCollectionStats
} from '../types/customCollections';

export const customCollectionsService = {
  /**
   * Get all custom collections for the current user
   */
  async getCustomCollections(): Promise<CustomCollection[]> {
    const { data, error } = await supabase
      .from('custom_collections')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching custom collections:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a single custom collection by ID
   */
  async getCustomCollectionById(id: string): Promise<CustomCollection | null> {
    const { data, error } = await supabase
      .from('custom_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching custom collection:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get custom collections with their items
   */
  async getCustomCollectionsWithItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('custom_collections')
      .select(`
        *,
        collection_items:collection_items_custom_collections(
          movie:movies(*)
        )
      `)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching custom collections with items:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get items in a specific custom collection
   */
  async getItemsInCollection(customCollectionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('collection_items_custom_collections')
      .select(`
        collection_item_id,
        display_order,
        added_at,
        movie:movies(*)
      `)
      .eq('custom_collection_id', customCollectionId)
      .order('display_order', { ascending: true })
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching items in collection:', error);
      throw error;
    }

    return data?.map(item => item.movie) || [];
  },

  /**
   * Create a new custom collection
   */
  async createCustomCollection(
    collectionData: CreateCustomCollectionDTO
  ): Promise<CustomCollection> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('custom_collections')
      .insert({
        user_id: userData.user.id,
        name: collectionData.name,
        description: collectionData.description || null,
        color: collectionData.color || '#3B82F6',
        icon: collectionData.icon || 'folder',
        is_favorite: collectionData.is_favorite || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom collection:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a custom collection
   */
  async updateCustomCollection(
    id: string,
    updates: UpdateCustomCollectionDTO
  ): Promise<CustomCollection> {
    const { data, error } = await supabase
      .from('custom_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom collection:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a custom collection
   */
  async deleteCustomCollection(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_collections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting custom collection:', error);
      throw error;
    }
  },

  /**
   * Add a movie to a custom collection
   * @param movieId - ID from the movies table (watchlist)
   * @param customCollectionId - ID of the custom collection
   */
  async addItemToCollection(
    collectionItemId: string,
    customCollectionId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('collection_items_custom_collections')
      .insert({
        collection_item_id: collectionItemId,
        custom_collection_id: customCollectionId,
      });

    if (error) {
      console.error('Error adding item to collection:', error);
      throw error;
    }
  },

  /**
   * Add multiple movies to a custom collection (bulk operation)
   * @param movieIds - Array of IDs from the movies table (watchlist)
   * @param customCollectionId - ID of the custom collection
   */
  async addItemsToCollection(
    collectionItemIds: string[],
    customCollectionId: string
  ): Promise<void> {
    const insertData = collectionItemIds.map(itemId => ({
      collection_item_id: itemId,
      custom_collection_id: customCollectionId,
    }));

    const { error } = await supabase
      .from('collection_items_custom_collections')
      .insert(insertData);

    if (error) {
      console.error('Error adding items to collection:', error);
      throw error;
    }
  },

  /**
   * Remove a movie from a custom collection
   * @param movieId - ID from the movies table
   * @param customCollectionId - ID of the custom collection
   */
  async removeItemFromCollection(
    collectionItemId: string,
    customCollectionId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('collection_items_custom_collections')
      .delete()
      .eq('collection_item_id', collectionItemId)
      .eq('custom_collection_id', customCollectionId);

    if (error) {
      console.error('Error removing item from collection:', error);
      throw error;
    }
  },

  /**
   * Get custom collections that contain a specific movie
   * @param movieId - ID from the movies table
   */
  async getCollectionsForItem(collectionItemId: string): Promise<CustomCollection[]> {
    const { data, error } = await supabase
      .from('collection_items_custom_collections')
      .select(`
        custom_collection:custom_collections(*)
      `)
      .eq('collection_item_id', collectionItemId);

    if (error) {
      console.error('Error fetching collections for item:', error);
      throw error;
    }

    return data?.map(item => item.custom_collection).filter(Boolean) || [];
  },

  /**
   * Toggle favorite status of a custom collection
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<CustomCollection> {
    return this.updateCustomCollection(id, { is_favorite: isFavorite });
  },

  /**
   * Reorder custom collections
   */
  async reorderCollections(collectionOrders: { id: string; display_order: number }[]): Promise<void> {
    const updates = collectionOrders.map(({ id, display_order }) =>
      supabase
        .from('custom_collections')
        .update({ display_order })
        .eq('id', id)
    );

    await Promise.all(updates);
  },

  /**
   * Get statistics about custom collections
   */
  async getCustomCollectionStats(): Promise<CustomCollectionStats> {
    const collections = await this.getCustomCollections();
    
    const totalCollections = collections.length;
    const favoriteCollections = collections.filter(c => c.is_favorite).length;
    const totalItems = collections.reduce((sum, c) => sum + c.item_count, 0);
    const averageItemsPerCollection = totalCollections > 0 
      ? totalItems / totalCollections 
      : 0;
    const largestCollection = collections.reduce((max, c) => 
      c.item_count > (max?.item_count || 0) ? c : max, 
      collections[0]
    );

    return {
      totalCollections,
      favoriteCollections,
      averageItemsPerCollection,
      largestCollection,
    };
  },

  /**
   * Search custom collections by name
   */
  async searchCustomCollections(query: string): Promise<CustomCollection[]> {
    const { data, error } = await supabase
      .from('custom_collections')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching custom collections:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Duplicate a custom collection
   */
  async duplicateCollection(
    sourceCollectionId: string,
    newName: string
  ): Promise<CustomCollection> {
    // Get source collection
    const sourceCollection = await this.getCustomCollectionById(sourceCollectionId);
    if (!sourceCollection) {
      throw new Error('Source collection not found');
    }

    // Get items in source collection
    const { data: items, error: itemsError } = await supabase
      .from('collection_items_custom_collections')
      .select('collection_item_id')
      .eq('custom_collection_id', sourceCollectionId);

    if (itemsError) {
      throw itemsError;
    }

    // Create new collection
    const newCollection = await this.createCustomCollection({
      name: newName,
      description: sourceCollection.description,
      color: sourceCollection.color,
      icon: sourceCollection.icon,
      is_favorite: false,
    });

    // Add items to new collection
    if (items && items.length > 0) {
      await this.addItemsToCollection(
        items.map(item => item.collection_item_id),
        newCollection.id
      );
    }

    return newCollection;
  },
};