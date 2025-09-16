// src/services/enhancedSmartRecommendationsService.ts
import { optimizedOMDBService } from './optimizedOMDBService';
import { smartCacheService } from './smartCacheService';
import type { PhysicalMediaCollection } from '../lib/supabase';
import type { 
  MovieRecommendation, 
  RecommendationFilters, 
  UserProfile,
  RecommendationScore 
} from '../services/smartRecommendationsService';

interface GenerationOptions {
  userId?: string;
  useCache?: boolean;
  priority?: 'high' | 'medium' | 'low';
  background?: boolean;
  maxRecommendations?: number;
  enableProfiling?: boolean;
}

interface GenerationContext {
  startTime: number;
  userId?: string;
  collectionSize: number;
  cacheHits: number;
  apiCalls: number;
  errors: string[];
}

interface RecommendationGenerationMetrics {
  totalTime: number;
  cacheHitRate: number;
  apiCallCount: number;
  recommendationsGenerated: number;
  errorCount: number;
  performanceScore: number; // 0-100
}

export class EnhancedSmartRecommendationsService {
  private readonly MIN_COLLECTION_SIZE = 3;
  private readonly FORMAT_HIERARCHY = ['DVD', 'Blu-ray', '4K UHD', '3D Blu-ray'];
  private readonly MAX_CONCURRENT_GENERATIONS = 2;
  
  // Performance tracking
  private generationMetrics: RecommendationGenerationMetrics[] = [];
  private activeGenerations = new Map<string, GenerationContext>();

