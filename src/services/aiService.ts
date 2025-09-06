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

class AIService {
  async getRecommendations(query: string, userId?: string): Promise<AIResponse> {
    console.log('[AI Service] Starting recommendations for query:', query);
    
    try {
      // Determine if we should get personalized recommendations or use query-based suggestions
      const shouldUsePersonalized = userId && this.isPersonalizedQuery(query);
      
      if (shouldUsePersonalized) {
        console.log('[AI Service] Using personalized Claude recommendations');
        return await this.getPersonalizedRecommendations(query, userId);
      } else {
        console.log('[AI Service] Using query-based recommendations');
        return await this.getQueryBasedRecommendations(query);
      }
      
    } catch (error) {
      console.error('[AI Service] Error getting recommendations:', error);
      // Fallback to mock recommendations if Claude API fails
      return await this.getFallbackRecommendations(query);
    }
  }

  private isPersonalizedQuery(query: string): boolean {
    const personalizedPatterns = [
      /movies.*you.*may.*like/i,
      /tv.*you.*may.*like/i,
      /recommend.*movies?.*for.*me/i,
      /suggest.*based.*on.*my/i,
      /what.*should.*i.*watch/i,
      /personalized/i,
      /my.*preferences/i
    ];
    
    return personalizedPatterns.some(pattern => pattern.test(query));
  }

  private async getPersonalizedRecommendations(query: string, userId: string): Promise<AIResponse> {
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get user's watchlist data
    const watchlistData = await this.getUserWatchlistData(userId);
    
    if (watchlistData.movies.length === 0 && watchlistData.tv_series.length === 0) {
      console.log('[AI Service] No watchlist data found, falling back to query-based recommendations');
      return await this.getQueryBasedRecommendations(query);
    }

    // Call your existing Claude recommendations API
    const claudeRecommendations = await this.callClaudeRecommendationsAPI(watchlistData);
    
    // Determine which type of recommendations to return based on query
    const isMovieQuery = query.toLowerCase().includes('movie');
    const isTVQuery = query.toLowerCase().includes('tv') || query.toLowerCase().includes('series');
    
    let recommendationsToProcess: ClaudeRecommendation[] = [];
    let responseText = '';
    
    if (isTVQuery) {
      recommendationsToProcess = claudeRecommendations.tv_series.slice(0, 5);
      responseText = `Based on your viewing history and ratings, I've found ${recommendationsToProcess.length} TV series recommendations tailored specifically for you!`;
    } else if (isMovieQuery || !isTVQuery) {
      recommendationsToProcess = claudeRecommendations.movies.slice(0, 5);
      responseText = `Based on your viewing history and ratings, I've found ${recommendationsToProcess.length} movie recommendations tailored specifically for you!`;
    } else {
      // Mix of both
      recommendationsToProcess = [
        ...claudeRecommendations.movies.slice(0, 3),
        ...claudeRecommendations.tv_series.slice(0, 2)
      ];
      responseText = `Based on your viewing preferences, I've curated ${recommendationsToProcess.length} personalized recommendations just for you!`;
    }

    // Enrich with OMDb data
    const detailedMovies = await this.enrichWithOMDbData(recommendationsToProcess);
    
    return {
      response: responseText,
      movies: detailedMovies,
      mode: 'ai'
    };
  }

  private async getUserWatchlistData(userId: string) {
    try {
      // Fetch user's movies
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('title, user_rating, status, date_watched, imdb_id')
        .eq('user_id', userId)
        .eq('media_type', 'movie');

      if (moviesError) throw moviesError;

      // Fetch user's TV series
      const { data: tvSeries, error: tvError } = await supabase
        .from('movies')
        .select('title, user_rating, status, date_watched, imdb_id')
        .eq('user_id', userId)
        .eq('media_type', 'series');

      if (tvError) throw tvError;

      return {
        movies: movies || [],
        tv_series: tvSeries || []
      };
    } catch (error) {
      console.error('[AI Service] Error fetching watchlist data:', error);
      return { movies: [], tv_series: [] };
    }
  }

