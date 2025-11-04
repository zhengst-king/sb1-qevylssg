// src/services/favoriteActorsService.ts
import { supabase } from '../lib/supabase';

export interface FavoriteActor {
  id: string;
  user_id: string;
  actor_id: number;
  actor_name: string;
  character_name?: string;
  profile_path?: string;
  known_for_department?: string;
  added_at: string;
}

class FavoriteActorsService {
  async addFavorite(actor: Omit<FavoriteActor, 'id' | 'user_id' | 'added_at'>): Promise<FavoriteActor | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('favorite_actors')
      .insert({
        user_id: user.id,
        ...actor
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding favorite actor:', error);
      return null;
    }

    return data;
  }

  async removeFavorite(actorId: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('favorite_actors')
      .delete()
      .eq('user_id', user.id)
      .eq('actor_id', actorId);

    if (error) {
      console.error('Error removing favorite actor:', error);
      return false;
    }

    return true;
  }

  async isFavorite(actorId: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('favorite_actors')
      .select('id')
      .eq('user_id', user.id)
      .eq('actor_id', actorId)
      .maybeSingle();

    return !!data;
  }

  async getAllFavorites(): Promise<FavoriteActor[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_actors')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite actors:', error);
      return [];
    }

    return data || [];
  }

  async getFavoriteIds(): Promise<Set<number>> {
    const favorites = await this.getAllFavorites();
    return new Set(favorites.map(f => f.actor_id));
  }
}

export const favoriteActorsService = new FavoriteActorsService();