// src/services/favoriteCrewService.ts
import { supabase } from '../lib/supabase';

export interface FavoriteCrewMember {
  id?: string;
  user_id?: string;
  tmdb_person_id: number;
  name: string;
  profile_path: string | null;
  job: string;
  department: string;
  created_at?: string;
}

class FavoriteCrewService {
  async addFavoriteCrew(
    tmdbPersonId: number,
    name: string,
    profilePath: string | null,
    job: string,
    department: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('favorite_crew')
        .insert({
          user_id: user.id,
          tmdb_person_id: tmdbPersonId,
          name,
          profile_path: profilePath,
          job,
          department
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding favorite crew:', error);
      return false;
    }
  }

  async removeFavoriteCrew(tmdbPersonId: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('favorite_crew')
        .delete()
        .eq('user_id', user.id)
        .eq('tmdb_person_id', tmdbPersonId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing favorite crew:', error);
      return false;
    }
  }

  async isFavoriteCrew(tmdbPersonId: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('favorite_crew')
        .select('id')
        .eq('user_id', user.id)
        .eq('tmdb_person_id', tmdbPersonId)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async getFavoriteCrew(): Promise<FavoriteCrewMember[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorite_crew')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting favorite crew:', error);
      return [];
    }
  }

  async getFavoriteCrewByJob(job: string): Promise<FavoriteCrewMember[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorite_crew')
        .select('*')
        .eq('user_id', user.id)
        .eq('job', job)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting favorite crew by job:', error);
      return [];
    }
  }
}

export const favoriteCrewService = new FavoriteCrewService();