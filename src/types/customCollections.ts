// src/types/customCollections.ts
// TypeScript types for Custom Collections and Tags features

export type TagCategory = 
  | 'genre'
  | 'mood'
  | 'theme'
  | 'occasion'
  | 'quality'
  | 'format_detail'
  | 'collection_status'
  | 'personal'
  | 'other';

export interface CustomCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string; // Hex color code
  icon: string; // Icon name from Lucide icons
  item_count: number;
  is_favorite: boolean;
  display_order: number;
  poster_url: string | null;
  privacy: 'private' | 'public';
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string; // Hex color code
  category: TagCategory;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionItemCustomCollection {
  id: string;
  collection_item_id: string;
  custom_collection_id: string;
  added_at: string;
  display_order: number;
}

export interface CollectionItemTag {
  id: string;
  collection_item_id: string;
  tag_id: string;
  created_at: string;
}

// DTO types for API operations
export interface CreateCustomCollectionDTO {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_favorite?: boolean;
  privacy?: 'private' | 'public';
}

export interface UpdateCustomCollectionDTO {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_favorite?: boolean;
  display_order?: number;
  privacy?: 'private' | 'public';
}

export interface CreateTagDTO {
  name: string;
  color?: string;
  category?: TagCategory;
}

export interface UpdateTagDTO {
  name?: string;
  color?: string;
  category?: TagCategory;
}

// Extended types for UI display
export interface CustomCollectionWithItems extends CustomCollection {
  items?: any[]; // Will be populated with collection items
}

export interface TagWithItems extends Tag {
  items?: any[]; // Will be populated with collection items
}

// Filter types
export interface CollectionFilter {
  customCollectionIds?: string[];
  tagIds?: string[];
  searchQuery?: string;
  format?: string;
  collectionType?: string;
}

// Stats types
export interface CustomCollectionStats {
  totalCollections: number;
  favoriteCollections: number;
  averageItemsPerCollection: number;
  largestCollection?: CustomCollection;
}

export interface TagStats {
  totalTags: number;
  tagsByCategory: Record<TagCategory, number>;
  mostUsedTags: Tag[];
  averageTagsPerItem: number;
}

// Icon options for custom collections
export const COLLECTION_ICONS = [
  'folder',
  'film',
  'tv',
  'star',
  'heart',
  'bookmark',
  'award',
  'target',
  'flag',
  'compass',
  'crown',
  'sparkles',
  'zap',
  'rocket',
  'disc',
  'package',
  'box',
  'archive',
  'library',
  'book-open'
] as const;

export type CollectionIcon = typeof COLLECTION_ICONS[number];

// Color options for custom collections and tags
export const COLLECTION_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#F43F5E', // Rose
  '#6B7280', // Gray
  '#0EA5E9', // Sky
  '#A855F7'  // Violet
] as const;

export type CollectionColor = typeof COLLECTION_COLORS[number];