  constructor() {
    // Initialize cleanup for old metrics
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Generate personalized recommendations with enhanced performance
   */
  async generateRecommendations(
    collections: PhysicalMediaCollection[],
    filters: RecommendationFilters = {},
    options: GenerationOptions = {}
  ): Promise<MovieRecommendation[]> {
    const {
      userId,
      useCache = true,
      priority = 'medium',
      background = false,
      maxRecommendations = 20,
      enableProfiling = true
    } = options;

    const context: GenerationContext = {
      startTime: performance.now(),
      userId,
      collectionSize: collections.length,
      cacheHits: 0,
      apiCalls: 0,
      errors: []
    };

    // Track active generation
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeGenerations.set(generationId, context);

    try {
      console.log(`[EnhancedRecommendations] Starting generation ${generationId} (${collections.length} items, priority: ${priority})`);

      // Early validation
      if (collections.length < this.MIN_COLLECTION_SIZE) {
        console.log('[EnhancedRecommendations] Collection too small for meaningful recommendations');
        return [];
      }

      // Check for cached complete recommendation set
      if (useCache && userId) {
        const cacheKey = this.getCacheKey(userId, filters);
        const cachedRecommendations = await smartCacheService.get<MovieRecommendation[]>(
          cacheKey,
          { ttl: 60 * 60 * 1000, persistToStorage: true, priority } // 1 hour cache
        );

        if (cachedRecommendations && cachedRecommendations.length > 0) {
          context.cacheHits++;
          this.recordGeneration(context, cachedRecommendations);
          console.log(`[EnhancedRecommendations] Cache hit: ${cachedRecommendations.length} recommendations`);
          return cachedRecommendations;
        }
      }

      // Generate user profile with caching
      const userProfile = await this.getOrGenerateUserProfile(collections, { useCache, priority, background });
      
      // Generate recommendations using optimized algorithms
      const allRecommendations: MovieRecommendation[] = [];
      const enabledTypes = filters.types || ['collection_gap', 'format_upgrade', 'similar_title'];

      // Execute recommendation algorithms in parallel with controlled concurrency
      const algorithmPromises: Promise<MovieRecommendation[]>[] = [];

      if (enabledTypes.includes('collection_gap')) {
        algorithmPromises.push(
          this.findCollectionGapsOptimized(collections, userProfile, context, { priority, background })
        );
      }

      if (enabledTypes.includes('format_upgrade')) {
        algorithmPromises.push(
          this.findFormatUpgradesOptimized(collections, userProfile, context, { priority, background })
        );
      }

      if (enabledTypes.includes('similar_title')) {
        algorithmPromises.push(
          this.findSimilarTitlesOptimized(collections, userProfile, context, { priority, background })
        );
      }

      // Execute algorithms with controlled concurrency
      const algorithmResults = await this.executeConcurrentAlgorithms(
        algorithmPromises, 
        this.MAX_CONCURRENT_GENERATIONS
      );

      // Flatten and merge results
      algorithmResults.forEach(results => {
        allRecommendations.push(...results);
      });

      // Apply filters and ranking
      const filteredRecommendations = this.applyFilters(allRecommendations, filters);
      const rankedRecommendations = this.rankRecommendations(filteredRecommendations, userProfile);
      const finalRecommendations = rankedRecommendations.slice(0, maxRecommendations);

      // Cache the results
      if (useCache && userId && finalRecommendations.length > 0) {
        const cacheKey = this.getCacheKey(userId, filters);
        await smartCacheService.set(cacheKey, finalRecommendations, {
          ttl: 60 * 60 * 1000, // 1 hour
          persistToStorage: true,
          priority
        });
      }

      // Record performance metrics
      this.recordGeneration(context, finalRecommendations);
      
      console.log(`[EnhancedRecommendations] Generated ${finalRecommendations.length} recommendations in ${Math.round(performance.now() - context.startTime)}ms`);

      return finalRecommendations;

    } catch (error) {
      context.errors.push(error.message || 'Unknown error');
      console.error(`[EnhancedRecommendations] Generation ${generationId} failed:`, error);
      
      // Try to return cached results as fallback
      if (useCache && userId) {
        const fallbackRecommendations = await this.getFallbackRecommendations(userId, filters);
        if (fallbackRecommendations.length > 0) {
          console.log(`[EnhancedRecommendations] Using fallback cache: ${fallbackRecommendations.length} recommendations`);
          return fallbackRecommendations;
        }
      }

      throw error;

    } finally {
      this.activeGenerations.delete(generationId);
    }
  }

  /**
   * Optimized collection gap finding with batch OMDB requests
   */
  private async findCollectionGapsOptimized(
    collections: PhysicalMediaCollection[],
    userProfile: UserProfile,
    context: GenerationContext,
    options: { priority: 'high' | 'medium' | 'low'; background: boolean }
  ): Promise<MovieRecommendation[]> {
    const recommendations: MovieRecommendation[] = [];
    
    try {
      console.log('[CollectionGaps] Starting optimized analysis...');
      
      // Group collections by franchise/series for gap analysis
      const franchiseGroups = this.groupByFranchise(collections);
      const franchiseSearchTerms: string[] = [];

      // Generate search terms for franchise gaps
      Object.entries(franchiseGroups).forEach(([franchise, items]) => {
        if (items.length >= 2) { // Only analyze established franchises
          franchiseSearchTerms.push(franchise);
        }
      });

      // Batch search for franchise-related movies
      const searchResults = new Map<string, any>();
      
      if (franchiseSearchTerms.length > 0) {
        const batchSearchPromises = franchiseSearchTerms.slice(0, 5).map(async (term) => {
          try {
            const result = await optimizedOMDBService.searchMoviesOptimized(term, {
              useCache: true,
              priority: options.priority,
              background: options.background
            });
            context.apiCalls++;
            return { term, result };
          } catch (error) {
            context.errors.push(`Search failed for ${term}: ${error.message}`);
            return { term, result: null };
          }
        });

        const batchResults = await Promise.all(batchSearchPromises);
        batchResults.forEach(({ term, result }) => {
          if (result) {
            searchResults.set(term, result);
          }
        });
      }

      // Analyze search results for collection gaps
      const ownedImdbIds = new Set(collections.map(item => item.imdb_id).filter(Boolean));
      
      searchResults.forEach((searchResult, franchise) => {
        if (searchResult.Search && searchResult.Search.length > 0) {
          const franchiseItems = searchResult.Search
            .filter(movie => !ownedImdbIds.has(movie.imdbID))
            .slice(0, 3); // Limit to prevent API overload

          franchiseItems.forEach(movie => {
            const recommendation: MovieRecommendation = {
              imdb_id: movie.imdbID,
              title: movie.Title,
              year: parseInt(movie.Year) || undefined,
              poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
              recommendation_type: 'collection_gap',
              reasoning: `Complete your ${franchise} collection`,
              score: {
                relevance: 0.8,
                confidence: 0.7,
                urgency: 0.6
              },
              source_items: franchiseGroups[franchise]?.map(item => item.id) || []
            };

            recommendations.push(recommendation);
          });
        }
      });

      console.log(`[CollectionGaps] Found ${recommendations.length} potential gaps`);

    } catch (error) {
      context.errors.push(`Collection gaps analysis failed: ${error.message}`);
      console.error('[CollectionGaps] Error:', error);
    }

    return recommendations;
  }

  /**
   * Optimized format upgrade finding
   */
  private async findFormatUpgradesOptimized(
    collections: PhysicalMediaCollection[],
    userProfile: UserProfile,
    context: GenerationContext,
    options: { priority: 'high' | 'medium' | 'low'; background: boolean }
  ): Promise<MovieRecommendation[]> {
    const recommendations: MovieRecommendation[] = [];

    try {
      console.log('[FormatUpgrades] Starting optimized analysis...');

      const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
      const upgradeableItems = ownedItems.filter(item => {
        const currentFormat = item.format || 'DVD';
        const currentIndex = this.FORMAT_HIERARCHY.indexOf(currentFormat);
        return currentIndex < this.FORMAT_HIERARCHY.length - 1; // Can be upgraded
      });

      // Batch get details for upgradeable items
      const imdbIds = upgradeableItems
        .map(item => item.imdb_id)
        .filter(Boolean)
        .slice(0, 10); // Limit batch size

      if (imdbIds.length > 0) {
        const detailsMap = await optimizedOMDBService.getMultipleMovieDetails(imdbIds, {
          useCache: true,
          priority: options.priority,
          background: options.background
        });

        context.apiCalls += imdbIds.length - (detailsMap.size); // Approximate cache hits

        upgradeableItems.forEach(item => {
          if (!item.imdb_id) return;

          const details = detailsMap.get(item.imdb_id);
          if (!details) return;

          const currentFormat = item.format || 'DVD';
          const currentIndex = this.FORMAT_HIERARCHY.indexOf(currentFormat);
          const suggestedFormat = this.FORMAT_HIERARCHY[Math.min(currentIndex + 1, this.FORMAT_HIERARCHY.length - 1)];

          // Calculate upgrade desirability
          const imdbRating = parseFloat(details.imdbRating) || 0;
          const isHighRated = imdbRating >= (userProfile?.rating_pattern?.high_rated_threshold || 7.0);
          const isPersonalFavorite = (item.personal_rating || 0) >= (userProfile?.rating_pattern?.high_rated_threshold || 7.0);

          if (isHighRated || isPersonalFavorite) {
            const recommendation: MovieRecommendation = {
              imdb_id: item.imdb_id,
              title: item.title || details.Title,
              year: parseInt(details.Year) || undefined,
              poster_url: details.Poster !== 'N/A' ? details.Poster : item.poster_url,
              imdb_rating: imdbRating || undefined,
              recommendation_type: 'format_upgrade',
              reasoning: `Upgrade your ${currentFormat} to ${suggestedFormat} for enhanced quality`,
              score: {
                relevance: 0.7 + (imdbRating - (userProfile?.rating_pattern?.avg_rating || 7)) / 10,
                confidence: 0.9,
                urgency: suggestedFormat === '4K UHD' ? 0.8 : 0.6
              },
              source_items: [item.id],
              suggested_format: suggestedFormat
            };

            recommendations.push(recommendation);
          }
        });
      }

      console.log(`[FormatUpgrades] Found ${recommendations.length} upgrade opportunities`);

    } catch (error) {
      context.errors.push(`Format upgrades analysis failed: ${error.message}`);
      console.error('[FormatUpgrades] Error:', error);
    }

    return recommendations;
  }

  /**
   * Optimized similar titles finding
   */
  private async findSimilarTitlesOptimized(
    collections: PhysicalMediaCollection[],
    userProfile: UserProfile,
    context: GenerationContext,
    options: { priority: 'high' | 'medium' | 'low'; background: boolean }
  ): Promise<MovieRecommendation[]> {
    const recommendations: MovieRecommendation[] = [];

    try {
      console.log('[SimilarTitles] Starting optimized analysis...');

      const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
      
      // Find user's favorite movies (high ratings)
      const favoriteMovies = ownedItems
        .filter(item => item.personal_rating && item.personal_rating >= (userProfile?.rating_pattern?.high_rated_threshold || 7))
        .sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0))
        .slice(0, 3); // Top 3 favorites

      if (favoriteMovies.length === 0) return recommendations;

      // Extract popular genres from favorites
      const genreCounts = new Map<string, number>();
      favoriteMovies.forEach(movie => {
        if (movie.genre) {
          const genres = movie.genre.split(',').map(g => g.trim());
          genres.forEach(genre => {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
          });
        }
      });

      const topGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([genre]) => genre);

