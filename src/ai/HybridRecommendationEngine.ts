import { Movie, supabase } from '../lib/supabase';
import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { FeatureExtractor, UserPreferenceProfile } from '../ml/FeatureExtractor';
import { LocalMLModel, MLPrediction } from '../ml/LocalMLModel';

export interface EnhancedRecommendation {
  imdbID: string;
  title: string;
  year: string;
  genre: string;
  poster: string;
  imdbRating: string;
  type: 'movie' | 'series';
  reason: string;
  score: number;
  confidence: number;
  mlPrediction: MLPrediction;
}

export interface HybridRecommendationLists {
  upcomingMovies: EnhancedRecommendation[];
  upcomingTVSeries: EnhancedRecommendation[];
  releasedMovies: EnhancedRecommendation[];
  releasedTVSeries: EnhancedRecommendation[];
}

export class HybridRecommendationEngine {
  private featureExtractor: FeatureExtractor;
  private mlModel: LocalMLModel;
  private cache: Map<string, { data: HybridRecommendationLists; timestamp: number; profile: UserPreferenceProfile }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REQUEST_DELAY = 1100; // OMDb rate limit
  private lastRequestTime = 0;

  constructor() {
    this.featureExtractor = new FeatureExtractor();
    this.mlModel = new LocalMLModel();
  }

