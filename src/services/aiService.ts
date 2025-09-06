import { omdbApi, OMDBMovieDetails } from '../lib/omdb';

export interface AIResponse {
  response: string;
  movies: OMDBMovieDetails[];
  mode: 'ai';
}

class AIService {
  async getRecommendations(query: string, userId?: string): Promise<AIResponse> {
    console.log('[AI Service] Starting recommendations for query:', query);
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const recommendations = this.getRecommendationsForQuery(query);
    console.log('[AI Service] Generated recommendations:', recommendations);
    
    const detailedMovies = await this.enrichWithOMDbData(recommendations);
    console.log('[AI Service] Final detailed movies:', detailedMovies);
    
    return {
      response: `Based on your request "${query}", I've found ${recommendations.length} excellent recommendations for you!`,
      movies: detailedMovies,
      mode: 'ai'
    };
  }

  private getRecommendationsForQuery(query: string) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('scary') || queryLower.includes('horror')) {
      return [
        { title: "Hereditary", year: "2018", imdbId: "tt7784604" },
        { title: "The Babadook", year: "2014", imdbId: "tt2321549" },
        { title: "Get Out", year: "2017", imdbId: "tt5052448" }
      ];
    } else if (queryLower.includes('comedy') || queryLower.includes('funny')) {
      return [
        { title: "The Grand Budapest Hotel", year: "2014", imdbId: "tt2278388" },
        { title: "Superbad", year: "2007", imdbId: "tt0829482" },
        { title: "Knives Out", year: "2019", imdbId: "tt8946378" }
      ];
    } else if (queryLower.includes('action')) {
      return [
        { title: "Mad Max: Fury Road", year: "2015", imdbId: "tt1392190" },
        { title: "John Wick", year: "2014", imdbId: "tt2911666" },
        { title: "The Dark Knight", year: "2008", imdbId: "tt0468569" }
      ];
    } else if (queryLower.includes('tv') || queryLower.includes('series')) {
      return [
        { title: "Breaking Bad", year: "2008", imdbId: "tt0903747" },
        { title: "Stranger Things", year: "2016", imdbId: "tt4574334" },
        { title: "The Office", year: "2005", imdbId: "tt0386676" }
      ];
    } else {
      // Default movie recommendations
      return [
        { title: "The Matrix", year: "1999", imdbId: "tt0133093" },
        { title: "Inception", year: "2010", imdbId: "tt1375666" },
        { title: "Parasite", year: "2019", imdbId: "tt6751668" },
        { title: "Interstellar", year: "2014", imdbId: "tt0816692" },
        { title: "Pulp Fiction", year: "1994", imdbId: "tt0110912" }
      ];
    }
  }

  private async enrichWithOMDbData(recommendations: any[]): Promise<OMDBMovieDetails[]> {
    console.log('[AI Service] Enriching recommendations:', recommendations);
    const enrichedMovies: OMDBMovieDetails[] = [];
    
    for (const rec of recommendations) {
      try {
        console.log(`[AI Service] Fetching details for ${rec.title} (${rec.imdbId})`);
        const movieDetails = await omdbApi.getMovieDetails(rec.imdbId);
        console.log(`[AI Service] Successfully fetched ${rec.title}:`, movieDetails);
        
        // Add AI reasoning to movie
        (movieDetails as any).aiReason = `AI recommended because: ${this.getReasonForMovie(rec.title)}`;
        
        enrichedMovies.push(movieDetails);
      } catch (error) {
        console.error(`[AI Service] Failed to fetch ${rec.title}:`, error);
        // Don't let one failure stop all recommendations - continue with others
      }
    }
    
    console.log('[AI Service] Final enriched movies count:', enrichedMovies.length);
    return enrichedMovies;
  }

  private getReasonForMovie(title: string): string {
    const reasons: { [key: string]: string } = {
      "The Matrix": "Mind-bending sci-fi that redefined cinema",
      "Inception": "Complex narrative structure you'll love",
      "Parasite": "Award-winning thriller with social commentary",
      "Hereditary": "Psychological horror that will haunt you",
      "The Grand Budapest Hotel": "Wes Anderson's whimsical visual comedy",
      "Mad Max: Fury Road": "Non-stop action with incredible practical effects",
      "Breaking Bad": "Masterful character development and storytelling",
      "The Dark Knight": "Perfect blend of action and psychological drama",
      "Superbad": "Hilarious coming-of-age comedy",
      "Knives Out": "Clever murder mystery with great humor",
      "Get Out": "Social thriller with horror elements",
      "The Babadook": "Psychological horror with deeper meaning",
      "John Wick": "Stylish action with amazing choreography",
      "Interstellar": "Emotional sci-fi epic with stunning visuals",
      "Pulp Fiction": "Influential non-linear storytelling",
      "Stranger Things": "Perfect mix of nostalgia and supernatural thriller",
      "The Office": "Hilarious mockumentary-style comedy"
    };
    
    return reasons[title] || "Highly rated and critically acclaimed";
  }
}

export const aiService = new AIService();