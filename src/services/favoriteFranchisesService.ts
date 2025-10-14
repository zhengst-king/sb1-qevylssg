// src/services/favoriteFranchisesService.ts
import { supabase } from '../lib/supabase';

export interface FavoriteFranchise {
  id: string;
  user_id: string;
  tmdb_collection_id: number;
  collection_name: string;
  poster_path?: string;
  backdrop_path?: string;
  created_at: string;
}

class FavoriteFranchisesService {
  async addFavorite(franchise: Omit<FavoriteFranchise, 'id' | 'user_id' | 'created_at'>): Promise<FavoriteFranchise | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('favorite_franchises')
      .insert({
        user_id: user.id,
        ...franchise
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding favorite franchise:', error);
      return null;
    }

    return data;
  }

  async removeFavorite(collectionId: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('favorite_franchises')
      .delete()
      .eq('user_id', user.id)
      .eq('tmdb_collection_id', collectionId);

    if (error) {
      console.error('Error removing favorite franchise:', error);
      return false;
    }

    return true;
  }

  async isFavorite(collectionId: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('favorite_franchises')
      .select('id')
      .eq('user_id', user.id)
      .eq('tmdb_collection_id', collectionId)
      .single();

    return !!data;
  }

  async getAllFavorites(): Promise<FavoriteFranchise[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_franchises')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite franchises:', error);
      return [];
    }

    return data || [];
  }

  async getFavoriteIds(): Promise<Set<number>> {
    const favorites = await this.getAllFavorites();
    return new Set(favorites.map(f => f.tmdb_collection_id));
  }
}

export const favoriteFranchisesService = new FavoriteFranchisesService();