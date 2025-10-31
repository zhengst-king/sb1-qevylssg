// src/hooks/useTags.ts
// React hook for managing 3-level tagging system
// Uses separated service layers: tagsService + contentTagsService

import { useState, useEffect, useCallback } from 'react';
import { tagsService } from '../services/tagsService';
import { contentTagsService } from '../services/contentTagsService';
import type { Tag, CreateTagDTO, UpdateTagDTO } from '../types/customCollections';

/**
 * Main hook for tag management (tag CRUD operations)
 */
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

  // Local search in loaded tags (faster for small datasets)
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

  // Get tag by ID
  const getTagById = useCallback(
    (id: string): Tag | undefined => {
      return tags.find(t => t.id === id);
    },
    [tags]
  );

  // Duplicate a tag
  const duplicateTag = useCallback(
    async (id: string, newName: string): Promise<Tag> => {
      try {
        const newTag = await tagsService.duplicateTag(id, newName);
        setTags(prev => [...prev, newTag]);
        return newTag;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Bulk create tags
  const createTags = useCallback(
    async (tagsData: CreateTagDTO[]): Promise<Tag[]> => {
      try {
        const newTags = await tagsService.createTags(tagsData);
        
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

  return {
    tags,
    loading,
    error,
    createTag,
    createTags,
    updateTag,
    deleteTag,
    searchTags,
    filterTags,
    getTagsByCategory,
    getTagsBySubcategory,
    mostUsedTags,
    mergeTags,
    getTagById,
    duplicateTag,
    refetch: fetchTags,
  };
};

/**
 * Hook for tag statistics
 */
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

/**
 * Hook for managing tags on specific content (uses contentTagsService)
 */
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
      const data = await contentTagsService.getTagsForContent(contentId, contentType);
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

  // Add a tag to this content
  const addTag = useCallback(
    async (tagId: string) => {
      if (!contentId || !contentType) return;

      try {
        await contentTagsService.addTagToContent(tagId, contentId, contentType);
        await fetchContentTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType, fetchContentTags]
  );

  // Add multiple tags to this content
  const addTags = useCallback(
    async (tagIds: string[]) => {
      if (!contentId || !contentType) return;

      try {
        await contentTagsService.addTagsToContent(contentId, contentType, tagIds);
        await fetchContentTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType, fetchContentTags]
  );

  // Remove a tag from this content
  const removeTag = useCallback(
    async (tagId: string) => {
      if (!contentId || !contentType) return;

      try {
        await contentTagsService.removeTagFromContent(tagId, contentId, contentType);
        setContentTags(prev => prev.filter(t => t.id !== tagId));
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType]
  );

  // Set all tags for this content (replace existing)
  const setTags = useCallback(
    async (tagIds: string[]) => {
      if (!contentId || !contentType) return;

      try {
        await contentTagsService.setTagsForContent(contentId, contentType, tagIds);
        await fetchContentTags();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType, fetchContentTags]
  );

  // Remove all tags from this content
  const removeAllTags = useCallback(
    async () => {
      if (!contentId || !contentType) return;

      try {
        await contentTagsService.removeAllTagsFromContent(contentId, contentType);
        setContentTags([]);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [contentId, contentType]
  );

  // Check if content has a specific tag
  const hasTag = useCallback(
    async (tagId: string): Promise<boolean> => {
      if (!contentId || !contentType) return false;

      try {
        return await contentTagsService.hasTag(contentId, contentType, tagId);
      } catch (err) {
        setError(err as Error);
        return false;
      }
    },
    [contentId, contentType]
  );

  return {
    contentTags,
    loading,
    error,
    addTag,
    addTags,
    removeTag,
    setTags,
    removeAllTags,
    hasTag,
    refetch: fetchContentTags,
  };
};

/**
 * Hook for querying content by tags
 */
export const useContentByTags = (tagIds: string[], contentType?: 'movie' | 'tv') => {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContent = useCallback(async () => {
    if (tagIds.length === 0) {
      setContent([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get content that has ALL tags (AND logic)
      const data = await contentTagsService.getContentByMultipleTags(tagIds, contentType);
      setContent(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching content by tags:', err);
    } finally {
      setLoading(false);
    }
  }, [tagIds, contentType]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Switch to OR logic (content with ANY of the tags)
  const fetchContentWithAnyTag = useCallback(async () => {
    if (tagIds.length === 0) {
      setContent([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await contentTagsService.getContentByAnyTag(tagIds, contentType);
      setContent(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching content by any tag:', err);
    } finally {
      setLoading(false);
    }
  }, [tagIds, contentType]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    fetchWithAnyTag: fetchContentWithAnyTag,
  };
};