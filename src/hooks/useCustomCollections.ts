// src/hooks/useCustomCollections.ts
// React hook for managing custom collections

import { useState, useEffect, useCallback } from 'react';
import { customCollectionsService } from '../services/customCollectionsService';
import type {
  CustomCollection,
  CreateCustomCollectionDTO,
  UpdateCustomCollectionDTO,
  CustomCollectionStats
} from '../types/customCollections';

export const useCustomCollections = () => {
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all custom collections
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customCollectionsService.getCustomCollections();
      setCollections(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching custom collections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load collections on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Create a new custom collection
  const createCollection = useCallback(
    async (collectionData: CreateCustomCollectionDTO): Promise<CustomCollection> => {
      try {
        const newCollection = await customCollectionsService.createCustomCollection(collectionData);
        setCollections(prev => [...prev, newCollection]);
        return newCollection;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Update a custom collection
  const updateCollection = useCallback(
    async (id: string, updates: UpdateCustomCollectionDTO): Promise<CustomCollection> => {
      try {
        const updatedCollection = await customCollectionsService.updateCustomCollection(id, updates);
        setCollections(prev =>
          prev.map(c => (c.id === id ? updatedCollection : c))
        );
        return updatedCollection;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Delete a custom collection
  const deleteCollection = useCallback(async (id: string): Promise<void> => {
    try {
      await customCollectionsService.deleteCustomCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Add an item to a collection
  const addItemToCollection = useCallback(
    async (collectionItemId: string, customCollectionId: string): Promise<void> => {
      try {
        await customCollectionsService.addItemToCollection(collectionItemId, customCollectionId);
        // Update item count
        setCollections(prev =>
          prev.map(c =>
            c.id === customCollectionId
              ? { ...c, item_count: c.item_count + 1 }
              : c
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Add multiple items to a collection
  const addItemsToCollection = useCallback(
    async (collectionItemIds: string[], customCollectionId: string): Promise<void> => {
      try {
        await customCollectionsService.addItemsToCollection(collectionItemIds, customCollectionId);
        // Update item count
        setCollections(prev =>
          prev.map(c =>
            c.id === customCollectionId
              ? { ...c, item_count: c.item_count + collectionItemIds.length }
              : c
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Remove an item from a collection
  const removeItemFromCollection = useCallback(
    async (collectionItemId: string, customCollectionId: string): Promise<void> => {
      try {
        await customCollectionsService.removeItemFromCollection(collectionItemId, customCollectionId);
        // Update item count
        setCollections(prev =>
          prev.map(c =>
            c.id === customCollectionId
              ? { ...c, item_count: Math.max(0, c.item_count - 1) }
              : c
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      const collection = collections.find(c => c.id === id);
      if (!collection) return;

      try {
        await updateCollection(id, { is_favorite: !collection.is_favorite });
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [collections, updateCollection]
  );

  // Duplicate a collection
  const duplicateCollection = useCallback(
    async (sourceCollectionId: string, newName: string): Promise<CustomCollection> => {
      try {
        const newCollection = await customCollectionsService.duplicateCollection(
          sourceCollectionId,
          newName
        );
        setCollections(prev => [...prev, newCollection]);
        return newCollection;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Get items in a collection
  const getItemsInCollection = useCallback(
    async (customCollectionId: string) => {
      try {
        return await customCollectionsService.getItemsInCollection(customCollectionId);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Search collections
  const searchCollections = useCallback(
    (query: string): CustomCollection[] => {
      const lowerQuery = query.toLowerCase();
      return collections.filter(
        c =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.description?.toLowerCase().includes(lowerQuery)
      );
    },
    [collections]
  );

  // Get favorite collections
  const favoriteCollections = collections.filter(c => c.is_favorite);

  // Get collection by ID
  const getCollectionById = useCallback(
    (id: string): CustomCollection | undefined => {
      return collections.find(c => c.id === id);
    },
    [collections]
  );

  return {
    collections,
    favoriteCollections,
    loading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    addItemsToCollection,
    removeItemFromCollection,
    toggleFavorite,
    duplicateCollection,
    getItemsInCollection,
    searchCollections,
    getCollectionById,
    refetch: fetchCollections,
  };
};

// Hook for custom collection statistics
export const useCustomCollectionStats = () => {
  const [stats, setStats] = useState<CustomCollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customCollectionsService.getCustomCollectionStats();
      setStats(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching collection stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};