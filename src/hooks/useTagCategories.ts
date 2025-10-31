// src/hooks/useTagCategories.ts
// Simple hook that returns static category data

import { TAG_CATEGORIES } from '../data/taggingCategories';

export function useTagCategories() {
  // Categories are static data from taggingCategories.ts
  // No database calls needed - the 9 categories are locked/predefined
  return {
    categories: TAG_CATEGORIES,
    loading: false,
    error: null
  };
}