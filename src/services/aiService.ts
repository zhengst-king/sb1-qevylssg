import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { supabase } from '../lib/supabase';

export interface AIResponse {
  response: string;
  movies: OMDBMovieDetails[];
  mode: 'ai';
}

interface ClaudeRecommendation {
  title: string;
  reason: string;
  imdbID?: string;
}

interface ClaudeRecommendations {
  movies: ClaudeRecommendation[];
  tv_series: ClaudeRecommendation[];
}

interface UserWatchlistItem {
  title: string;
  user_rating?: number;
  status: string;
  date_watched?: string;
  imdb_id?: string;
}

class AIService {
  
  async getRecommendations(query: string, userId?: string): Promise<AIResponse> {
    console.log('[AI Service] Starting recommendations for query:', query);
    console.log('[AI Service] User ID:', userId);
    
    try {
      // For logged-in users, try to get personalized recommendations
      if (userId) {
        console.log('[AI Service] User is logged in, attempting personalized recommendations');
        return await this.getPersonalizedRecommendations(query, userId);
      } else {
        console.log('[AI Service] User not logged in, using general recommendations');
        return await this.getGeneralRecommendations(query);
      }
      
    } catch (error) {
      console.error('[AI Service] Claude API failed:', error);
      
      // Return error response instead of fallback recommendations
      return {
        response: `I'm unable to get AI recommendations right now due to a service error: ${error.message}. Please try again later or contact support if the issue persists.`,
        movies: [],
        mode: 'ai'
      };
    }
  }

  private async getPersonalizedRecommendations(query: string, userId: string): Promise<AIResponse> {
    console.log('[AI Service] Getting personalized recommendations');
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get user's watchlist data
    const watchlistData = await this.getUserWatchlistData(userId);
    console.log('[AI Service] User watchlist data:', {
      movieCount: watchlistData.movies.length,
      tvCount: watchlistData.tv_series.length
    });
    
    if (watchlistData.movies.length === 0 && watchlistData.tv_series.length === 0) {
      console.log('[AI Service] No watchlist data found, using general recommendations');
      return await this.getGeneralRecommendations(query);
    }

    // Call your existing Supabase Edge Function
    const claudeRecommendations = await this.callSupabaseEdgeFunction(watchlistData);
    
    // Filter out titles already in user's watchlist
    const filteredRecommendations = this.filterExistingWatchlistItems(claudeRecommendations, watchlistData);
    
    // Determine which type of recommendations to return based on query
    const queryLower = query.toLowerCase();
    const isTVQuery = queryLower.includes('tv') || queryLower.includes('series');
    const isMovieQuery = queryLower.includes('movie') || (!isTVQuery && !queryLower.includes('tv'));
    
    let recommendationsToProcess: ClaudeRecommendation[] = [];
    let responseText = '';
    
    if (isTVQuery) {
      recommendationsToProcess = filteredRecommendations.tv_series.slice(0, 10);
      responseText = `Based on your viewing history and ratings, I've found ${recommendationsToProcess.length} TV series recommendations tailored specifically for you!`;
    } else if (isMovieQuery) {
      recommendationsToProcess = filteredRecommendations.movies.slice(0, 10);
      responseText = `Based on your viewing history and ratings, I've found ${recommendationsToProcess.length} movie recommendations tailored specifically for you!`;
    } else {
      // Mix of both - 6 movies, 4 TV shows
      recommendationsToProcess = [
        ...filteredRecommendations.movies.slice(0, 6),
        ...filteredRecommendations.tv_series.slice(0, 4)
      ];
      responseText = `Based on your viewing preferences, I've curated ${recommendationsToProcess.length} personalized recommendations just for you!`;
    }

    // Check if we have enough recommendations after filtering
    if (recommendationsToProcess.length === 0) {
      return {
        response: `I couldn't find any new recommendations that aren't already in your watchlist. Try adding more movies to your watchlist or asking for a different genre!`,
        movies: [],
        mode: 'ai'
      };
    }

    // Enrich with OMDb data
    const detailedMovies = await this.enrichWithOMDbData(recommendationsToProcess);
    
    return {
      response: responseText,
      movies: detailedMovies,
      mode: 'ai'
    };
  }

  private async getGeneralRecommendations(query: string): Promise<AIResponse> {
    console.log('[AI Service] Getting general recommendations for query:', query);
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create minimal watchlist for general recommendations
    const generalWatchlist = {
      movies: [],
      tv_series: []
    };

    console.log('[AI Service] Calling Supabase Edge Function for general recommendations');
    const claudeRecommendations = await this.callSupabaseEdgeFunction(generalWatchlist);
    
    // Determine what to return based on query
    const queryLower = query.toLowerCase();
    const isTVQuery = queryLower.includes('tv') || queryLower.includes('series');
    
    let recommendationsToProcess: ClaudeRecommendation[] = [];
    let responseText = '';
    
    if (isTVQuery) {
      recommendationsToProcess = claudeRecommendations.tv_series.slice(0, 10);
      responseText = `Based on your request for "${query}", I've found ${recommendationsToProcess.length} great TV series recommendations!`;
    } else {
      recommendationsToProcess = claudeRecommendations.movies.slice(0, 10);
      responseText = `Based on your request for "${query}", I've found ${recommendationsToProcess.length} excellent movie recommendations!`;
    }

    const detailedMovies = await this.enrichWithOMDbData(recommendationsToProcess);
    
    return {
      response: responseText,
      movies: detailedMovies,
      mode: 'ai'
    };
  }

