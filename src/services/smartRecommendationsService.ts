// src/services/smartRecommendationsService.ts
import { omdbApi } from '../lib/omdb';
import type { PhysicalMediaCollection } from '../lib/supabase';

// Core recommendation interfaces
export interface RecommendationScore {
  relevance: number; // 0-1, how relevant to user's interests
  confidence: number; // 0-1, how confident we are in this recommendation
  urgency: number; // 0-1, how time-sensitive this recommendation is
}

export interface MovieRecommendation {
  imdb_id: string;
  title: string;
  year?: number;
  genre?: string;
  director?: string;
  poster_url?: string;
  imdb_rating?: number;
  plot?: string;
  
  // Recommendation metadata
  recommendation_type: 'collection_gap' | 'format_upgrade' | 'similar_title';
  reasoning: string;
  score: RecommendationScore;
  source_items: string[]; // IDs of collection items that influenced this recommendation
  suggested_format?: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
}

export interface UserProfile {
  favorite_genres: Array<{ genre: string; count: number; avg_rating: number }>;
  favorite_directors: Array<{ director: string; count: number; avg_rating: number }>;
  format_preferences: Array<{ format: string; count: number }>;
  rating_pattern: {
    avg_rating: number;
    high_rated_threshold: number; // What this user considers "high rated"
    rating_count: number;
  };
  collection_stats: {
    total_items: number;
    owned_items: number;
    wishlist_items: number;
    most_collected_decade: string;
  };
}

export interface RecommendationFilters {
  types?: Array<'collection_gap' | 'format_upgrade' | 'similar_title'>;
  min_confidence?: number;
  max_results?: number;
  exclude_owned?: boolean;
  exclude_wishlist?: boolean;
}

class SmartRecommendationsService {
  private readonly MIN_COLLECTION_SIZE = 3; // Minimum items needed for recommendations
  private readonly FORMAT_HIERARCHY = ['DVD', 'Blu-ray', '4K UHD', '3D Blu-ray'];
  private readonly OMDB_REQUEST_DELAY = 300; // Delay between OMDB requests

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(
    collections: PhysicalMediaCollection[],
    filters: RecommendationFilters = {}
  ): Promise<MovieRecommendation[]> {
    try {
      console.log('[SmartRecommendations] Starting recommendation generation');
      console.log('[SmartRecommendations] Collection size:', collections.length);

      if (collections.length < this.MIN_COLLECTION_SIZE) {
        console.log('[SmartRecommendations] Collection too small for meaningful recommendations');
        return [];
      }

      // Analyze user profile
      const userProfile = this.analyzeUserProfile(collections);
      console.log('[SmartRecommendations] User profile:', userProfile);

      const allRecommendations: MovieRecommendation[] = [];

      // Apply enabled recommendation types (default: all enabled)
      const enabledTypes = filters.types || ['collection_gap', 'format_upgrade', 'similar_title'];

      if (enabledTypes.includes('collection_gap')) {
        console.log('[SmartRecommendations] Running Collection Gap Analysis...');
        const gapRecommendations = await this.findCollectionGaps(collections, userProfile);
        allRecommendations.push(...gapRecommendations);
      }

      if (enabledTypes.includes('format_upgrade')) {
        console.log('[SmartRecommendations] Running Format Upgrade Analysis...');
        const upgradeRecommendations = await this.findFormatUpgrades(collections, userProfile);
        allRecommendations.push(...upgradeRecommendations);
      }

      if (enabledTypes.includes('similar_title')) {
        console.log('[SmartRecommendations] Running Similar Titles Analysis...');
        const similarRecommendations = await this.findSimilarTitles(collections, userProfile);
        allRecommendations.push(...similarRecommendations);
      }

      // Filter and rank recommendations
      let filteredRecommendations = this.filterRecommendations(allRecommendations, collections, filters);
      filteredRecommendations = this.rankRecommendations(filteredRecommendations);

      console.log('[SmartRecommendations] Generated', filteredRecommendations.length, 'recommendations');
      return filteredRecommendations.slice(0, filters.max_results || 20);

    } catch (error) {
      console.error('[SmartRecommendations] Error generating recommendations:', error);
      return this.getFallbackRecommendations(collections);
    }
  }

