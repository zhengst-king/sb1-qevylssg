import { supabase } from '../lib/supabase';
import { geminiRecommendationsApi } from '../lib/gemini-recommendations';
import { omdbApi } from '../lib/omdb';

export class AIService {
  async getRecommendations(query: string, userId?: string): Promise<{ response: string; movies: any[] }> {
    try {
      let watchlistData: any[] = [];
      
      // Only fetch watchlist data if user is authenticated
      if (userId) {
        const { data, error: watchlistError } = await supabase
          .from('movies')
          .select('*')
          .eq('user_id', userId)
          .limit(50);

        if (watchlistError) {
          console.warn('Failed to fetch watchlist:', watchlistError.message);
        } else {
          watchlistData = data || [];
        }
      }

      // Prepare watchlist data for AI services
      const userWatchlistData = {
        movies: watchlistData.filter(item => item.type === 'movie').map(movie => ({
          title: movie.title || '',
          user_rating: movie.user_rating || 0,
          status: movie.status || 'watched',
          date_watched: movie.date_watched,
          imdb_id: movie.imdb_id
        })),
        tv_series: watchlistData.filter(item => item.type === 'series').map(series => ({
          title: series.title || '',
          user_rating: series.user_rating || 0,
          status: series.status || 'watched',
          date_watched: series.date_watched,
          imdb_id: series.imdb_id
        }))
      };

      let aiResponse = '';
      let recommendedMovies: any[] = [];

      // Try Claude first, then fallback to Gemini
      try {
        // Call Supabase Edge Function for Claude recommendations
        const { data: claudeResult, error: claudeError } = await supabase.functions.invoke('recommendations', {
          body: { 
            watchlistData: userWatchlistData,
            query: query
          }
        });
        
        if (claudeError) {
          throw new Error(`Edge function error: ${claudeError.message}`);
        }
        
        aiResponse = `Based on your query "${query}", here are some recommendations:`;
        
        // Get movie details from OMDb for Claude recommendations
        const moviePromises = claudeResult.movies.slice(0, 5).map(async (rec) => {
          try {
            const searchResults = await omdbApi.searchMovies(rec.title);
            if (searchResults.Search && searchResults.Search.length > 0) {
              return await omdbApi.getMovieDetails(searchResults.Search[0].imdbID);
            }
          } catch (error) {
            console.warn(`Failed to fetch details for ${rec.title}:`, error);
          }
          return null;
        });
        
        const movieDetails = await Promise.all(moviePromises);
        recommendedMovies = movieDetails.filter(movie => movie !== null);
      } catch (claudeError) {
        console.warn('Claude recommendations failed, trying Gemini:', claudeError);
        try {
          const geminiResult = await geminiRecommendationsApi.getRecommendations(userWatchlistData);
          aiResponse = `Based on your query "${query}", here are some recommendations:`;
          
          // Get movie details from OMDb for Gemini recommendations
          const moviePromises = geminiResult.movies.slice(0, 5).map(async (rec) => {
            try {
              const searchResults = await omdbApi.searchMovies(rec.title);
              if (searchResults.Search && searchResults.Search.length > 0) {
                return await omdbApi.getMovieDetails(searchResults.Search[0].imdbID);
              }
            } catch (error) {
              console.warn(`Failed to fetch details for ${rec.title}:`, error);
            }
            return null;
          });
          
          const movieDetails = await Promise.all(moviePromises);
          recommendedMovies = movieDetails.filter(movie => movie !== null);
        } catch (geminiError) {
          console.error('Both AI services failed:', geminiError);
          // Fallback to basic search if AI services fail
          try {
            const searchResults = await omdbApi.searchMovies(query);
            if (searchResults.Search) {
              const moviePromises = searchResults.Search.slice(0, 5).map(async (movie) => {
                try {
                  return await omdbApi.getMovieDetails(movie.imdbID);
                } catch (error) {
                  console.warn(`Failed to fetch details for ${movie.imdbID}:`, error);
                  return null;
                }
              });
              
              const movieDetails = await Promise.all(moviePromises);
              recommendedMovies = movieDetails.filter(movie => movie !== null);
              aiResponse = `Here are search results for "${query}":`;
            }
          } catch (searchError) {
            throw new Error('Unable to process your request. Please try again.');
          }
        }
      }

      return {
        response: aiResponse,
        movies: recommendedMovies
      };
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();