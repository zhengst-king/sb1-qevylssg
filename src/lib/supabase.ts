import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

console.log('[supabase] Initializing client with:', {
  url: supabaseUrl ? 'configured' : 'missing',
  key: supabaseAnonKey ? 'configured' : 'missing',
  urlValid: supabaseUrl?.startsWith('https://'),
  keyValid: supabaseAnonKey?.startsWith('eyJ')
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('movies').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('[supabase] Connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[supabase] Connection test successful');
    return { success: true, count: data };
  } catch (err) {
    console.error('[supabase] Connection test error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Auth helper functions
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[supabase] Error getting current user:', error);
    return null;
  }
  return user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export interface Movie {
  id?: string;
  user_session?: string; // Keep for backward compatibility
  user_id?: string; // New auth-based field
  media_type: 'movie' | 'series';
  title: string;
  genre?: string;
  year?: number;
  country?: string;
  director?: string;
  actors?: string;
  imdb_score?: number;
  imdb_url?: string;
  status: 'To Watch' | 'Watching' | 'Watched' | 'To Watch Again' | 'Upcoming';
  user_rating?: number;
  poster_url?: string;
  imdb_id?: string;
  date_watched?: string;
  user_review?: string;
  metascore?: number;
  imdb_votes?: string;
  runtime?: number;
  awards?: string;
  box_office?: number;
  production?: string;
  website?: string;
  plot?: string;
  rated?: string;
  released?: string;
  language?: string;
  writer?: string;
  created_at?: string;
  status_updated_at?: string;
  rating_updated_at?: string;
  last_modified_at?: string;
};

export interface BlurayTechnicalSpecs {
  id: string;
  title: string;
  year?: number;
  imdb_id?: string;
  bluray_com_url?: string;
  
  // Video specifications
  video_codec?: string;
  video_resolution?: string;
  hdr_format?: string[];
  aspect_ratio?: string;
  frame_rate?: string;
  
  // Audio specifications
  audio_codecs?: string[];
  audio_channels?: string[];
  audio_languages?: string[];
  
  // Disc information
  disc_format: string;
  region_codes?: string[];
  disc_count?: number;
  studio?: string;
  distributor?: string;
  
  // Additional information
  special_features?: string[];
  subtitles?: string[];
  runtime_minutes?: number;
  upc_code?: string;
  
  // Quality and metadata
  data_quality: 'complete' | 'partial' | 'minimal';
  last_scraped_at: string;
  scrape_success: boolean;
  scrape_error?: string;
  
  created_at: string;
  updated_at: string;
};

export interface ScrapingJob {
  id: string;
  title: string;
  year?: number;
  imdb_id?: string;
  search_query?: string;
  
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry';
  priority: number;
  attempts: number;
  max_attempts: number;
  
  technical_specs_id?: string;
  error_message?: string;
  
  created_at: string;
  started_at?: string;
  completed_at?: string;
  retry_after?: string;
  
  requested_by_user_id?: string;
  collection_item_id?: string;
};

// Collection type definition (represents item status in the physical media library)
// Database field name: collection_type (unchanged for backward compatibility)
export type CollectionType = 'owned' | 'wishlist' | 'for_sale' | 'loaned_out' | 'missing';

export interface PhysicalMediaCollection {
  id: string;
  user_id: string;
  imdb_id?: string;
  title: string;
  year?: number;
  genre?: string;
  director?: string;
  poster_url?: string;
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  personal_rating?: number;
  notes?: string;
  technical_specs_id?: string;
  collection_type?: CollectionType;
  created_at: string;
  updated_at: string;
};

// Type aliases for semantic clarity in Media Library components
// Database table: physical_media_collections (unchanged)
// UI terminology: Media Library
export type MediaLibraryItem = PhysicalMediaCollection;
export type ItemStatus = CollectionType;

export interface ImportHistory {
  id: string;
  user_id: string;
  upload_datetime: string;
  streaming_service: 'netflix' | 'hulu' | 'disney' | 'prime';
  default_status: 'To Watch' | 'Watching' | 'Watched';
  har_filename: string;
  movies_added: number;
  tv_series_added: number;
  total_imported: number;
  created_at: string;
}

export interface Shelf {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_image?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShelfItem {
  shelf_id: string;
  library_item_id: string;
  sort_order: number;
  added_at: string;
}

// Extended shelf type with item count
export interface ShelfWithCount extends Shelf {
  item_count: number;
}

// Extended library item type with shelf information
export interface MediaLibraryItemWithShelves extends MediaLibraryItem {
  shelves?: Array<{
    shelf_id: string;
    shelf_name: string;
    added_at: string;
  }>;
}