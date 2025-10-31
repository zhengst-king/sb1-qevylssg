// src/hooks/useTags.ts
// React hook for managing 3-level tagging system

import { useState, useEffect, useCallback } from 'react';
import { tagsService } from '../services/tagsService';
import type { Tag, CreateTagDTO, UpdateTagDTO } from '../types/customCollections';

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
        
        // Add to state if not already present
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

  // Add a tag to content
  const addTagToContent = useCallback(
    async (
      tagId: string,
      contentId: number,
      contentType: 'movie' | 'tv'
    ): Promise<void> => {
      try {
        await tagsService.addTagToContent(tagId, contentId, contentType);
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

  // Add multiple tags to content
  const addTagsToContent = useCallback(
    async (
      contentId: number,
      contentType: 'movie' | 'tv',
      tagIds: string[]
    ): Promise<void> => {
      try {
        await tagsService.addTagsToContent(contentId, contentType, tagIds);
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

  // Remove a tag from content
  const removeTagFromContent = useCallback(
    async (
      tagId: string,
      contentId: number,
      contentType: 'movie' | 'tv'
    ): Promise<void> => {
      try {
        await tagsService.removeTagFromContent(tagId, contentId, contentType);
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
      return tags.filter(t => 
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery)
      );
    },
    [tags]
  );

  // Get tags by category
  const getTagsByCategory = useCallback(
    (categoryId: number): Tag[] => {
      return tags.filter(t => t.category_id === categoryId);
    },
    [tags]
  );

  // Get tags by subcategory
  const getTagsBySubcategory = useCallback(
    (subcategoryId: number): Tag[] => {
      return tags.filter(t => t.subcategory_id === subcategoryId);
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

  // Set tags for content (replace all existing)
  const setTagsForContent = useCallback(
    async (
      contentId: number,
      contentType: 'movie' | 'tv',
      tagIds: string[]
    ): Promise<void> => {
      try {
        await tagsService.setTagsForContent(contentId, contentType, tagIds);
        // Refetch to get accurate counts
        await fetchTags();
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
    updateTag,
    deleteTag,
    addTagToContent,
    addTagsToContent,
    removeTagFromContent,
    searchTags,
    filterTags,
    getTagsByCategory,
    getTagsBySubcategory,
    mostUsedTags,
    mergeTags,
    setTagsForContent,
    getTagById,
    refetch: fetchTags,
  };
};

// Hook for tag statistics
export const useTagStats = () => {
  const [stats, setStats] = useState<any | null>(null);
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

// Hook for managing tags on specific content
export const useContentTags = (
  contentId: number | null,
  contentType: 'movie' | 'tv' | null
) => {
  const [contentTags, setContentTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContentTags = useCallback(async () => {
    if (!contentId || !contentType) {
      setContentTags([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getTagsForContent(contentId, contentType);
      setContentTags(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching content tags:', err);
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType]);

  useEffect(() => {
    fetchContentTags();
  }, [fetchContentTags]);

  const addTag = useCallback(
    async (tagId: string) => {
      if (!contentId || !contentType) return;

      try {
        await tagsService.addTagToContent(tagId, contentId, contentType);
        await fetchContentTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType, fetchContentTags]
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      if (!contentId || !contentType) return;

      try {
        await tagsService.removeTagFromContent(tagId, contentId, contentType);
        setContentTags(prev => prev.filter(t => t.id !== tagId));
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType]
  );

  const setTags = useCallback(
    async (tagIds: string[]) => {
      if (!contentId || !contentType) return;

      try {
        await tagsService.setTagsForContent(contentId, contentType, tagIds);
        await fetchContentTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType, fetchContentTags]
  );

  return {
    contentTags,
    loading,
    error,
    addTag,
    removeTag,
    setTags,
    refetch: fetchContentTags,
  };
};