  /**
   * Analyze user's collection to build a preference profile
   */
  private analyzeUserProfile(collections: PhysicalMediaCollection[]): UserProfile {
    const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
    const wishlistItems = collections.filter(item => item.collection_type === 'wishlist');

    // Analyze genres
    const genreMap = new Map<string, { count: number; ratings: number[] }>();
    ownedItems.forEach(item => {
      if (item.genre) {
        const genres = item.genre.split(',').map(g => g.trim());
        genres.forEach(genre => {
          if (!genreMap.has(genre)) {
            genreMap.set(genre, { count: 0, ratings: [] });
          }
          const entry = genreMap.get(genre)!;
          entry.count++;
          if (item.personal_rating) {
            entry.ratings.push(item.personal_rating);
          }
        });
      }
    });

    const favorite_genres = Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        avg_rating: data.ratings.length > 0 ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Analyze directors
    const directorMap = new Map<string, { count: number; ratings: number[] }>();
    ownedItems.forEach(item => {
      if (item.director) {
        const directors = item.director.split(',').map(d => d.trim());
        directors.forEach(director => {
          if (!directorMap.has(director)) {
            directorMap.set(director, { count: 0, ratings: [] });
          }
          const entry = directorMap.get(director)!;
          entry.count++;
          if (item.personal_rating) {
            entry.ratings.push(item.personal_rating);
          }
        });
      }
    });

    const favorite_directors = Array.from(directorMap.entries())
      .map(([director, data]) => ({
        director,
        count: data.count,
        avg_rating: data.ratings.length > 0 ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Analyze formats
    const formatMap = new Map<string, number>();
    ownedItems.forEach(item => {
      formatMap.set(item.format, (formatMap.get(item.format) || 0) + 1);
    });

    const format_preferences = Array.from(formatMap.entries())
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => b.count - a.count);

    // Analyze rating patterns
    const ratings = ownedItems.filter(item => item.personal_rating).map(item => item.personal_rating!);
    const avg_rating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 7;
    const high_rated_threshold = Math.max(avg_rating + 1, 8); // User's high rating threshold

    // Analyze decades
    const decades = ownedItems
      .filter(item => item.year)
      .map(item => Math.floor(item.year! / 10) * 10);
    const decadeMap = new Map<number, number>();
    decades.forEach(decade => {
      decadeMap.set(decade, (decadeMap.get(decade) || 0) + 1);
    });
    const most_collected_decade = decadeMap.size > 0 
      ? Array.from(decadeMap.entries()).sort((a, b) => b[1] - a[1])[0][0].toString() + 's'
      : '2000s';

    return {
      favorite_genres,
      favorite_directors,
      format_preferences,
      rating_pattern: {
        avg_rating,
        high_rated_threshold,
        rating_count: ratings.length
      },
      collection_stats: {
        total_items: collections.length,
        owned_items: ownedItems.length,
        wishlist_items: wishlistItems.length,
        most_collected_decade
      }
    };
  }

  /**
   * Algorithm 1: Collection Gap Analysis
   * Find missing movies from directors/franchises user already collects
   */
  private async findCollectionGaps(
    collections: PhysicalMediaCollection[], 
    userProfile: UserProfile
  ): Promise<MovieRecommendation[]> {
    const recommendations: MovieRecommendation[] = [];

    try {
      // Focus on top 3 directors the user collects
      const topDirectors = userProfile.favorite_directors.slice(0, 3);

      for (const directorEntry of topDirectors) {
        await this.delay(this.OMDB_REQUEST_DELAY);

        try {
          console.log('[CollectionGaps] Searching for', directorEntry.director, 'movies');
          
          // Search for movies by this director
          const searchResults = await omdbApi.searchMovies(directorEntry.director);
          
          if (searchResults.Search && searchResults.Search.length > 0) {
            // Filter out movies user already owns
            const ownedImdbIds = new Set(collections.map(item => item.imdb_id).filter(Boolean));
            
            const gapMovies = searchResults.Search
              .filter(movie => !ownedImdbIds.has(movie.imdbID))
              .slice(0, 3); // Top 3 missing movies per director

            for (const movie of gapMovies) {
              const recommendation: MovieRecommendation = {
                imdb_id: movie.imdbID,
                title: movie.Title,
                year: parseInt(movie.Year) || undefined,
                poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                recommendation_type: 'collection_gap',
                reasoning: `You own ${directorEntry.count} movie(s) by ${directorEntry.director}, but missing this one`,
                score: {
                  relevance: Math.min(directorEntry.count / 5, 1), // Higher relevance for directors with more movies
                  confidence: 0.8, // High confidence for director-based recommendations
                  urgency: directorEntry.avg_rating > userProfile.rating_pattern.avg_rating ? 0.7 : 0.5
                },
                source_items: collections
                  .filter(item => item.director?.includes(directorEntry.director))
                  .map(item => item.id),
                suggested_format: this.suggestFormat(userProfile)
              };

              recommendations.push(recommendation);
            }
          }
        } catch (directorError) {
          console.error('[CollectionGaps] Error searching for director:', directorEntry.director, directorError);
        }
      }

      // Also search for franchise gaps (movies with similar titles)
      const collectionTitles = collections.map(item => item.title);
      const franchiseKeywords = this.extractFranchiseKeywords(collectionTitles);

      for (const keyword of franchiseKeywords.slice(0, 2)) {
        await this.delay(this.OMDB_REQUEST_DELAY);

        try {
          console.log('[CollectionGaps] Searching for franchise:', keyword);
          const franchiseResults = await omdbApi.searchMovies(keyword);
          
          if (franchiseResults.Search && franchiseResults.Search.length > 0) {
            const ownedImdbIds = new Set(collections.map(item => item.imdb_id).filter(Boolean));
            
            const franchiseGaps = franchiseResults.Search
              .filter(movie => !ownedImdbIds.has(movie.imdbID))
              .slice(0, 2);

            for (const movie of franchiseGaps) {
              const recommendation: MovieRecommendation = {
                imdb_id: movie.imdbID,
                title: movie.Title,
                year: parseInt(movie.Year) || undefined,
                poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                recommendation_type: 'collection_gap',
                reasoning: `Part of the ${keyword} collection you're building`,
                score: {
                  relevance: 0.7,
                  confidence: 0.6,
                  urgency: 0.4
                },
                source_items: collections
                  .filter(item => item.title.toLowerCase().includes(keyword.toLowerCase()))
                  .map(item => item.id),
                suggested_format: this.suggestFormat(userProfile)
              };

              recommendations.push(recommendation);
            }
          }
        } catch (franchiseError) {
          console.error('[CollectionGaps] Error searching for franchise:', keyword, franchiseError);
        }
      }

    } catch (error) {
      console.error('[CollectionGaps] General error:', error);
    }

    return recommendations;
  }

  /**
   * Algorithm 2: Format Upgrade Suggestions
   * Suggest better formats for highly-rated owned movies
   */
  private async findFormatUpgrades(
    collections: PhysicalMediaCollection[], 
    userProfile: UserProfile
  ): Promise<MovieRecommendation[]> {
    const recommendations: MovieRecommendation[] = [];

    try {
      const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
      
      // Find highly-rated movies in lower formats
      const upgradeableCandidates = ownedItems.filter(item => {
        const hasHighRating = item.personal_rating && item.personal_rating >= userProfile.rating_pattern.high_rated_threshold;
        const hasLowerFormat = this.FORMAT_HIERARCHY.indexOf(item.format) < this.FORMAT_HIERARCHY.length - 1;
        return hasHighRating && hasLowerFormat;
      });

      console.log('[FormatUpgrades] Found', upgradeableCandidates.length, 'upgrade candidates');

      for (const item of upgradeableCandidates.slice(0, 10)) { // Limit to top 10
        const currentFormatIndex = this.FORMAT_HIERARCHY.indexOf(item.format);
        const suggestedFormat = this.FORMAT_HIERARCHY[currentFormatIndex + 1] as 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';

        const recommendation: MovieRecommendation = {
          imdb_id: item.imdb_id || '',
          title: item.title,
          year: item.year,
          genre: item.genre,
          director: item.director,
          poster_url: item.poster_url,
          recommendation_type: 'format_upgrade',
          reasoning: `Upgrade your ${item.format} copy to ${suggestedFormat} - you rated this ${item.personal_rating}/10`,
          score: {
            relevance: (item.personal_rating! - userProfile.rating_pattern.avg_rating) / 10, // Higher relevance for higher-rated movies
            confidence: 0.9, // Very confident about format upgrades
            urgency: suggestedFormat === '4K UHD' ? 0.8 : 0.6 // Higher urgency for 4K upgrades
          },
          source_items: [item.id],
          suggested_format: suggestedFormat
        };

        recommendations.push(recommendation);
      }

    } catch (error) {
      console.error('[FormatUpgrades] Error:', error);
    }

    return recommendations;
  }

  /**
   * Algorithm 3: Similar Titles Matching
   * Recommend movies similar to user's favorites using content-based filtering
   */
  private async findSimilarTitles(
    collections: PhysicalMediaCollection[], 
    userProfile: UserProfile
  ): Promise<MovieRecommendation[]> {
    const recommendations: MovieRecommendation[] = [];

    try {
      const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
      
      // Find user's favorite movies (high personal ratings)
      const favoriteMovies = ownedItems
        .filter(item => item.personal_rating && item.personal_rating >= userProfile.rating_pattern.high_rated_threshold)
        .sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0))
        .slice(0, 5); // Top 5 favorites

      console.log('[SimilarTitles] Analyzing', favoriteMovies.length, 'favorite movies');

      for (const favoriteMovie of favoriteMovies) {
        await this.delay(this.OMDB_REQUEST_DELAY);

        try {
          // Search for movies in the same primary genre
          const primaryGenre = favoriteMovie.genre?.split(',')[0]?.trim();
          if (primaryGenre) {
            console.log('[SimilarTitles] Searching for', primaryGenre, 'movies');
            
            const genreResults = await omdbApi.searchMovies(primaryGenre);
            
            if (genreResults.Search && genreResults.Search.length > 0) {
              const ownedImdbIds = new Set(collections.map(item => item.imdb_id).filter(Boolean));
              
              const similarMovies = genreResults.Search
                .filter(movie => !ownedImdbIds.has(movie.imdbID))
                .slice(0, 2); // 2 similar movies per favorite

              for (const movie of similarMovies) {
                const recommendation: MovieRecommendation = {
                  imdb_id: movie.imdbID,
                  title: movie.Title,
                  year: parseInt(movie.Year) || undefined,
                  poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                  recommendation_type: 'similar_title',
                  reasoning: `Similar to "${favoriteMovie.title}" (${primaryGenre}) - you rated it ${favoriteMovie.personal_rating}/10`,
                  score: {
                    relevance: (favoriteMovie.personal_rating || 7) / 10,
                    confidence: 0.6, // Moderate confidence for genre-based similarity
                    urgency: 0.3
                  },
                  source_items: [favoriteMovie.id],
                  suggested_format: this.suggestFormat(userProfile)
                };

                recommendations.push(recommendation);
              }
            }
          }

          // Also search for movies by the same director (if it's a director the user likes)
          if (favoriteMovie.director) {
            const director = favoriteMovie.director.split(',')[0]?.trim();
            const directorEntry = userProfile.favorite_directors.find(d => d.director === director);
            
            if (directorEntry && directorEntry.count >= 2) { // Only if user has multiple movies by this director
              await this.delay(this.OMDB_REQUEST_DELAY);
              
              console.log('[SimilarTitles] Searching for more', director, 'movies');
              const directorResults = await omdbApi.searchMovies(director);
              
              if (directorResults.Search && directorResults.Search.length > 0) {
                const ownedImdbIds = new Set(collections.map(item => item.imdb_id).filter(Boolean));
                
                const directorMovies = directorResults.Search
                  .filter(movie => !ownedImdbIds.has(movie.imdbID))
                  .slice(0, 1); // 1 movie per director search

                for (const movie of directorMovies) {
                  const recommendation: MovieRecommendation = {
                    imdb_id: movie.imdbID,
                    title: movie.Title,
                    year: parseInt(movie.Year) || undefined,
                    poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                    recommendation_type: 'similar_title',
                    reasoning: `Another ${director} film - you love their work (${directorEntry.count} movies)`,
                    score: {
                      relevance: Math.min(directorEntry.count / 5, 0.9),
                      confidence: 0.8,
                      urgency: 0.5
                    },
                    source_items: [favoriteMovie.id],
                    suggested_format: this.suggestFormat(userProfile)
                  };

                  recommendations.push(recommendation);
                }
              }
            }
          }

        } catch (movieError) {
          console.error('[SimilarTitles] Error processing favorite movie:', favoriteMovie.title, movieError);
        }
      }

    } catch (error) {
      console.error('[SimilarTitles] General error:', error);
    }

    return recommendations;
  }