  async generateRecommendations(userId: string): Promise<HybridRecommendationLists> {
    console.log('[HybridEngine] Starting recommendation generation for user:', userId);

    // Check cache first
    const cacheKey = `hybrid_recs_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[HybridEngine] Using cached recommendations');
      return cached.data;
    }

    // Initialize ML model
    await this.mlModel.initialize();

    // Get user's watchlist and analyze preferences
    const watchlist = await this.getUserWatchlist(userId);
    const notInterestedIds = await this.getNotInterestedIds(userId);
    const userProfile = await this.featureExtractor.analyzeUserWatchlist(watchlist);

    console.log('[HybridEngine] User analysis complete:', {
      watchlistSize: watchlist.length,
      notInterestedCount: notInterestedIds.size,
      topGenres: Object.keys(userProfile.genreWeights).slice(0, 3),
      ratingThreshold: userProfile.ratingThreshold
    });

    // Generate recommendations for each category
    const recommendations: HybridRecommendationLists = {
      upcomingMovies: await this.generateCategoryRecommendations('movie', 'upcoming', userProfile, watchlist, notInterestedIds),
      upcomingTVSeries: await this.generateCategoryRecommendations('series', 'upcoming', userProfile, watchlist, notInterestedIds),
      releasedMovies: await this.generateCategoryRecommendations('movie', 'released', userProfile, watchlist, notInterestedIds),
      releasedTVSeries: await this.generateCategoryRecommendations('series', 'released', userProfile, watchlist, notInterestedIds)
    };

    // Cache results
    this.cache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now(),
      profile: userProfile
    });

    console.log('[HybridEngine] Generated recommendations:', {
      upcomingMovies: recommendations.upcomingMovies.length,
      upcomingTVSeries: recommendations.upcomingTVSeries.length,
      releasedMovies: recommendations.releasedMovies.length,
      releasedTVSeries: recommendations.releasedTVSeries.length
    });

    return recommendations;
  }

  private async generateCategoryRecommendations(
    type: 'movie' | 'series',
    category: 'upcoming' | 'released',
    userProfile: UserPreferenceProfile,
    watchlist: Movie[],
    notInterestedIds: Set<string>
  ): Promise<EnhancedRecommendation[]> {
    console.log(`[HybridEngine] Generating ${category} ${type} recommendations`);
    
    const recommendations: EnhancedRecommendation[] = [];
    const watchedImdbIds = new Set(watchlist.map(m => m.imdb_id).filter(Boolean));
    
    // For upcoming content, focus on recent years + 1-2 years ahead
    const currentYear = new Date().getFullYear();
    const searchYears = category === 'upcoming' 
      ? [currentYear + 1, currentYear + 2]
      : [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

    // Generate search terms based on user preferences
    const searchTerms = this.generateSearchTerms(userProfile, type, category, searchYears);
    
    console.log(`[HybridEngine] Using search terms:`, searchTerms.slice(0, 5));

    // Search for recommendations
    for (const searchTerm of searchTerms) {
      if (recommendations.length >= 10) break;

      try {
        await this.throttleRequest();
        const searchResults = await omdbApi.searchMovies(searchTerm);
        
        if (searchResults.Search && searchResults.Search.length > 0) {
          const filteredResults = searchResults.Search
            .filter(result => result.Type === type)
            .filter(result => !watchedImdbIds.has(result.imdbID))
            .filter(result => !notInterestedIds.has(result.imdbID))
            .slice(0, 3); // Limit per search to ensure variety

          for (const result of filteredResults) {
            if (recommendations.length >= 10) break;

            try {
              await this.throttleRequest();
              const details = await omdbApi.getMovieDetails(result.imdbID);
              
              // Filter by release timing
              const movieYear = parseInt(details.Year);
              if (category === 'upcoming' && movieYear <= currentYear) continue;
              if (category === 'released' && movieYear > currentYear) continue;

              // Skip if already exists in recommendations
              if (recommendations.some(r => r.imdbID === details.imdbID)) continue;

              // Create movie object for ML analysis
              const movieForAnalysis: Movie = {
                title: details.Title,
                genre: details.Genre !== 'N/A' ? details.Genre : undefined,
                year: movieYear,
                country: details.Country !== 'N/A' ? details.Country : undefined,
                director: details.Director !== 'N/A' ? details.Director : undefined,
                actors: details.Actors !== 'N/A' ? details.Actors : undefined,
                imdb_score: details.imdbRating !== 'N/A' ? parseFloat(details.imdbRating) : undefined,
                runtime: details.Runtime !== 'N/A' ? parseInt(details.Runtime.replace(' min', '')) : undefined,
                media_type: type,
                status: 'To Watch'
              };

              // Get ML prediction
              const movieFeatures = this.featureExtractor.extractMovieFeatures(movieForAnalysis);
              const mlPrediction = await this.mlModel.predict(movieFeatures, userProfile);

              // Only include if ML model gives decent score
              if (mlPrediction.score < 0.3) continue;

              const enhancedRec: EnhancedRecommendation = {
                imdbID: details.imdbID,
                title: details.Title,
                year: details.Year,
                genre: details.Genre,
                poster: details.Poster,
                imdbRating: details.imdbRating,
                type: type,
                reason: this.generateReason(mlPrediction, userProfile, movieForAnalysis),
                score: mlPrediction.score,
                confidence: mlPrediction.confidence,
                mlPrediction
              };

              recommendations.push(enhancedRec);
              
            } catch (error) {
              console.error(`[HybridEngine] Failed to get details for ${result.imdbID}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`[HybridEngine] Search failed for "${searchTerm}":`, error);
        continue;
      }
    }

    // Sort by ML score and return top 10
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private generateSearchTerms(
    userProfile: UserPreferenceProfile,
    type: 'movie' | 'series',
    category: 'upcoming' | 'released',
    years: number[]
  ): string[] {
    const terms: string[] = [];
    
    // Top genres + years
    const topGenres = Object.entries(userProfile.genreWeights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    topGenres.forEach(genre => {
      years.forEach(year => {
        terms.push(`${genre} ${year}`);
      });
      terms.push(genre); // Genre alone
    });

    // High-quality searches
    years.forEach(year => {
      if (type === 'movie') {
        terms.push(`best movies ${year}`);
        terms.push(`top rated ${year}`);
      } else {
        terms.push(`best series ${year}`);
        terms.push(`tv series ${year}`);
      }
    });

    // Popular searches
    if (type === 'movie') {
      terms.push('popular movies', 'critically acclaimed', 'award winning');
    } else {
      terms.push('popular series', 'tv drama', 'television series');
    }

    // Country-based searches
    const topCountries = Object.entries(userProfile.countryPreferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([country]) => country);

    topCountries.forEach(country => {
      if (type === 'movie') {
        terms.push(`${country} movies`);
      } else {
        terms.push(`${country} series`);
      }
    });

    return terms.slice(0, 20); // Limit total searches
  }

  private generateReason(prediction: MLPrediction, userProfile: UserPreferenceProfile, movie: Movie): string {
    if (prediction.reasoning.length > 0) {
      return prediction.reasoning.join('. ') + '.';
    }

    // Fallback reasoning
    const reasons: string[] = [];
    
    if (movie.genre) {
      const movieGenres = movie.genre.split(', ');
      const matchingGenres = movieGenres.filter(genre => 
        userProfile.genreWeights[genre.trim()] > 0.3
      );
      if (matchingGenres.length > 0) {
        reasons.push(`matches your interest in ${matchingGenres.join(', ')}`);
      }
    }

    if (movie.imdb_score && Math.abs(movie.imdb_score - userProfile.ratingThreshold) <= 1) {
      reasons.push(`has a rating (${movie.imdb_score}) similar to your preferences`);
    }

    return reasons.length > 0 
      ? `Recommended because it ${reasons.join(' and ')}.`
      : 'Recommended based on your viewing patterns.';
  }

  private async getUserWatchlist(userId: string): Promise<Movie[]> {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[HybridEngine] Error fetching watchlist:', error);
      return [];
    }

    // For large watchlists, sample intelligently
    if (data && data.length > 100) {
      const recent50 = data.slice(0, 50);
      const highestRated = data
        .filter(m => m.user_rating && m.user_rating >= 7)
        .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
        .slice(0, 50);
      
      // Combine and deduplicate
      const combined = [...recent50];
      highestRated.forEach(movie => {
        if (!combined.find(m => m.id === movie.id)) {
          combined.push(movie);
        }
      });
      
      return combined;
    }

    return data || [];
  }

  private async getNotInterestedIds(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from('user_not_interested')
        .select('imdb_id')
        .eq('user_id', userId);

      if (error) {
        console.error('[HybridEngine] Error fetching not interested:', error);
        return new Set();
      }

      return new Set(data?.map(item => item.imdb_id) || []);
    } catch (error) {
      console.error('[HybridEngine] Error in getNotInterestedIds:', error);
      return new Set();
    }
  }

  async addToNotInterested(userId: string, imdbId: string, titleType: 'movie' | 'tv'): Promise<void> {
    const { error } = await supabase
      .from('user_not_interested')
      .insert([{
        user_id: userId,
        imdb_id: imdbId,
        title_type: titleType
      }]);

    if (error) {
      console.error('[HybridEngine] Error adding to not interested:', error);
      throw error;
    }
  }

  async removeFromNotInterested(userId: string, imdbId: string): Promise<void> {
    const { error } = await supabase
      .from('user_not_interested')
      .delete()
      .eq('user_id', userId)
      .eq('imdb_id', imdbId);

    if (error) {
      console.error('[HybridEngine] Error removing from not interested:', error);
      throw error;
    }
  }

  async handleComplexQuery(nlQuery: string, userId: string): Promise<EnhancedRecommendation[]> {
    // Future Phase 2: Natural language query processing
    console.log('[HybridEngine] Complex query handling (Phase 2):', nlQuery);
    return [];
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[HybridEngine] Cache cleared');
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const waitTime = this.REQUEST_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async recordUserFeedback(userId: string, imdbId: string, liked: boolean): Promise<void> {
    // Store feedback for ML model improvement
    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: userId,
          imdb_id: imdbId,
          liked: liked,
          created_at: new Date().toISOString()
        }]);

      if (error && error.code !== '42P01') { // Ignore if table doesn't exist yet
        console.error('[HybridEngine] Error recording feedback:', error);
      }
    } catch (error) {
      console.log('[HybridEngine] Feedback recording skipped (table not created yet)');
    }
  }

  getEngineInfo(): { 
    mlModel: any; 
    cacheSize: number; 
    lastAnalysis: string | null;
  } {
    return {
      mlModel: this.mlModel.getModelInfo(),
      cacheSize: this.cache.size,
      lastAnalysis: this.cache.size > 0 ? 'Available' : null
    };
  }
}