  private async callClaudeRecommendationsAPI(watchlistData: any): Promise<ClaudeRecommendations> {
    try {
      console.log('[AI Service] Calling Claude recommendations API');
      
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watchlistData }),
      });

      if (!response.ok) {
        throw new Error(`Claude API responded with status: ${response.status}`);
      }

      const recommendations = await response.json();
      console.log('[AI Service] Claude recommendations received:', recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('[AI Service] Error calling Claude API:', error);
      throw error;
    }
  }

  private async getQueryBasedRecommendations(query: string): Promise<AIResponse> {
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const recommendations = this.getRecommendationsForQuery(query);
    console.log('[AI Service] Generated query-based recommendations:', recommendations);
    
    const detailedMovies = await this.enrichWithOMDbData(recommendations);
    
    return {
      response: `Based on your request "${query}", I've found ${recommendations.length} excellent recommendations for you!`,
      movies: detailedMovies,
      mode: 'ai'
    };
  }

  private getRecommendationsForQuery(query: string): ClaudeRecommendation[] {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('scary') || queryLower.includes('horror')) {
      return [
        { title: "Hereditary", imdbID: "tt7784604", reason: "Psychological horror that will haunt you" },
        { title: "The Babadook", imdbID: "tt2321549", reason: "Psychological horror with deeper meaning" },
        { title: "Get Out", imdbID: "tt5052448", reason: "Social thriller with horror elements" },
        { title: "Midsommar", imdbID: "tt8772262", reason: "Disturbing folk horror masterpiece" },
        { title: "The Witch", imdbID: "tt4263482", reason: "Atmospheric period horror" }
      ];
    } else if (queryLower.includes('comedy') || queryLower.includes('funny')) {
      return [
        { title: "The Grand Budapest Hotel", imdbID: "tt2278388", reason: "Wes Anderson's whimsical visual comedy" },
        { title: "Superbad", imdbID: "tt0829482", reason: "Hilarious coming-of-age comedy" },
        { title: "Knives Out", imdbID: "tt8946378", reason: "Clever murder mystery with great humor" },
        { title: "The Nice Guys", imdbID: "tt3799694", reason: "Buddy cop comedy with sharp wit" },
        { title: "Hunt for the Wilderpeople", imdbID: "tt4698684", reason: "Heartwarming New Zealand adventure comedy" }
      ];
    } else if (queryLower.includes('action')) {
      return [
        { title: "Mad Max: Fury Road", imdbID: "tt1392190", reason: "Non-stop action with incredible practical effects" },
        { title: "John Wick", imdbID: "tt2911666", reason: "Stylish action with amazing choreography" },
        { title: "The Dark Knight", imdbID: "tt0468569", reason: "Perfect blend of action and psychological drama" },
        { title: "Mission: Impossible - Fallout", imdbID: "tt4912910", reason: "Incredible stunts and tight pacing" },
        { title: "Atomic Blonde", imdbID: "tt2406566", reason: "Stylish spy thriller with great action sequences" }
      ];
    } else if (queryLower.includes('tv') || queryLower.includes('series')) {
      return [
        { title: "Breaking Bad", imdbID: "tt0903747", reason: "Masterful character development and storytelling" },
        { title: "Stranger Things", imdbID: "tt4574334", reason: "Perfect mix of nostalgia and supernatural thriller" },
        { title: "The Office", imdbID: "tt0386676", reason: "Hilarious mockumentary-style comedy" },
        { title: "True Detective", imdbID: "tt2356777", reason: "Anthology crime series with stellar performances" },
        { title: "The Bear", imdbID: "tt14452776", reason: "Intense workplace comedy-drama" }
      ];
    } else if (queryLower.includes('trending') || queryLower.includes('popular')) {
      return [
        { title: "Everything Everywhere All at Once", imdbID: "tt6710474", reason: "Creative multiverse adventure that's hugely popular" },
        { title: "Top Gun: Maverick", imdbID: "tt1745960", reason: "Blockbuster sequel that exceeded all expectations" },
        { title: "Dune", imdbID: "tt1160419", reason: "Epic sci-fi with stunning cinematography" },
        { title: "The Batman", imdbID: "tt1877830", reason: "Dark and gripping take on the Dark Knight" },
        { title: "Spider-Man: No Way Home", imdbID: "tt10872600", reason: "Multiverse spectacle that broke box office records" }
      ];
    } else {
      // Default highly-rated recommendations
      return [
        { title: "The Matrix", imdbID: "tt0133093", reason: "Mind-bending sci-fi that redefined cinema" },
        { title: "Inception", imdbID: "tt1375666", reason: "Complex narrative structure you'll love" },
        { title: "Parasite", imdbID: "tt6751668", reason: "Award-winning thriller with social commentary" },
        { title: "Interstellar", imdbID: "tt0816692", reason: "Emotional sci-fi epic with stunning visuals" },
        { title: "Pulp Fiction", imdbID: "tt0110912", reason: "Influential non-linear storytelling" }
      ];
    }
  }

  private async getFallbackRecommendations(query: string): Promise<AIResponse> {
    console.log('[AI Service] Using fallback recommendations');
    
    // Simulate brief thinking time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const recommendations = this.getRecommendationsForQuery(query);
    const detailedMovies = await this.enrichWithOMDbData(recommendations);
    
    return {
      response: `I've found ${recommendations.length} great recommendations for you! (Note: For personalized suggestions, try signing in and building your watchlist.)`,
      movies: detailedMovies,
      mode: 'ai'
    };
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