  /**
   * Filter recommendations based on user preferences and constraints
   */
  private filterRecommendations(
    recommendations: MovieRecommendation[],
    collections: PhysicalMediaCollection[],
    filters: RecommendationFilters
  ): MovieRecommendation[] {
    let filtered = recommendations;

    // Remove duplicates by IMDB ID
    const seenImdbIds = new Set<string>();
    filtered = filtered.filter(rec => {
      if (seenImdbIds.has(rec.imdb_id)) {
        return false;
      }
      seenImdbIds.add(rec.imdb_id);
      return true;
    });

    // Exclude owned items if requested (default: true)
    if (filters.exclude_owned !== false) {
      const ownedImdbIds = new Set(
        collections
          .filter(item => (item.collection_type || 'owned') === 'owned')
          .map(item => item.imdb_id)
          .filter(Boolean)
      );
      filtered = filtered.filter(rec => !ownedImdbIds.has(rec.imdb_id));
    }

    // Exclude wishlist items if requested (default: true)
    if (filters.exclude_wishlist !== false) {
      const wishlistImdbIds = new Set(
        collections
          .filter(item => item.collection_type === 'wishlist')
          .map(item => item.imdb_id)
          .filter(Boolean)
      );
      filtered = filtered.filter(rec => !wishlistImdbIds.has(rec.imdb_id));
    }

    // Apply confidence filter
    if (filters.min_confidence) {
      filtered = filtered.filter(rec => rec.score.confidence >= filters.min_confidence!);
    }

    return filtered;
  }

