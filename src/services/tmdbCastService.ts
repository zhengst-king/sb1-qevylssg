// src/services/tmdbCastService.ts
// Service for fetching and caching episode cast/crew information from TMDB

import { supabase } from '../lib/supabase';

// ==================== INTERFACES ====================

export interface TMDBCastMember {
  adult: boolean;
  gender: number;
  id: number; // TMDB person ID
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  character: string;
  credit_id: string;
  order: number;
}

export interface TMDBCrewMember {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  credit_id: string;
  department: string;
  job: string;
}

export interface TMDBEpisodeCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
  guest_stars: TMDBCastMember[];
  id: number;
}

export interface TMDBPersonDetails {
  adult: boolean;
  also_known_as: string[];
  biography: string;
  birthday: string | null;
  deathday: string | null;
  gender: number;
  homepage: string | null;
  id: number;
  imdb_id: string;
  known_for_department: string;
  name: string;
  place_of_birth: string | null;
  popularity: number;
  profile_path: string | null;
}

export interface SeriesAggregateCast {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  roles: Array<{
    credit_id: string;
    character: string;
    episode_count: number;
  }>;
  total_episode_count: number;
  order: number;
}

export interface TMDBAggregateCredits {
  cast: SeriesAggregateCast[];
  crew: any[]; // Can add detailed crew interface if needed
  id: number;
}

export interface TMDBMovieCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
  id: number;
}

// ==================== SERVICE CLASS ====================

