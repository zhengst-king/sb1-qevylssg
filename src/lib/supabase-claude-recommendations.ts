// src/lib/supabase-claude-recommendations.ts
import { supabase } from './supabase';

export interface ClaudeRecommendation {
  title: string;
  reason: string;
  imdbID?: string;
}

export interface ClaudeRecommendations {
  movies: ClaudeRecommendation[];
  tv_series: ClaudeRecommendation[];
}

interface UserWatchlistData {
  movies: Array<{
    title: string;
    user_rating?: number;
    status: string;
    date_watched?: string;
    imdb_id?: string;
  }>;
  tv_series: Array<{
    title: string;
    user_rating?: number;
    status: string;
    date_watched?: string;
    imdb_id?: string;
  }>;
}

/**
 * Call the Supabase Edge Functions to get Claude-powered recommendations
 * This uses your properly configured server-side Claude API key
 */
export async function getClaudeRecommendations(userId: string): Promise<ClaudeRecommendations> {
  console.log('[Supabase Claude] Getting recommendations for user:', userId);

  try {
    // Get user's watchlist data from Supabase
    const { data: userMovies, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId);

    if (moviesError) {
      throw new Error(`Failed to fetch user watchlist: ${moviesError.message}`);
    }

    if (!userMovies || userMovies.length === 0) {
      throw new Error('No watchlist data found. Please add some movies and rate them first.');
    }

    // Separate movies and TV series, filter for rated items
    const movies = userMovies
      .filter(m => m.media_type === 'movie' && m.user_rating && m.user_rating > 0)
      .map(m => ({
        title: m.title,
        user_rating: m.user_rating,
        status: m.status,
        date_watched: m.date_watched,
        imdb_id: m.imdb_id
      }));

    const tv_series = userMovies
      .filter(m => m.media_type === 'series' && m.user_rating && m.user_rating > 0)
      .map(m => ({
        title: m.title,
        user_rating: m.user_rating,
        status: m.status,
        date_watched: m.date_watched,
        imdb_id: m.imdb_id
      }));

    console.log('[Supabase Claude] Prepared watchlist data:', {
      moviesCount: movies.length,
      tvSeriesCount: tv_series.length
    });

    if (movies.length === 0 && tv_series.length === 0) {
      throw new Error('No rated movies or TV series found. Please rate some items in your watchlist first.');
    }

    const watchlistData: UserWatchlistData = {
      movies,
      tv_series
    };

    // Call the Supabase Edge Function
    console.log('[Supabase Claude] Calling Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('recommendations', {
      body: { watchlistData }
    });

    if (error) {
      console.error('[Supabase Claude] Edge Function error:', error);
      throw new Error(`Recommendation service error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No recommendations received from service');
    }

    console.log('[Supabase Claude] Received recommendations:', {
      moviesCount: data.movies?.length || 0,
      tvSeriesCount: data.tv_series?.length || 0
    });

    // Validate response structure
    if (!data.movies || !data.tv_series) {
      throw new Error('Invalid recommendation format received from service');
    }

    return {
      movies: data.movies || [],
      tv_series: data.tv_series || []
    };

  } catch (error) {
    console.error('[Supabase Claude] Error getting recommendations:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to get AI recommendations. Please try again later.');
  }
}

/**
 * Test the connection to the Supabase Edge Functions
 */
export async function testClaudeRecommendationsService(): Promise<{ success: boolean; error?: string }> {
  try {
    // Make a simple test call with minimal data
    const testData: UserWatchlistData = {
      movies: [
        {
          title: "The Shawshank Redemption",
          user_rating: 9,
          status: "Watched",
          imdb_id: "tt0111161"
        }
      ],
      tv_series: []
    };

    const { data, error } = await supabase.functions.invoke('recommendations', {
      body: { watchlistData: testData }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || !data.movies || !data.tv_series) {
      return { success: false, error: 'Invalid response format' };
    }

    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}