  private async callSupabaseEdgeFunction(watchlistData: any): Promise<ClaudeRecommendations> {
    try {
      console.log('[AI Service] Calling Supabase Edge Function with watchlist data:', watchlistData);
      
      // Use Supabase client's functions.invoke method for proper authentication
      const { data, error } = await supabase.functions.invoke('recommendations', {
        body: { watchlistData }
      });

      console.log('[AI Service] Supabase Edge Function response:', { data, error });
      
      if (error) {
        console.error('[AI Service] Supabase Edge Function error:', error);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Edge Function');
      }

      // Validate the response structure
      if (!data.movies && !data.tv_series) {
        console.error('[AI Service] Invalid response structure:', data);
        throw new Error('Invalid response format from Edge Function');
      }
      
      return {
        movies: data.movies || [],
        tv_series: data.tv_series || []
      };
      
    } catch (error) {
      console.error('[AI Service] Error calling Supabase Edge Function:', error);
      throw error;
    }
  }

  private filterExistingWatchlistItems(
    recommendations: ClaudeRecommendations, 
    watchlistData: { movies: UserWatchlistItem[]; tv_series: UserWatchlistItem[] }
  ): ClaudeRecommendations {
    console.log('[AI Service] Filtering out existing watchlist items');
    
    // Create sets of existing titles and IMDb IDs for quick lookup
    const existingMovieTitles = new Set(
      watchlistData.movies.map(item => item.title.toLowerCase().trim())
    );
    const existingMovieImdbIds = new Set(
      watchlistData.movies.map(item => item.imdb_id).filter(Boolean)
    );
    
    const existingTVTitles = new Set(
      watchlistData.tv_series.map(item => item.title.toLowerCase().trim())
    );
    const existingTVImdbIds = new Set(
      watchlistData.tv_series.map(item => item.imdb_id).filter(Boolean)
    );

    // Filter movie recommendations
    const filteredMovies = recommendations.movies.filter(rec => {
      const titleMatch = existingMovieTitles.has(rec.title.toLowerCase().trim());
      const imdbMatch = rec.imdbID && existingMovieImdbIds.has(rec.imdbID);
      const shouldExclude = titleMatch || imdbMatch;
      
      if (shouldExclude) {
        console.log(`[AI Service] Filtering out existing movie: ${rec.title}`);
      }
      
      return !shouldExclude;
    });

    // Filter TV series recommendations  
    const filteredTVSeries = recommendations.tv_series.filter(rec => {
      const titleMatch = existingTVTitles.has(rec.title.toLowerCase().trim());
      const imdbMatch = rec.imdbID && existingTVImdbIds.has(rec.imdbID);
      const shouldExclude = titleMatch || imdbMatch;
      
      if (shouldExclude) {
        console.log(`[AI Service] Filtering out existing TV series: ${rec.title}`);
      }
      
      return !shouldExclude;
    });

    console.log('[AI Service] Filtering results:', {
      originalMovies: recommendations.movies.length,
      filteredMovies: filteredMovies.length,
      originalTVSeries: recommendations.tv_series.length,
      filteredTVSeries: filteredTVSeries.length
    });

    return {
      movies: filteredMovies,
      tv_series: filteredTVSeries
    };
  }

  private async getUserWatchlistData(userId: string) {
    try {
      console.log('[AI Service] Fetching watchlist for user:', userId);
      
      // Fetch user's movies
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('title, user_rating, status, date_watched, imdb_id')
        .eq('user_id', userId)
        .eq('media_type', 'movie');

      if (moviesError) {
        console.error('[AI Service] Error fetching movies:', moviesError);
        throw moviesError;
      }

      // Fetch user's TV series
      const { data: tvSeries, error: tvError } = await supabase
        .from('movies')
        .select('title, user_rating, status, date_watched, imdb_id')
        .eq('user_id', userId)
        .eq('media_type', 'series');

      if (tvError) {
        console.error('[AI Service] Error fetching TV series:', tvError);
        throw tvError;
      }

      const result = {
        movies: movies || [],
        tv_series: tvSeries || []
      };
      
      console.log('[AI Service] Fetched watchlist data:', result);
      return result;
      
    } catch (error) {
      console.error('[AI Service] Error fetching watchlist data:', error);
      return { movies: [], tv_series: [] };
    }
  }

  private async enrichWithOMDbData(recommendations: ClaudeRecommendation[]): Promise<OMDBMovieDetails[]> {
    console.log('[AI Service] Enriching recommendations with OMDb data:', recommendations);
    const enrichedMovies: OMDBMovieDetails[] = [];
    
    for (const rec of recommendations) {
      try {
        if (!rec.imdbID) {
          console.warn(`[AI Service] No IMDb ID for ${rec.title}, skipping`);
          continue;
        }
        
        console.log(`[AI Service] Fetching details for ${rec.title} (${rec.imdbID})`);
        const movieDetails = await omdbApi.getMovieDetails(rec.imdbID);
        console.log(`[AI Service] Successfully fetched ${rec.title}`);
        
        // Add Claude's reasoning to the movie object
        (movieDetails as any).aiReason = rec.reason;
        (movieDetails as any).claudeRecommended = true;
        
        enrichedMovies.push(movieDetails);
      } catch (error) {
        console.error(`[AI Service] Failed to fetch ${rec.title}:`, error);
        // Continue with other movies even if one fails
      }
    }
    
    console.log('[AI Service] Final enriched movies count:', enrichedMovies.length);
    return enrichedMovies;
  }
}

export const aiService = new AIService();