  /**
   * Rank recommendations by composite score
   */
  private rankRecommendations(recommendations: MovieRecommendation[]): MovieRecommendation[] {
    return recommendations.sort((a, b) => {
      // Composite score: relevance (40%) + confidence (40%) + urgency (20%)
      const scoreA = (a.score.relevance * 0.4) + (a.score.confidence * 0.4) + (a.score.urgency * 0.2);
      const scoreB = (b.score.relevance * 0.4) + (b.score.confidence * 0.4) + (b.score.urgency * 0.2);
      return scoreB - scoreA;
    });
  }

  /**
   * Suggest best format based on user's collection patterns
   */
  private suggestFormat(userProfile: UserProfile): 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray' {
    if (userProfile.format_preferences.length === 0) {
      return 'Blu-ray'; // Safe default
    }

    // Suggest the user's most common high-end format
    const preferredFormat = userProfile.format_preferences[0].format;
    const formatIndex = this.FORMAT_HIERARCHY.indexOf(preferredFormat);
    
    // If user mostly has DVDs, suggest Blu-ray upgrade
    if (preferredFormat === 'DVD') {
      return 'Blu-ray';
    }
    
    // Otherwise suggest their preferred format or one step higher
    return preferredFormat as 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  }

  /**
   * Extract potential franchise keywords from collection titles
   */
  private extractFranchiseKeywords(titles: string[]): string[] {
    const keywords = new Set<string>();
    
    // Common franchise patterns
    const franchisePatterns = [
      /^(.*?)\s+\d+$/,           // "Movie 2", "Movie 3"
      /^(.*?)\s+II+$/,           // "Movie II", "Movie III" 
      /^(.*?):\s+/,              // "Franchise: Subtitle"
      /^(.*?)\s+-\s+/,           // "Franchise - Subtitle"
      /^(.*?)\s+Part\s+\d+$/     // "Movie Part 2"
    ];

    titles.forEach(title => {
      franchisePatterns.forEach(pattern => {
        const match = title.match(pattern);
        if (match && match[1].length > 3) { // Avoid too short keywords
          keywords.add(match[1].trim());
        }
      });

      // Also add common franchise words
      const commonWords = ['Marvel', 'DC', 'Star Wars', 'Fast', 'Furious', 'Avengers', 'X-Men'];
      commonWords.forEach(word => {
        if (title.includes(word)) {
          keywords.add(word);
        }
      });
    });

    return Array.from(keywords).slice(0, 5); // Limit to 5 keywords
  }

  /**
   * Fallback recommendations when main algorithms fail
   */
  private getFallbackRecommendations(collections: PhysicalMediaCollection[]): MovieRecommendation[] {
    console.log('[SmartRecommendations] Generating fallback recommendations');
    
    // Create simple fallback based on user's most common genre
    const genres = collections
      .filter(item => item.genre)
      .flatMap(item => item.genre!.split(',').map(g => g.trim()));
    
    const genreCount = new Map<string, number>();
    genres.forEach(genre => {
      genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
    });

    const topGenre = genreCount.size > 0 
      ? Array.from(genreCount.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'Action';

    // Create a simple fallback recommendation
    return [{
      imdb_id: 'fallback',
      title: `Explore more ${topGenre} movies`,
      recommendation_type: 'similar_title',
      reasoning: `Based on your collection, you enjoy ${topGenre} movies`,
      score: {
        relevance: 0.5,
        confidence: 0.3,
        urgency: 0.2
      },
      source_items: []
    }];
  }

  /**
   * Utility function to add delay between API requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recommendation statistics for debugging
   */
  getRecommendationStats(recommendations: MovieRecommendation[]) {
    const stats = {
      total: recommendations.length,
      by_type: {
        collection_gap: recommendations.filter(r => r.recommendation_type === 'collection_gap').length,
        format_upgrade: recommendations.filter(r => r.recommendation_type === 'format_upgrade').length,
        similar_title: recommendations.filter(r => r.recommendation_type === 'similar_title').length
      },
      avg_confidence: recommendations.reduce((sum, r) => sum + r.score.confidence, 0) / recommendations.length,
      avg_relevance: recommendations.reduce((sum, r) => sum + r.score.relevance, 0) / recommendations.length
    };

    console.log('[SmartRecommendations] Stats:', stats);
    return stats;
  }
}

export const smartRecommendationsService = new SmartRecommendationsService();