      // Batch search for similar movies by genre
      const ownedImdbIds = new Set(collections.map(item => item.imdb_id).filter(Boolean));
      
      for (const genre of topGenres) {
        try {
          const searchResult = await optimizedOMDBService.searchMoviesOptimized(genre, {
            useCache: true,
            priority: options.priority,
            background: options.background
          });

          context.apiCalls++;

          if (searchResult.Search && searchResult.Search.length > 0) {
            const similarMovies = searchResult.Search
              .filter(movie => !ownedImdbIds.has(movie.imdbID))
              .slice(0, 3); // 3 per genre

            similarMovies.forEach(movie => {
              const recommendation: MovieRecommendation = {
                imdb_id: movie.imdbID,
                title: movie.Title,
                year: parseInt(movie.Year) || undefined,
                poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                recommendation_type: 'similar_title',
                reasoning: `Similar to your favorite ${genre} movies`,
                score: {
                  relevance: 0.6 + (genreCounts.get(genre) || 0) * 0.1,
                  confidence: 0.6,
                  urgency: 0.4
                },
                source_items: favoriteMovies.map(movie => movie.id)
              };

              recommendations.push(recommendation);
            });
          }

        } catch (error) {
          context.errors.push(`Similar titles search failed for ${genre}: ${error.message}`);
        }
      }

