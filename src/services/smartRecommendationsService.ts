// src/services/smartRecommendationsService.ts
import { supabase } from '../lib/supabase';
import type { PhysicalMediaCollection } from '../lib/supabase';

export interface Recommendation {
  id: string;
  type: 'collection_gap' | 'format_upgrade' | 'similar_title' | 'franchise_completion' | 'technical_upgrade' | 'price_drop' | 'diversity' | 'trending';
  title: string;
  year?: number;
  imdb_id?: string;
  poster_url?: string;
  reason: string;
  score: number;
  confidence: number;
  urgency: number;
  metadata?: {
    current_format?: string;
    suggested_format?: string;
    franchise_name?: string;
    similar_to?: string[];
    price_info?: {
      current_price: number;
      was_price: number;
      discount_percent: number;
    };
  };
}

export interface UserCollectionProfile {
  total_items: number;
  favorite_genres: string[];
  favorite_directors: string[];
  average_rating: number;
  format_distribution: Record<string, number>;
  decade_preferences: Record<string, number>;
  collection_types: Record<string, number>;
}

class SmartRecommendationsService {
  private readonly OMDB_API_KEY = process.env.VITE_OMDB_API_KEY;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<Recommendation[]> {
    try {
      // Get user's collection data
      const userCollection = await this.getUserCollection(userId);
      if (userCollection.length === 0) {
        return this.getDefaultRecommendations();
      }

      // Analyze user preferences
      const profile = this.analyzeUserProfile(userCollection);
      
      // Generate recommendations from different engines
      const recommendations: Recommendation[] = [];
      
      // 1. Collection Gap Analysis (25% of recommendations)
      const gapRecs = await this.generateCollectionGapRecommendations(userCollection, profile, Math.ceil(limit * 0.25));
      recommendations.push(...gapRecs);

      // 2. Format Upgrade Suggestions (20% of recommendations) 
      const upgradeRecs = this.generateFormatUpgradeRecommendations(userCollection, Math.ceil(limit * 0.2));
      recommendations.push(...upgradeRecs);

      // 3. Similar Titles (30% of recommendations)
      const similarRecs = await this.generateSimilarTitleRecommendations(userCollection, profile, Math.ceil(limit * 0.3));
      recommendations.push(...similarRecs);

      // 4. Franchise Completion (15% of recommendations)
      const franchiseRecs = await this.generateFranchiseCompletionRecommendations(userCollection, profile, Math.ceil(limit * 0.15));
      recommendations.push(...franchiseRecs);

      // 5. Diversity Recommendations (10% of recommendations)
      const diversityRecs = await this.generateDiversityRecommendations(userCollection, profile, Math.ceil(limit * 0.1));
      recommendations.push(...diversityRecs);

      // Sort by final score and return top recommendations
      return recommendations
        .sort((a, b) => this.calculateFinalScore(b) - this.calculateFinalScore(a))
        .slice(0, limit);

    } catch (error) {
      console.error('[Recommendations] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Get user's complete collection
   */
  private async getUserCollection(userId: string): Promise<PhysicalMediaCollection[]> {
    const { data, error } = await supabase
      .from('physical_media_collections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[Recommendations] Error fetching collection:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Analyze user's collection to build preference profile
   */
  private analyzeUserProfile(collection: PhysicalMediaCollection[]): UserCollectionProfile {
    const genres = new Map<string, number>();
    const directors = new Map<string, number>();
    const formats = new Map<string, number>();
    const decades = new Map<string, number>();
    const types = new Map<string, number>();
    
    let totalRating = 0;
    let ratedItems = 0;

    collection.forEach(item => {
      // Analyze genres
      if (item.genre) {
        item.genre.split(',').forEach(genre => {
          const g = genre.trim();
          genres.set(g, (genres.get(g) || 0) + 1);
        });
      }

      // Analyze directors
      if (item.director) {
        directors.set(item.director, (directors.get(item.director) || 0) + 1);
      }

      // Analyze formats
      formats.set(item.format, (formats.get(item.format) || 0) + 1);

      // Analyze decades
      if (item.year) {
        const decade = `${Math.floor(item.year / 10) * 10}s`;
        decades.set(decade, (decades.get(decade) || 0) + 1);
      }

      // Analyze collection types
      const collectionType = item.collection_type || 'owned';
      types.set(collectionType, (types.get(collectionType) || 0) + 1);

      // Calculate average rating
      if (item.personal_rating) {
        totalRating += item.personal_rating;
        ratedItems++;
      }
    });

    return {
      total_items: collection.length,
      favorite_genres: Array.from(genres.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre]) => genre),
      favorite_directors: Array.from(directors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([director]) => director),
      average_rating: ratedItems > 0 ? totalRating / ratedItems : 7.0,
      format_distribution: Object.fromEntries(formats),
      decade_preferences: Object.fromEntries(decades),
      collection_types: Object.fromEntries(types)
    };
  }

  /**
   * 1. Generate Collection Gap Recommendations
   * Find missing movies from directors/franchises user already collects
   */
  private async generateCollectionGapRecommendations(
    collection: PhysicalMediaCollection[],
    profile: UserCollectionProfile,
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find missing movies from favorite directors
    for (const director of profile.favorite_directors.slice(0, 2)) {
      try {
        const searchResults = await this.searchOMDB(`director:"${director}"`);
        
        for (const movie of searchResults.slice(0, 3)) {
          const isOwned = collection.some(item => 
            item.imdb_id === movie.imdbID || 
            (item.title.toLowerCase() === movie.Title.toLowerCase() && item.year === parseInt(movie.Year))
          );

          if (!isOwned && parseFloat(movie.imdbRating) >= 6.5) {
            recommendations.push({
              id: `gap_${movie.imdbID}`,
              type: 'collection_gap',
              title: movie.Title,
              year: parseInt(movie.Year),
              imdb_id: movie.imdbID,
              poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
              reason: `You love ${director}'s work - this one's missing from your collection`,
              score: 0.8,
              confidence: 0.9,
              urgency: 0.3,
              metadata: {
                similar_to: [director]
              }
            });
          }

          if (recommendations.length >= limit) break;
        }
      } catch (error) {
        console.error(`[Recommendations] Error searching for ${director} films:`, error);
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * 2. Generate Format Upgrade Recommendations
   * Suggest better formats for highly-rated owned movies
   */
  private generateFormatUpgradeRecommendations(
    collection: PhysicalMediaCollection[],
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find highly-rated movies in lower formats
    const upgradeableItems = collection
      .filter(item => 
        (item.personal_rating || 0) >= 8 && // Only suggest upgrades for favorites
        (item.collection_type || 'owned') === 'owned' // Only for owned items
      )
      .sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0));

    for (const item of upgradeableItems) {
      let suggestedFormat: string | undefined;
      let score = 0;

      // Determine upgrade path
      if (item.format === 'DVD') {
        suggestedFormat = '4K UHD'; // Skip Blu-ray, go straight to 4K if available
        score = 0.9;
      } else if (item.format === 'Blu-ray') {
        suggestedFormat = '4K UHD';
        score = 0.7;
      }

      if (suggestedFormat) {
        recommendations.push({
          id: `upgrade_${item.id}`,
          type: 'format_upgrade',
          title: item.title,
          year: item.year,
          imdb_id: item.imdb_id,
          poster_url: item.poster_url,
          reason: `Upgrade your ${item.personal_rating}/10 rated favorite to ${suggestedFormat}`,
          score,
          confidence: 0.8,
          urgency: 0.4,
          metadata: {
            current_format: item.format,
            suggested_format: suggestedFormat
          }
        });
      }

      if (recommendations.length >= limit) break;
    }

    return Promise.resolve(recommendations);
  }

  /**
   * 3. Generate Similar Title Recommendations
   * Find movies similar to user's favorites
   */
  private async generateSimilarTitleRecommendations(
    collection: PhysicalMediaCollection[],
    profile: UserCollectionProfile,
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Get user's highest-rated movies to find similar titles
    const favorites = collection
      .filter(item => (item.personal_rating || 0) >= profile.average_rating + 1)
      .slice(0, 3);

    for (const favorite of favorites) {
      try {
        // Search for movies with similar genres
        if (favorite.genre) {
          const primaryGenre = favorite.genre.split(',')[0].trim();
          const searchResults = await this.searchOMDB(`${primaryGenre} ${favorite.year ? Math.floor(favorite.year / 10) * 10 : ''}`);

          for (const movie of searchResults.slice(0, 2)) {
            const isOwned = collection.some(item => 
              item.imdb_id === movie.imdbID ||
              (item.title.toLowerCase() === movie.Title.toLowerCase())
            );

            if (!isOwned && parseFloat(movie.imdbRating) >= profile.average_rating - 0.5) {
              recommendations.push({
                id: `similar_${movie.imdbID}`,
                type: 'similar_title',
                title: movie.Title,
                year: parseInt(movie.Year),
                imdb_id: movie.imdbID,
                poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                reason: `Similar to your favorite: ${favorite.title}`,
                score: 0.7,
                confidence: 0.6,
                urgency: 0.2,
                metadata: {
                  similar_to: [favorite.title]
                }
              });
            }

            if (recommendations.length >= limit) break;
          }
        }
      } catch (error) {
        console.error(`[Recommendations] Error finding similar titles to ${favorite.title}:`, error);
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * 4. Generate Franchise Completion Recommendations
   * Find missing movies in series/franchises user collects
   */
  private async generateFranchiseCompletionRecommendations(
    collection: PhysicalMediaCollection[],
    profile: UserCollectionProfile,
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Define common franchises and series
    const franchises = [
      { name: 'Marvel Cinematic Universe', keywords: ['Iron Man', 'Thor', 'Captain America', 'Avengers', 'Guardians'] },
      { name: 'Star Wars', keywords: ['Star Wars'] },
      { name: 'Harry Potter', keywords: ['Harry Potter'] },
      { name: 'Fast & Furious', keywords: ['Fast', 'Furious'] },
      { name: 'John Wick', keywords: ['John Wick'] },
      { name: 'Mission Impossible', keywords: ['Mission: Impossible'] },
      { name: 'James Bond', keywords: ['Bond', '007'] }
    ];

    for (const franchise of franchises) {
      // Check if user has any movies from this franchise
      const ownedInFranchise = collection.filter(item =>
        franchise.keywords.some(keyword =>
          item.title.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      if (ownedInFranchise.length > 0) {
        try {
          // Search for more movies in this franchise
          const searchResults = await this.searchOMDB(franchise.keywords[0]);
          
          for (const movie of searchResults) {
            const isOwned = collection.some(item =>
              item.imdb_id === movie.imdbID ||
              item.title.toLowerCase() === movie.Title.toLowerCase()
            );

            if (!isOwned && parseFloat(movie.imdbRating) >= 6.0) {
              recommendations.push({
                id: `franchise_${movie.imdbID}`,
                type: 'franchise_completion',
                title: movie.Title,
                year: parseInt(movie.Year),
                imdb_id: movie.imdbID,
                poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                reason: `Complete your ${franchise.name} collection`,
                score: 0.8,
                confidence: 0.7,
                urgency: 0.5,
                metadata: {
                  franchise_name: franchise.name
                }
              });
            }

            if (recommendations.length >= limit) break;
          }
        } catch (error) {
          console.error(`[Recommendations] Error searching ${franchise.name}:`, error);
        }
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * 5. Generate Diversity Recommendations
   * Suggest movies from underrepresented genres/eras in collection
   */
  private async generateDiversityRecommendations(
    collection: PhysicalMediaCollection[],
    profile: UserCollectionProfile,
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find underrepresented genres
    const allGenres = ['Drama', 'Comedy', 'Action', 'Thriller', 'Horror', 'Sci-Fi', 'Romance', 'Documentary'];
    const underrepresentedGenres = allGenres.filter(genre => 
      !profile.favorite_genres.includes(genre)
    ).slice(0, 2);

    for (const genre of underrepresentedGenres) {
      try {
        const searchResults = await this.searchOMDB(`${genre} acclaimed`);
        
        for (const movie of searchResults.slice(0, 2)) {
          const isOwned = collection.some(item => 
            item.imdb_id === movie.imdbID
          );

          if (!isOwned && parseFloat(movie.imdbRating) >= 7.5) {
            recommendations.push({
              id: `diversity_${movie.imdbID}`,
              type: 'diversity',
              title: movie.Title,
              year: parseInt(movie.Year),
              imdb_id: movie.imdbID,
              poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
              reason: `Branch out: Highly acclaimed ${genre} film`,
              score: 0.6,
              confidence: 0.5,
              urgency: 0.1
            });
          }

          if (recommendations.length >= limit) break;
        }
      } catch (error) {
        console.error(`[Recommendations] Error searching ${genre}:`, error);
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Search OMDB API for movies
   */
  private async searchOMDB(searchTerm: string): Promise<any[]> {
    if (!this.OMDB_API_KEY) {
      console.warn('[Recommendations] OMDB API key not configured');
      return [];
    }

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&type=movie&apikey=${this.OMDB_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.Response === 'True') {
        // Get detailed info for each movie
        const detailedMovies = await Promise.all(
          data.Search.slice(0, 5).map(async (movie: any) => {
            const detailResponse = await fetch(
              `https://www.omdbapi.com/?i=${movie.imdbID}&apikey=${this.OMDB_API_KEY}`
            );
            return await detailResponse.json();
          })
        );
        
        return detailedMovies.filter(movie => movie.Response === 'True');
      }
      
      return [];
    } catch (error) {
      console.error('[Recommendations] OMDB search error:', error);
      return [];
    }
  }

  /**
   * Calculate final recommendation score
   */
  private calculateFinalScore(rec: Recommendation): number {
    return (rec.score * 0.4) + (rec.confidence * 0.3) + (rec.urgency * 0.3);
  }

  /**
   * Get default recommendations for new users
   */
  private getDefaultRecommendations(): Recommendation[] {
    return [
      {
        id: 'default_1',
        type: 'trending',
        title: 'The Dark Knight',
        year: 2008,
        reason: 'Essential collection starter - acclaimed superhero film',
        score: 0.9,
        confidence: 1.0,
        urgency: 0.2
      },
      {
        id: 'default_2', 
        type: 'trending',
        title: 'Inception',
        year: 2010,
        reason: 'Mind-bending thriller perfect for 4K format',
        score: 0.85,
        confidence: 1.0,
        urgency: 0.2
      }
    ];
  }

  /**
   * Get cached recommendations for user
   */
  async getCachedRecommendations(userId: string): Promise<Recommendation[]> {
    // In a production app, you'd cache recommendations in database/Redis
    // For now, we'll generate them fresh each time
    return this.generateRecommendations(userId);
  }
}

// Export singleton instance
export const smartRecommendationsService = new SmartRecommendationsService();