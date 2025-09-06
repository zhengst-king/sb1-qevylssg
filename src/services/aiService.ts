import { supabase } from '../lib/supabase';
import { getClaudeRecommendations } from '../lib/claude-recommendations';
import { getGeminiRecommendations } from '../lib/gemini-recommendations';
import { searchMovies } from '../lib/omdb';

export class AIService {
  async getRecommendations(userId: string, limit: number = 10) {
    try {
      // Fetch user's watchlist data
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlist_items')
        .select(`
          *,
          movies (*)
        `)
        .eq('user_id', userId)
        .limit(50); // Get recent watchlist items for context

      if (watchlistError) {
        throw new Error(`Failed to fetch watchlist: ${watchlistError.message}`);
      }

      if (!watchlistData || watchlistData.length === 0) {
        return [];
      }

      // Extract movie titles and genres for recommendation context
      const watchedMovies = watchlistData.map(item => ({
        title: item.movies?.title || '',
        genre: item.movies?.genre || '',
        year: item.movies?.year || '',
        rating: item.rating || 0
      }));

      let recommendedTitles: string[] = [];

      // Try Claude first, then fallback to Gemini
      try {
        recommendedTitles = await getClaudeRecommendations(watchedMovies, limit);
      } catch (claudeError) {
        console.warn('Claude recommendations failed, trying Gemini:', claudeError);
        try {
          recommendedTitles = await getGeminiRecommendations(watchedMovies, limit);
        } catch (geminiError) {
          console.error('Both AI services failed:', geminiError);
          throw new Error('AI recommendation services are currently unavailable');
        }
      }

      // Fetch detailed movie information from OMDb
      const detailedRecommendations = await Promise.allSettled(
        recommendedTitles.map(async (title) => {
          const searchResults = await searchMovies(title);
          return searchResults.length > 0 ? searchResults[0] : null;
        })
      );

      // Filter out failed requests and null results
      const validRecommendations = detailedRecommendations
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      return validRecommendations;
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();