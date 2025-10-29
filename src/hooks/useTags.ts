// src/hooks/useTags.ts
// React hook for managing tags

import { useState, useEffect, useCallback } from 'react';
import { tagsService } from '../services/tagsService';
import type {
  Tag,
  CreateTagDTO,
  UpdateTagDTO,
  TagStats,
  TagCategory
} from '../types/customCollections';

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all tags
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getTags();
      setTags(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Create a new tag
  const createTag = useCallback(
    async (tagData: CreateTagDTO): Promise<Tag> => {
      try {
        const newTag = await tagsService.createTag(tagData);
        
        // Only add if it's actually new (not existing)
        if (!tags.find(t => t.id === newTag.id)) {
          setTags(prev => [...prev, newTag]);
        }
        
        return newTag;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [tags]
  );

  // Create multiple tags
  const createTags = useCallback(
    async (tagNames: string[]): Promise<Tag[]> => {
      try {
        const newTags = await tagsService.createTags(tagNames);
        
        // Add only new tags
        const existingIds = new Set(tags.map(t => t.id));
        const tagsToAdd = newTags.filter(t => !existingIds.has(t.id));
        
        if (tagsToAdd.length > 0) {
          setTags(prev => [...prev, ...tagsToAdd]);
        }
        
        return newTags;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [tags]
  );

  // Update a tag
  const updateTag = useCallback(
    async (id: string, updates: UpdateTagDTO): Promise<Tag> => {
      try {
        const updatedTag = await tagsService.updateTag(id, updates);
        setTags(prev => prev.map(t => (t.id === id ? updatedTag : t)));
        return updatedTag;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Delete a tag
  const deleteTag = useCallback(async (id: string): Promise<void> => {
    try {
      await tagsService.deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Add a tag to an item
  const addTagToItem = useCallback(
    async (collectionItemId: string, tagId: string): Promise<void> => {
      try {
        await tagsService.addTagToItem(collectionItemId, tagId);
        // Update usage count
        setTags(prev =>
          prev.map(t =>
            t.id === tagId ? { ...t, usage_count: t.usage_count + 1 } : t
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Add multiple tags to an item
  const addTagsToItem = useCallback(
    async (collectionItemId: string, tagIds: string[]): Promise<void> => {
      try {
        await tagsService.addTagsToItem(collectionItemId, tagIds);
        // Update usage counts
        const tagIdSet = new Set(tagIds);
        setTags(prev =>
          prev.map(t =>
            tagIdSet.has(t.id)
              ? { ...t, usage_count: t.usage_count + 1 }
              : t
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Remove a tag from an item
  const removeTagFromItem = useCallback(
    async (collectionItemId: string, tagId: string): Promise<void> => {
      try {
        await tagsService.removeTagFromItem(collectionItemId, tagId);
        // Update usage count
        setTags(prev =>
          prev.map(t =>
            t.id === tagId
              ? { ...t, usage_count: Math.max(0, t.usage_count - 1) }
              : t
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Get or create tag by name
  const getOrCreateTag = useCallback(
    async (name: string, category?: TagCategory): Promise<Tag> => {
      try {
        const tag = await tagsService.getOrCreateTag(name, category);
        
        // Add to state if it's new
        if (!tags.find(t => t.id === tag.id)) {
          setTags(prev => [...prev, tag]);
        }
        
        return tag;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [tags]
  );

  // Search tags
  const searchTags = useCallback(
    async (query: string): Promise<Tag[]> => {
      try {
        return await tagsService.searchTags(query);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Local search in loaded tags
  const filterTags = useCallback(
    (query: string): Tag[] => {
      const lowerQuery = query.toLowerCase();
      return tags.filter(t => t.name.toLowerCase().includes(lowerQuery));
    },
    [tags]
  );

  // Get tags by category
  const getTagsByCategory = useCallback(
    (category: TagCategory): Tag[] => {
      return tags.filter(t => t.category === category);
    },
    [tags]
  );

  // Get most used tags
  const mostUsedTags = useCallback(
    (limit: number = 10): Tag[] => {
      return [...tags]
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);
    },
    [tags]
  );

  // Merge tags
  const mergeTags = useCallback(
    async (sourceTagId: string, targetTagId: string): Promise<void> => {
      try {
        await tagsService.mergeTags(sourceTagId, targetTagId);
        // Remove source tag and update target tag usage count
        const sourceTag = tags.find(t => t.id === sourceTagId);
        setTags(prev =>
          prev
            .filter(t => t.id !== sourceTagId)
            .map(t =>
              t.id === targetTagId && sourceTag
                ? { ...t, usage_count: t.usage_count + sourceTag.usage_count }
                : t
            )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [tags]
  );

  // Set tags for an item (replace all existing)
  const setTagsForItem = useCallback(
    async (collectionItemId: string, tagIds: string[]): Promise<void> => {
      try {
        await tagsService.setTagsForItem(collectionItemId, tagIds);
        // Note: Usage counts will be updated by database triggers
        await fetchTags(); // Refetch to get accurate counts
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [fetchTags]
  );

  // Get tag by ID
  const getTagById = useCallback(
    (id: string): Tag | undefined => {
      return tags.find(t => t.id === id);
    },
    [tags]
  );

  return {
    tags,
    loading,
    error,
    createTag,
    createTags,
    updateTag,
    deleteTag,
    addTagToItem,
    addTagsToItem,
    removeTagFromItem,
    getOrCreateTag,
    searchTags,
    filterTags,
    getTagsByCategory,
    mostUsedTags,
    mergeTags,
    setTagsForItem,
    getTagById,
    refetch: fetchTags,
  };
};

// Hook for tag statistics
export const useTagStats = () => {
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getTagStats();
      setStats(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching tag stats:', err);
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

// Hook for managing tags on a specific item
export const useItemTags = (collectionItemId: string | null) => {
  const [itemTags, setItemTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchItemTags = useCallback(async () => {
    if (!collectionItemId) {
      setItemTags([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getTagsForItem(collectionItemId);
      setItemTags(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching item tags:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionItemId]);

  useEffect(() => {
    fetchItemTags();
  }, [fetchItemTags]);

  const addTag = useCallback(
    async (tagId: string) => {
      if (!collectionItemId) return;

      try {
        await tagsService.addTagToItem(collectionItemId, tagId);
        await fetchItemTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [collectionItemId, fetchItemTags]
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      if (!collectionItemId) return;

      try {
        await tagsService.removeTagFromItem(collectionItemId, tagId);
        setItemTags(prev => prev.filter(t => t.id !== tagId));
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [collectionItemId]
  );

  const setTags = useCallback(
    async (tagIds: string[]) => {
      if (!collectionItemId) return;

      try {
        await tagsService.setTagsForItem(collectionItemId, tagIds);
        await fetchItemTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [collectionItemId, fetchItemTags]
  );

  return {
    itemTags,
    loading,
    error,
    addTag,
    removeTag,
    setTags,
    refetch: fetchItemTags,
  };
};