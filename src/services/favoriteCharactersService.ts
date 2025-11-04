// src/services/favoriteCharactersService.ts
import { supabase } from '../lib/supabase';

export interface FavoriteCharacter {
  id: string;
  user_id: string;
  character_name: string;
  actor_id: number;
  actor_name: string;
  series_name?: string;
  series_imdb_id?: string;
  profile_path?: string;
  added_at: string;
}

class FavoriteCharactersService {
  async addFavorite(character: Omit<FavoriteCharacter, 'id' | 'user_id' | 'added_at'>): Promise<FavoriteCharacter | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('favorite_characters')
      .insert({
        user_id: user.id,
        ...character
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding favorite character:', error);
      return null;
    }

    return data;
  }

  async removeFavorite(characterName: string, seriesImdbId?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    let query = supabase
      .from('favorite_characters')
      .delete()
      .eq('user_id', user.id)
      .eq('character_name', characterName);

    if (seriesImdbId) {
      query = query.eq('series_imdb_id', seriesImdbId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error removing favorite character:', error);
      return false;
    }

    return true;
  }

  async isFavorite(characterName: string, seriesImdbId?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    let query = supabase
      .from('favorite_characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_name', characterName);

    if (seriesImdbId) {
      query = query.eq('series_imdb_id', seriesImdbId);
    }

    const { data } = await query.maybeSingle();

    return !!data;
  }

  async getAllFavorites(): Promise<FavoriteCharacter[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_characters')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite characters:', error);
      return [];
    }

    return data || [];
  }
}

export const favoriteCharactersService = new FavoriteCharactersService();