class TMDBCastService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly apiKey: string;
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w185'; // For profile images

  constructor() {
    this.apiKey = import.meta.env.VITE_TMDB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[TMDBCast] API key not configured. Set VITE_TMDB_API_KEY in environment.');
    }
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get episode credits (cast & crew) with caching
   */
  async getEpisodeCredits(
    imdbId: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<TMDBEpisodeCredits | null> {
    if (!this.apiKey) {
      console.error('[TMDBCast] API key not configured');
      return null;
    }

    try {
      console.log(`[TMDBCast] Fetching credits for ${imdbId} S${seasonNumber}E${episodeNumber}`);

      // Check cache first
      const cached = await this.getCachedEpisodeCredits(imdbId, seasonNumber, episodeNumber);
      if (cached) {
        console.log('[TMDBCast] Cache hit for episode credits');
        return cached;
      }

      console.log('[TMDBCast] Cache miss, fetching from API');

      // First, get TMDB series ID from IMDb ID
      const tmdbSeriesId = await this.findSeriesIdByImdbId(imdbId);
      if (!tmdbSeriesId) {
        console.error('[TMDBCast] Could not find TMDB series ID');
        return null;
      }

      // Fetch episode credits from TMDB
      const credits = await this.fetchEpisodeCreditsFromAPI(
        tmdbSeriesId,
        seasonNumber,
        episodeNumber
      );

      if (!credits) {
        console.error('[TMDBCast] Failed to fetch episode credits from API');
        return null;
      }

      // Cache the results
      await this.cacheEpisodeCredits(imdbId, seasonNumber, episodeNumber, credits);

      // Optionally, save cast members to people table
      await this.savecastMembersToPeopleTable(credits.cast);
      await this.saveCastMembersToPeopleTable(credits.guest_stars);

      return credits;
    } catch (error) {
      console.error('[TMDBCast] Error getting episode credits:', error);
      return null;
    }
  }

  /**
   * Get series-level aggregate credits (regular cast across all seasons)
   */
  async getSeriesAggregateCredits(imdbId: string): Promise<TMDBAggregateCredits | null> {
    if (!this.apiKey) {
      console.error('[TMDBCast] API key not configured');
      return null;
    }

    try {
      console.log(`[TMDBCast] Fetching aggregate credits for series ${imdbId}`);

      // Check cache first
      const cached = await this.getCachedSeriesCredits(imdbId);
      if (cached) {
        console.log('[TMDBCast] Cache hit for series credits');
        return cached;
      }

      // Get TMDB series ID
      const tmdbSeriesId = await this.findSeriesIdByImdbId(imdbId);
      if (!tmdbSeriesId) {
        console.error('[TMDBCast] Could not find TMDB series ID');
        return null;
      }

      // Fetch aggregate credits
      const url = `${this.baseUrl}/tv/${tmdbSeriesId}/aggregate_credits?api_key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDBCast] Failed to fetch aggregate credits:', response.status);
        return null;
      }

      const credits = await response.json() as TMDBAggregateCredits;
      console.log(`[TMDBCast] Fetched ${credits.cast.length} cast members`);

      // Cache the results
      await this.cacheSeriesCredits(imdbId, tmdbSeriesId, credits);

      // Save cast members to people table
      await this.saveAggregateCastToPeopleTable(credits.cast);

      return credits;
    } catch (error) {
      console.error('[TMDBCast] Error getting series aggregate credits:', error);
      return null;
    }
  }

  /**
   * Get directors aggregated from OMDb episode cache
   * NO API CALLS - uses existing episodes_cache table
   */
  async getSeriesDirectorsFromOMDb(imdbId: string): Promise<Array<{
    name: string;
    episodeCount: number;
    episodes: Array<{season: number; episode: number}>;
  }>> {
    try {
      console.log(`[TMDBCast] Aggregating directors from OMDb cache for ${imdbId}`);
      
      // Query episodes_cache table for all episodes of this series
      const { data, error } = await supabase
        .from('episodes_cache')
        .select('director, season_number, episode_number')
        .eq('imdb_id', imdbId)
        .not('director', 'is', null)
        .not('director', 'eq', 'N/A');
      
      if (error) {
        console.error('[TMDBCast] Error fetching from episodes_cache:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('[TMDBCast] No cached episodes found for series');
        return [];
      }
      
      console.log(`[TMDBCast] Found ${data.length} cached episodes with director data`);
      
      // Map directors to their episodes
      const directorMap = new Map<string, Array<{season: number; episode: number}>>();
      
      data.forEach(episode => {
        if (episode.director && episode.director !== 'N/A') {
          // OMDb returns comma-separated director names
          const directors = episode.director.split(',').map(d => d.trim());
          directors.forEach(directorName => {
            if (directorName) {
              if (!directorMap.has(directorName)) {
                directorMap.set(directorName, []);
              }
              directorMap.get(directorName)!.push({
                season: episode.season_number,
                episode: episode.episode_number
              });
            }
          });
        }
      });
      
      // Convert to array with episode counts
      const directors = Array.from(directorMap.entries())
        .map(([name, episodes]) => ({
          name,
          episodeCount: episodes.length,
          episodes
        }))
        .sort((a, b) => {
          // Sort by episode count (descending), then by name
          if (b.episodeCount !== a.episodeCount) {
            return b.episodeCount - a.episodeCount;
          }
          return a.name.localeCompare(b.name);
        });
      
      console.log(`[TMDBCast] Found ${directors.length} unique directors from ${data.length} episodes`);
      
      return directors;
    } catch (error) {
      console.error('[TMDBCast] Error aggregating directors from OMDb:', error);
      return [];
    }
  }

  /**
   * Get movie credits (cast & crew) with caching
   */
  async getMovieCredits(imdbId: string): Promise<TMDBMovieCredits | null> {
    if (!this.apiKey) {
      console.error('[TMDBCast] API key not configured');
      return null;
    }

    try {
      console.log(`[TMDBCast] Fetching credits for movie ${imdbId}`);

      // Check cache first
      const cached = await this.getCachedMovieCredits(imdbId);
      if (cached) {
        console.log('[TMDBCast] Cache hit for movie credits');
        return cached;
      }

      console.log('[TMDBCast] Cache miss, fetching from API');

      // First, get TMDB movie ID from IMDb ID
      const tmdbMovieId = await this.findMovieIdByImdbId(imdbId);
      if (!tmdbMovieId) {
        console.error('[TMDBCast] Could not find TMDB movie ID');
        return null;
      }

      // Fetch movie credits from TMDB
      const credits = await this.fetchMovieCreditsFromAPI(tmdbMovieId);

      if (!credits) {
        console.error('[TMDBCast] Failed to fetch movie credits from API');
        return null;
      }

      // Cache the results
      await this.cacheMovieCredits(imdbId, tmdbMovieId, credits);

      // Optionally, save cast members to people table
      await this.saveCastMembersToPeopleTable(credits.cast);
      await this.saveCastMembersToPeopleTable(credits.crew as unknown as TMDBCastMember[]);

      return credits;
    } catch (error) {
      console.error('[TMDBCast] Error getting movie credits:', error);
      return null;
    }
  }

  /**
   * Find TMDB movie ID from IMDb ID
   */
  private async findMovieIdByImdbId(imdbId: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/find/${imdbId}?api_key=${this.apiKey}&external_source=imdb_id`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDBCast] Find movie failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.movie_results?.[0]?.id || null;
    } catch (error) {
      console.error('[TMDBCast] Error finding movie by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Fetch movie credits from TMDB API
   */
  private async fetchMovieCreditsFromAPI(tmdbMovieId: number): Promise<TMDBMovieCredits | null> {
    try {
      const url = `${this.baseUrl}/movie/${tmdbMovieId}/credits?api_key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDBCast] Fetch movie credits failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log(`[TMDBCast] Fetched ${data.cast?.length || 0} cast and ${data.crew?.length || 0} crew members`);

      return data;
    } catch (error) {
      console.error('[TMDBCast] Error fetching movie credits:', error);
      return null;
    }
  }

  /**
   * Get cached movie credits from Supabase
   */
  private async getCachedMovieCredits(imdbId: string): Promise<TMDBMovieCredits | null> {
    try {
      const { data, error } = await supabase
        .from('movie_cast_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .eq('fetch_success', true)
        .order('last_fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('[TMDBCast] Error getting cached movie credits:', error);
        }
        return null;
      }

      // Check if cache is fresh (30 days)
      const cacheAge = Date.now() - new Date(data.last_fetched_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge > thirtyDaysMs) {
        console.log('[TMDBCast] Cache is stale, will refetch');
        return null;
      }

      return {
        cast: data.cast_data || [],
        crew: data.crew_data || [],
        id: data.tmdb_movie_id || 0
      };
    } catch (error) {
      console.error('[TMDBCast] Error getting cached movie credits:', error);
      return null;
    }
  }

  /**
   * Cache movie credits to Supabase
   */
  private async cacheMovieCredits(
    imdbId: string,
    tmdbMovieId: number,
    credits: TMDBMovieCredits
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('movie_cast_cache')
        .upsert({
          imdb_id: imdbId,
          tmdb_movie_id: tmdbMovieId,
          cast_data: credits.cast,
          crew_data: credits.crew,
          last_fetched_at: new Date().toISOString(),
          fetch_success: true
        }, {
          onConflict: 'imdb_id'
        });

      if (error) {
        console.error('[TMDBCast] Error caching movie credits:', error);
      } else {
        console.log('[TMDBCast] Successfully cached movie credits');
      }
    } catch (error) {
      console.error('[TMDBCast] Error in cacheMovieCredits:', error);
    }
  }

  /**
   * Get detailed person information
   */
  async getPersonDetails(tmdbPersonId: number): Promise<TMDBPersonDetails | null> {
    try {
      const url = `${this.baseUrl}/person/${tmdbPersonId}?api_key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDBCast] Failed to fetch person details:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[TMDBCast] Error getting person details:', error);
      return null;
    }
  }

  /**
   * Get full profile image URL
   */
  getProfileImageUrl(profilePath: string | null, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185'): string | null {
    if (!profilePath) return null;
    return `https://image.tmdb.org/t/p/${size}${profilePath}`;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Find TMDB series ID from IMDb ID
   */
  private async findSeriesIdByImdbId(imdbId: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/find/${imdbId}?api_key=${this.apiKey}&external_source=imdb_id`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDBCast] Find series failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.tv_results?.[0]?.id || null;
    } catch (error) {
      console.error('[TMDBCast] Error finding series by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Fetch episode credits from TMDB API
   */
  private async fetchEpisodeCreditsFromAPI(
    tmdbSeriesId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<TMDBEpisodeCredits | null> {
    try {
      const url = `${this.baseUrl}/tv/${tmdbSeriesId}/season/${seasonNumber}/episode/${episodeNumber}/credits?api_key=${this.apiKey}`;
      console.log('[TMDBCast] Fetching from URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        console.error('[TMDBCast] Fetch episode credits failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log(`[TMDBCast] Fetched ${data.cast?.length || 0} cast, ${data.guest_stars?.length || 0} guest stars`);

      return data;
    } catch (error) {
      console.error('[TMDBCast] Error fetching episode credits from API:', error);
      return null;
    }
  }

  /**
   * Get cached episode credits from Supabase
   */
  private async getCachedEpisodeCredits(
    imdbId: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<TMDBEpisodeCredits | null> {
    try {
      const { data, error } = await supabase
        .from('episode_cast_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber)
        .eq('fetch_success', true)
        .order('last_fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - normal case
          return null;
        }
        console.error('[TMDBCast] Error reading episode cache:', error);
        return null;
      }

      if (!data) return null;

      // Check if cache is stale (older than 30 days)
      const cacheAge = Date.now() - new Date(data.last_fetched_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge > thirtyDaysMs) {
        console.log('[TMDBCast] Cache is stale, will refetch');
        return null;
      }

      return {
        cast: data.cast_data || [],
        crew: data.crew_data || [],
        guest_stars: data.guest_stars || [],
        id: data.tmdb_episode_id || 0
      };
    } catch (error) {
      console.error('[TMDBCast] Error getting cached episode credits:', error);
      return null;
    }
  }

  /**
   * Cache episode credits to Supabase
   */
  private async cacheEpisodeCredits(
    imdbId: string,
    seasonNumber: number,
    episodeNumber: number,
    credits: TMDBEpisodeCredits
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('episode_cast_cache')
        .upsert({
          imdb_id: imdbId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          tmdb_episode_id: credits.id,
          cast_data: credits.cast,
          crew_data: credits.crew,
          guest_stars: credits.guest_stars,
          last_fetched_at: new Date().toISOString(),
          fetch_success: true
        }, {
          onConflict: 'imdb_id,season_number,episode_number'
        });

      if (error) {
        console.error('[TMDBCast] Error caching episode credits:', error);
      } else {
        console.log('[TMDBCast] Successfully cached episode credits');
      }
    } catch (error) {
      console.error('[TMDBCast] Error in cacheEpisodeCredits:', error);
    }
  }

  /**
   * Get cached series credits from Supabase
   */
  private async getCachedSeriesCredits(imdbId: string): Promise<TMDBAggregateCredits | null> {
    try {
      const { data, error } = await supabase
        .from('series_cast_cache')
        .select('*')
        .eq('imdb_id', imdbId)
        .eq('fetch_success', true)
        .order('last_fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[TMDBCast] Error reading series cache:', error);
        return null;
      }

      if (!data) return null;

      // Check cache staleness (90 days for series-level data)
      const cacheAge = Date.now() - new Date(data.last_fetched_at).getTime();
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

      if (cacheAge > ninetyDaysMs) {
        console.log('[TMDBCast] Series cache is stale');
        return null;
      }

      return data.aggregate_credits as TMDBAggregateCredits;
    } catch (error) {
      console.error('[TMDBCast] Error getting cached series credits:', error);
      return null;
    }
  }

  /**
   * Cache series credits to Supabase
   */
  private async cacheSeriesCredits(
    imdbId: string,
    tmdbSeriesId: number,
    credits: TMDBAggregateCredits
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('series_cast_cache')
        .upsert({
          imdb_id: imdbId,
          tmdb_series_id: tmdbSeriesId,
          aggregate_credits: credits,
          regular_cast: credits.cast.slice(0, 10), // Store top 10 for quick access
          last_fetched_at: new Date().toISOString(),
          fetch_success: true
        }, {
          onConflict: 'imdb_id'
        });

      if (error) {
        console.error('[TMDBCast] Error caching series credits:', error);
      } else {
        console.log('[TMDBCast] Successfully cached series credits');
      }
    } catch (error) {
      console.error('[TMDBCast] Error in cacheSeriesCredits:', error);
    }
  }

  /**
   * Save cast members to people table (upsert)
   */
  private async saveCastMembersToPeopleTable(castMembers: TMDBCastMember[]): Promise<void> {
    if (!castMembers || castMembers.length === 0) return;

    try {
      const peopleData = castMembers.map(member => ({
        tmdb_person_id: member.id,
        name: member.name,
        known_for_department: member.known_for_department,
        popularity: member.popularity,
        gender: member.gender,
        profile_path: member.profile_path,
        profile_url: this.getProfileImageUrl(member.profile_path),
        tmdb_data: member,
        last_updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('people')
        .upsert(peopleData, {
          onConflict: 'tmdb_person_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('[TMDBCast] Error saving cast members:', error);
      } else {
        console.log(`[TMDBCast] Saved ${peopleData.length} cast members to people table`);
      }
    } catch (error) {
      console.error('[TMDBCast] Error in saveCastMembersToPeopleTable:', error);
    }
  }

  /**
   * Save aggregate cast to people table
   */
  private async saveAggregateCastToPeopleTable(castMembers: SeriesAggregateCast[]): Promise<void> {
    if (!castMembers || castMembers.length === 0) return;

    try {
      const peopleData = castMembers.map(member => ({
        tmdb_person_id: member.id,
        name: member.name,
        known_for_department: member.known_for_department,
        popularity: member.popularity,
        gender: member.gender,
        profile_path: member.profile_path,
        profile_url: this.getProfileImageUrl(member.profile_path),
        tmdb_data: member,
        last_updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('people')
        .upsert(peopleData, {
          onConflict: 'tmdb_person_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('[TMDBCast] Error saving aggregate cast:', error);
      } else {
        console.log(`[TMDBCast] Saved ${peopleData.length} series cast to people table`);
      }
    } catch (error) {
      console.error('[TMDBCast] Error in saveAggregateCastToPeopleTable:', error);
    }
  }
}

// Export singleton instance
export const tmdbCastService = new TMDBCastService();