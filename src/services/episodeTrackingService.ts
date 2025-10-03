// src/services/episodeTrackingService.ts
// Service for managing user episode tracking data

import { supabase } from '../lib/supabase';

export interface EpisodeTracking {
  id?: string;
  user_id?: string;
  series_imdb_id: string;
  season_number: number;
  episode_number: number;
  status?: 'To Watch' | 'Watching' | 'Watched' | 'To Watch Again';
  user_rating?: number | null;
  user_review?: string | null;
  date_watched?: string | null;
  date_added?: string;
  status_updated_at?: string;
  rating_updated_at?: string;
  last_modified_at?: string;
  created_at?: string;
  updated_at?: string;
}

class EpisodeTrackingService {
  /**
   * Get tracking data for a specific episode
   */
  async getEpisodeTracking(
    seriesImdbId: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<EpisodeTracking | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_episode_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('series_imdb_id', seriesImdbId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching episode tracking:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getEpisodeTracking:', error);
      return null;
    }
  }

  /**
   * Get tracking data for all episodes in a season
   */
  async getSeasonTracking(
    seriesImdbId: string,
    seasonNumber: number
  ): Promise<Map<number, EpisodeTracking>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      const { data, error } = await supabase
        .from('user_episode_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('series_imdb_id', seriesImdbId)
        .eq('season_number', seasonNumber);

      if (error) {
        console.error('Error fetching season tracking:', error);
        return new Map();
      }

      // Create a map with episode_number as key
      const trackingMap = new Map<number, EpisodeTracking>();
      data?.forEach(tracking => {
        trackingMap.set(tracking.episode_number, tracking);
      });

      return trackingMap;
    } catch (error) {
      console.error('Error in getSeasonTracking:', error);
      return new Map();
    }
  }

  /**
   * Upsert (create or update) episode tracking data
   */
  async upsertEpisodeTracking(tracking: EpisodeTracking): Promise<EpisodeTracking | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in');
        return null;
      }

      const trackingData = {
        user_id: user.id,
        series_imdb_id: tracking.series_imdb_id,
        season_number: tracking.season_number,
        episode_number: tracking.episode_number,
        status: tracking.status || 'To Watch',
        user_rating: tracking.user_rating,
        user_review: tracking.user_review,
        date_watched: tracking.date_watched,
        status_updated_at: tracking.status ? new Date().toISOString() : undefined,
        rating_updated_at: tracking.user_rating !== undefined ? new Date().toISOString() : undefined,
      };

      const { data, error } = await supabase
        .from('user_episode_tracking')
        .upsert(trackingData, {
          onConflict: 'user_id,series_imdb_id,season_number,episode_number'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting episode tracking:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in upsertEpisodeTracking:', error);
      return null;
    }
  }

  /**
   * Update only specific fields of episode tracking
   */
  async updateEpisodeTracking(
    seriesImdbId: string,
    seasonNumber: number,
    episodeNumber: number,
    updates: Partial<EpisodeTracking>
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Add timestamp updates based on what field changed
      const timestampUpdates: any = {};
      if (updates.status !== undefined) {
        timestampUpdates.status_updated_at = new Date().toISOString();
      }
      if (updates.user_rating !== undefined) {
        timestampUpdates.rating_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_episode_tracking')
        .upsert({
          user_id: user.id,
          series_imdb_id: seriesImdbId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          ...updates,
          ...timestampUpdates
        }, {
          onConflict: 'user_id,series_imdb_id,season_number,episode_number'
        });

      if (error) {
        console.error('Error updating episode tracking:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateEpisodeTracking:', error);
      return false;
    }
  }

  /**
   * Delete episode tracking data
   */
  async deleteEpisodeTracking(
    seriesImdbId: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('user_episode_tracking')
        .delete()
        .eq('user_id', user.id)
        .eq('series_imdb_id', seriesImdbId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber);

      if (error) {
        console.error('Error deleting episode tracking:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEpisodeTracking:', error);
      return false;
    }
  }

  /**
   * Get statistics for a series (for progress tracking)
   */
  async getSeriesStats(seriesImdbId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_episode_tracking')
        .select('status, season_number, episode_number')
        .eq('user_id', user.id)
        .eq('series_imdb_id', seriesImdbId);

      if (error) {
        console.error('Error fetching series stats:', error);
        return null;
      }

      const stats = {
        total: data.length,
        toWatch: data.filter(e => e.status === 'To Watch').length,
        watching: data.filter(e => e.status === 'Watching').length,
        watched: data.filter(e => e.status === 'Watched').length,
        toWatchAgain: data.filter(e => e.status === 'To Watch Again').length,
      };

      return stats;
    } catch (error) {
      console.error('Error in getSeriesStats:', error);
      return null;
    }
  }
}

export const episodeTrackingService = new EpisodeTrackingService();