      console.log(`[SimilarTitles] Found ${recommendations.length} similar movies`);

    } catch (error) {
      context.errors.push(`Similar titles analysis failed: ${error.message}`);
      console.error('[SimilarTitles] Error:', error);
    }

    return recommendations;
  }

  /**
   * Get or generate user profile with caching
   */
  private async getOrGenerateUserProfile(
    collections: PhysicalMediaCollection[],
    options: { useCache: boolean; priority: 'high' | 'medium' | 'low'; background: boolean }
  ): Promise<UserProfile> {
    const { useCache, priority, background } = options;
    const profileCacheKey = `user_profile_${collections.length}_${Date.now() - Date.now() % (24 * 60 * 60 * 1000)}`; // Daily cache key

    if (useCache) {
      const cachedProfile = await smartCacheService.get<UserProfile>(profileCacheKey, {
        ttl: 24 * 60 * 60 * 1000, // 24 hour cache
        persistToStorage: true,
        priority
      });

      if (cachedProfile) {
        console.log('[UserProfile] Using cached profile');
        return cachedProfile;
      }
    }

    // Generate fresh user profile
    const profile = this.analyzeUserProfile(collections);

    // Cache the profile
    if (useCache) {
      await smartCacheService.set(profileCacheKey, profile, {
        ttl: 24 * 60 * 60 * 1000,
        persistToStorage: true,
        priority
      });
    }

    return profile;
  }

  /**
   * Utility methods
   */
  private getCacheKey(userId: string, filters: RecommendationFilters): string {
    const filterHash = JSON.stringify(filters);
    const dateKey = Math.floor(Date.now() / (60 * 60 * 1000)); // Hourly cache invalidation
    return `recommendations_${userId}_${filterHash}_${dateKey}`;
  }

  private groupByFranchise(collections: PhysicalMediaCollection[]): Record<string, PhysicalMediaCollection[]> {
    const groups: Record<string, PhysicalMediaCollection[]> = {};
    
    collections.forEach(item => {
      // Simple franchise detection based on title patterns
      const franchise = this.detectFranchise(item.title || '');
      if (franchise) {
        if (!groups[franchise]) groups[franchise] = [];
        groups[franchise].push(item);
      }
    });

    return groups;
  }

  private detectFranchise(title: string): string | null {
    // Common franchise patterns
    const patterns = [
      /^(.*?)\s+\d+/i, // "Movie Name 2", "Movie Name III"
      /^(.*?):\s+/i,   // "Movie Name: Subtitle"
      /^(.*?)\s+-\s+/i, // "Movie Name - Subtitle"
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1].length > 3) {
        return match[1].trim();
      }
    }

    return null;
  }

  private applyFilters(recommendations: MovieRecommendation[], filters: RecommendationFilters): MovieRecommendation[] {
    let filtered = [...recommendations];

    if (filters.min_confidence) {
      filtered = filtered.filter(rec => rec.score.confidence >= filters.min_confidence!);
    }

    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(rec => filters.types!.includes(rec.recommendation_type));
    }

    return filtered;
  }

  private rankRecommendations(recommendations: MovieRecommendation[], userProfile: UserProfile | null): MovieRecommendation[] {
    return recommendations.sort((a, b) => {
      // Calculate composite score
      const scoreA = a.score.relevance * 0.4 + a.score.confidence * 0.4 + a.score.urgency * 0.2;
      const scoreB = b.score.relevance * 0.4 + b.score.confidence * 0.4 + b.score.urgency * 0.2;
      
      return scoreB - scoreA;
    });
  }

  private async getFallbackRecommendations(userId: string, filters: RecommendationFilters): Promise<MovieRecommendation[]> {
    // Try to find any cached recommendations for this user, even if expired
    const fallbackKey = `recommendations_${userId}_fallback`;
    
    const fallback = await smartCacheService.get<MovieRecommendation[]>(fallbackKey, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 day fallback cache
      persistToStorage: true,
      priority: 'low'
    });

    return fallback || [];
  }

  private async executeConcurrentAlgorithms(
    promises: Promise<MovieRecommendation[]>[],
    maxConcurrency: number
  ): Promise<MovieRecommendation[][]> {
    const results: MovieRecommendation[][] = [];

    for (let i = 0; i < promises.length; i += maxConcurrency) {
      const batch = promises.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private analyzeUserProfile(collections: PhysicalMediaCollection[]): UserProfile {
    // Simplified profile analysis - reuse existing logic
    const genres: { [key: string]: { count: number; ratings: number[] } } = {};
    const directors: { [key: string]: { count: number; ratings: number[] } } = {};
    const formats: { [key: string]: number } = {};
    const ratings: number[] = [];

    collections.forEach(item => {
      // Analyze genres
      if (item.genre) {
        const itemGenres = item.genre.split(',').map(g => g.trim());
        itemGenres.forEach(genre => {
          if (!genres[genre]) genres[genre] = { count: 0, ratings: [] };
          genres[genre].count++;
          if (item.personal_rating) genres[genre].ratings.push(item.personal_rating);
        });
      }

      // Analyze directors
      if (item.director) {
        const itemDirectors = item.director.split(',').map(d => d.trim());
        itemDirectors.forEach(director => {
          if (!directors[director]) directors[director] = { count: 0, ratings: [] };
          directors[director].count++;
          if (item.personal_rating) directors[director].ratings.push(item.personal_rating);
        });
      }

      // Analyze formats
      if (item.format) {
        formats[item.format] = (formats[item.format] || 0) + 1;
      }

      // Collect ratings
      if (item.personal_rating) {
        ratings.push(item.personal_rating);
      }
    });

    // Generate profile
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 7;
    const highRatedThreshold = avgRating > 7 ? avgRating : 7;

    return {
      favorite_genres: Object.entries(genres)
        .map(([genre, data]) => ({
          genre,
          count: data.count,
          avg_rating: data.ratings.length > 0 ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length : avgRating
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),

      favorite_directors: Object.entries(directors)
        .map(([director, data]) => ({
          director,
          count: data.count,
          avg_rating: data.ratings.length > 0 ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length : avgRating
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),

      format_preferences: Object.entries(formats)
        .map(([format, count]) => ({ format, count }))
        .sort((a, b) => b.count - a.count),

      rating_pattern: {
        avg_rating: avgRating,
        high_rated_threshold: highRatedThreshold,
        rating_count: ratings.length
      },

      collection_stats: {
        total_items: collections.length,
        owned_items: collections.filter(item => (item.collection_type || 'owned') === 'owned').length,
        wishlist_items: collections.filter(item => item.collection_type === 'wishlist').length,
        most_collected_decade: this.getMostCollectedDecade(collections)
      }
    };
  }

  private getMostCollectedDecade(collections: PhysicalMediaCollection[]): string {
    const decades: { [key: string]: number } = {};
    
    collections.forEach(item => {
      if (item.year) {
        const decade = `${Math.floor(item.year / 10) * 10}s`;
        decades[decade] = (decades[decade] || 0) + 1;
      }
    });

    const mostCollected = Object.entries(decades).sort((a, b) => b[1] - a[1])[0];
    return mostCollected ? mostCollected[0] : '2020s';
  }

  private recordGeneration(context: GenerationContext, recommendations: MovieRecommendation[]): void {
    const totalTime = performance.now() - context.startTime;
    const cacheHitRate = context.apiCalls > 0 ? (context.cacheHits / (context.cacheHits + context.apiCalls)) * 100 : 100;
    const performanceScore = this.calculatePerformanceScore(totalTime, cacheHitRate, context.errors.length);

    const metrics: RecommendationGenerationMetrics = {
      totalTime,
      cacheHitRate,
      apiCallCount: context.apiCalls,
      recommendationsGenerated: recommendations.length,
      errorCount: context.errors.length,
      performanceScore
    };

    this.generationMetrics.push(metrics);
    
    console.log(`[EnhancedRecommendations] Performance: ${Math.round(totalTime)}ms, ${recommendations.length} recommendations, ${Math.round(cacheHitRate)}% cache hit rate, score: ${Math.round(performanceScore)}`);
  }

  private calculatePerformanceScore(totalTime: number, cacheHitRate: number, errorCount: number): number {
    let score = 100;
    
    // Time penalty (target: <2000ms)
    if (totalTime > 2000) {
      score -= Math.min(30, (totalTime - 2000) / 100);
    }
    
    // Cache hit bonus
    score += (cacheHitRate - 50) / 10;
    
    // Error penalty
    score -= errorCount * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.generationMetrics = this.generationMetrics.filter(
      metric => metric.totalTime > oneHourAgo
    );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    averageGenerationTime: number;
    averageCacheHitRate: number;
    averageRecommendationCount: number;
    averagePerformanceScore: number;
    activeGenerations: number;
  } {
    const recentMetrics = this.generationMetrics.slice(-10); // Last 10 generations
    
    if (recentMetrics.length === 0) {
      return {
        averageGenerationTime: 0,
        averageCacheHitRate: 0,
        averageRecommendationCount: 0,
        averagePerformanceScore: 0,
        activeGenerations: this.activeGenerations.size
      };
    }

    const totals = recentMetrics.reduce((acc, metric) => ({
      time: acc.time + metric.totalTime,
      cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
      recommendations: acc.recommendations + metric.recommendationsGenerated,
      score: acc.score + metric.performanceScore
    }), { time: 0, cacheHitRate: 0, recommendations: 0, score: 0 });

    return {
      averageGenerationTime: Math.round(totals.time / recentMetrics.length),
      averageCacheHitRate: Math.round(totals.cacheHitRate / recentMetrics.length),
      averageRecommendationCount: Math.round(totals.recommendations / recentMetrics.length),
      averagePerformanceScore: Math.round(totals.score / recentMetrics.length),
      activeGenerations: this.activeGenerations.size
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    smartCacheService.clear();
    console.log('[EnhancedRecommendations] All caches cleared');
  }
}

// Export singleton instance
export const enhancedSmartRecommendationsService = new EnhancedSmartRecommendationsService();