import { Movie, supabase } from '../lib/supabase';
import { omdbApi, OMDBMovieDetails } from '../lib/omdb';
import { UserProfileAnalyzer, UserProfile, NotInterestedPattern } from './UserProfileAnalyzer';
import { RecommendationScorer, ScoredRecommendation } from './RecommendationScorer';

export interface DynamicRecommendation {
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
  imdbUrl: string;
}

export interface DynamicRecommendationLists {
  releasedMovies: DynamicRecommendation[];
  releasedTVSeries: DynamicRecommendation[];
}

export class DynamicRecommendationEngine {
  private analyzer: UserProfileAnalyzer;
  private scorer: RecommendationScorer;
  private cache: Map<string, { data: DynamicRecommendationLists; timestamp: number; profile: UserProfile }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REQUEST_DELAY = 200; // Paid tier - faster requests allowed
  private lastRequestTime = 0;
  private fallbackMode = false;

  constructor() {
    this.analyzer = new UserProfileAnalyzer();
    this.scorer = new RecommendationScorer();
  }

  async generateRecommendations(userId: string): Promise<DynamicRecommendationLists> {
    console.log('[DynamicEngine] Starting recommendation generation for user:', userId);

    // Check cache first
    const cacheKey = `dynamic_recs_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[DynamicEngine] Using cached recommendations');
      return cached.data;
    }

    // Get user's watchlist and analyze preferences
    const watchlist = await this.getUserWatchlist(userId);
    const userProfile = await this.analyzer.analyzeWatchlist(watchlist);
    const notInterestedPattern = await this.analyzer.analyzeNotInterestedPatterns(userId);
    const watchedImdbIds = new Set(watchlist.map(m => m.imdb_id).filter(Boolean));

    console.log('[DynamicEngine] User analysis complete:', {
      watchlistSize: watchlist.length,
      topGenres: Object.entries(userProfile.genrePreferences).sort(([,a], [,b]) => b - a).slice(0, 3),
      ratingThreshold: userProfile.ratingThreshold,
      averageRating: userProfile.averageRating
    });

    // Generate recommendations for each category
    const recommendations: DynamicRecommendationLists = {
      releasedMovies: await this.generateCategoryRecommendations('movie', 'released', userProfile, notInterestedPattern, watchedImdbIds),
      releasedTVSeries: await this.generateCategoryRecommendations('series', 'released', userProfile, notInterestedPattern, watchedImdbIds)
    };

    // Cache results
    this.cache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now(),
      profile: userProfile
    });

    console.log('[DynamicEngine] Generated recommendations:', {
      releasedMovies: recommendations.releasedMovies.length,
      releasedTVSeries: recommendations.releasedTVSeries.length
    });

    return recommendations;
  }

  private async generateCategoryRecommendations(
    type: 'movie' | 'series',
    category: 'released',
    userProfile: UserProfile,
    notInterestedPattern: NotInterestedPattern,
    watchedImdbIds: Set<string>
  ): Promise<DynamicRecommendation[]> {
    console.log(`[DynamicEngine] Generating released ${type} recommendations`);
    
    const recommendations: DynamicRecommendation[] = [];
    const currentYear = new Date().getFullYear();
    
    // Generate smart search terms based on user preferences
    const searchTerms = this.generateSmartSearchTerms(userProfile, type, 'released', currentYear);
    console.log(`[DynamicEngine] Using search terms for released ${type}:`, searchTerms.slice(0, 5));

    // Search and score candidates
    for (const searchTerm of searchTerms) {
      if (recommendations.length >= 10) break; // Reduced to minimize API calls
      
      // Skip if we're in fallback mode due to rate limits
      if (this.fallbackMode) {
        console.log('[DynamicEngine] Skipping search due to rate limit fallback mode');
        break;
      }

      try {
        await this.throttleRequest();
        const searchResults = await omdbApi.searchMovies(searchTerm);
        
        // Check if we got fallback results (empty due to rate limit)
        if (!searchResults.Search || searchResults.Search.length === 0) {
          console.log('[DynamicEngine] Empty results, possibly due to rate limits');
          continue;
        }
        
        if (searchResults.Search && searchResults.Search.length > 0) {
          const filteredResults = searchResults.Search
            .filter(result => result.Type === type)
            .filter(result => !watchedImdbIds.has(result.imdbID))
            .filter(result => this.isRelevantToUser(result, userProfile))
            .slice(0, 2); // Get 2 relevant results per search

          for (const result of filteredResults) {
            if (recommendations.length >= 10) break;

            try {
              await this.throttleRequest();
              const details = await omdbApi.getMovieDetails(result.imdbID);
              
              // Filter by release timing
              const movieYear = parseInt(details.Year);
              if (movieYear > currentYear) continue; // Only released content

              // Skip if already in recommendations
              if (recommendations.some(r => r.imdbID === details.imdbID)) continue;

              // Score the movie
              const scored = this.scorer.scoreMovie(details, userProfile, notInterestedPattern);
              
              // Only include if score is decent
              if (scored.score < 0.3) continue;

              const recommendation: DynamicRecommendation = {
                imdbID: details.imdbID,
                title: details.Title,
                year: details.Year,
                genre: details.Genre,
                poster: details.Poster,
                imdbRating: details.imdbRating,
                type: type,
                reason: scored.reasoning.join('. ') || 'Recommended based on your viewing history.',
                score: scored.score,
                confidence: scored.confidence,
                imdbUrl: `https://www.imdb.com/title/${details.imdbID}/`
              };

              recommendations.push(recommendation);
              
            } catch (error) {
              console.error(`[DynamicEngine] Failed to get details for ${result.imdbID}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for rate limit errors
        if (errorMessage.includes('Request limit reached') || errorMessage.includes('Daily API limit reached')) {
          console.warn('[DynamicEngine] Rate limit reached, entering fallback mode');
          this.fallbackMode = true;
          break;
        }
        
        console.error(`[DynamicEngine] Search failed for "${searchTerm}":`, error);
        continue;
      }
    }

    // Add 10% discovery recommendations from underrepresented genres
    if (!this.fallbackMode && recommendations.length < 8) {
      try {
        const discoveryRecs = await this.generateDiscoveryRecommendations(
          type, 'released', userProfile, watchedImdbIds, currentYear
        );
        recommendations.push(...discoveryRecs);
      } catch (error) {
        console.warn('[DynamicEngine] Discovery recommendations failed:', error);
      }
    }

    // Sort by score and return top 10
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private isRelevantToUser(searchResult: any, userProfile: UserProfile): boolean {
    const title = searchResult.Title.toLowerCase();
    const year = parseInt(searchResult.Year);
    
    // Get user's top genres
    const topGenres = Object.entries(userProfile.genrePreferences)
      .filter(([, score]) => score > 0.3)
      .map(([genre]) => genre.toLowerCase());
    
    // Exclude obvious mismatches based on title keywords
    const excludeKeywords = [
      'kids', 'children', 'family', 'baby', 'cartoon', 'disney',
      'teenage', 'teen', 'high school', 'college', 'romance',
      'wedding', 'christmas', 'holiday', 'musical', 'sing'
    ];
    
    // If user likes action/thriller/crime, exclude family content
    if (topGenres.includes('action') || topGenres.includes('thriller') || topGenres.includes('crime')) {
      if (excludeKeywords.some(keyword => title.includes(keyword))) {
        return false;
      }
    }
    
    // Exclude very old content unless user has classic preferences
    const hasClassicPreference = userProfile.eraPreferences['1980s'] > 0.3 || 
                                userProfile.eraPreferences['1990s'] > 0.3;
    if (!hasClassicPreference && year < 2000) {
      return false;
    }
    
    return true;
  }

  private generateSmartSearchTerms(
    userProfile: UserProfile,
    type: 'movie' | 'series',
    category: 'upcoming' | 'released',
    currentYear: number
  ): string[] {
    const terms: string[] = [];
    
    // Get user's ACTUAL top preferences (only genres with significant preference)
    const topGenres = Object.entries(userProfile.genrePreferences)
      .filter(([, score]) => score > 0.3) // Only include genres user actually likes
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
    
    // Only use eras with strong preference
    const topEras = Object.entries(userProfile.eraPreferences)
      .filter(([, score]) => score > 0.4)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([era]) => era);
    
    // Only use directors with strong preference
    const topDirectors = Object.entries(userProfile.directorPreferences)
      .filter(([, score]) => score > 0.5)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([director]) => director);

    console.log(`[DynamicEngine] User preferences for ${type}:`, {
      topGenres,
      ratingThreshold: userProfile.ratingThreshold,
      averageRating: userProfile.averageRating
    });

    // If user has no strong preferences, use fallback
    if (topGenres.length === 0) {
      console.log('[DynamicEngine] No strong genre preferences found, using quality-based searches');
      if (type === 'movie') {
        terms.push('best movies 2023', 'top rated 2022', 'critically acclaimed');
      } else {
        terms.push('best series 2023', 'top tv 2022', 'acclaimed series');
      }
      return terms.slice(0, 3);
    }

    // Generate targeted searches based on user's ACTUAL preferences
    const searchYears = category === 'upcoming' 
      ? [currentYear + 1, currentYear + 2]
      : [currentYear, currentYear - 1, currentYear - 2];

    // 1. Primary genre searches (most important)
    topGenres.slice(0, 2).forEach(genre => {
      if (type === 'movie') {
        terms.push(`${genre.toLowerCase()} movie`);
        terms.push(`${genre.toLowerCase()} film high rated`);
      } else {
        terms.push(`${genre.toLowerCase()} series`);
        terms.push(`${genre.toLowerCase()} tv show`);
      }
    });

    // 2. Genre combinations for better targeting
    if (topGenres.length >= 2) {
      terms.push(`${topGenres[0].toLowerCase()} ${topGenres[1].toLowerCase()}`);
    }

    // 3. Director-based searches (if user has strong director preferences)
    if (topDirectors.length > 0) {
      terms.push(topDirectors[0]);
    }

    // 4. Year + genre combinations for recent content
    if (category === 'released') {
      searchYears.slice(0, 1).forEach(year => {
        terms.push(`${topGenres[0].toLowerCase()} ${year}`);
      });
    }

    // 5. Quality-based searches with user's preferred genres
    if (userProfile.ratingThreshold >= 7.5) {
      if (type === 'movie') {
        terms.push(`best ${topGenres[0].toLowerCase()} movies`);
      } else {
        terms.push(`best ${topGenres[0].toLowerCase()} series`);
      }
    }

    return terms.slice(0, 6); // Limit to 6 targeted search terms
  }
  private async generateDiscoveryRecommendations(
    type: 'movie' | 'series',
    category: 'released',
    userProfile: UserProfile,
    watchedImdbIds: Set<string>,
    currentYear: number
  ): Promise<DynamicRecommendation[]> {
    // Find underrepresented genres (those with low preference scores)
    const underrepresentedGenres = ['Documentary', 'Animation', 'Musical', 'Western', 'Film-Noir']
      .filter(genre => (userProfile.genrePreferences[genre] || 0) < 0.2);

    const discoveryRecs: DynamicRecommendation[] = [];
    
    // Search for 1 discovery recommendation only
    for (const genre of underrepresentedGenres.slice(0, 1)) {
      if (discoveryRecs.length >= 1) break;

      try {
        await this.throttleRequest();
        const searchTerm = `best ${genre}`;
        
        const searchResults = await omdbApi.searchMovies(searchTerm);
        
        if (searchResults.Search && searchResults.Search.length > 0) {
          const result = searchResults.Search
            .filter(r => r.Type === type)
            .filter(r => !watchedImdbIds.has(r.imdbID))[0];

          if (result) {
            await this.throttleRequest();
            const details = await omdbApi.getMovieDetails(result.imdbID);
            
            const movieYear = parseInt(details.Year);
            if (movieYear > currentYear) continue; // Only released content

            // Give discovery recommendations a base score
            const discoveryRec: DynamicRecommendation = {
              imdbID: details.imdbID,
              title: details.Title,
              year: details.Year,
              genre: details.Genre,
              poster: details.Poster,
              imdbRating: details.imdbRating,
              type: type,
              reason: `Discovery recommendation: Explore ${genre} genre`,
              score: 0.4, // Base discovery score
              confidence: 0.6,
              imdbUrl: `https://www.imdb.com/title/${details.imdbID}/`
            };

            discoveryRecs.push(discoveryRec);
          }
        }
      } catch (error) {
        console.error(`[DynamicEngine] Discovery search failed for ${genre}:`, error);
        continue;
      }
    }

    return discoveryRecs;
  }

  private async getUserWatchlist(userId: string): Promise<Movie[]> {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DynamicEngine] Error fetching watchlist:', error);
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

  async addToNotInterested(userId: string, imdbId: string, titleType: 'movie' | 'tv'): Promise<void> {
    const { error } = await supabase
      .from('user_not_interested')
      .insert([{
        user_id: userId,
        imdb_id: imdbId,
        title_type: titleType
      }]);

    if (error) {
      console.error('[DynamicEngine] Error adding to not interested:', error);
      throw error;
    }

    // Clear cache to force refresh
    this.clearUserCache(userId);
  }

  async removeFromNotInterested(userId: string, imdbId: string): Promise<void> {
    const { error } = await supabase
      .from('user_not_interested')
      .delete()
      .eq('user_id', userId)
      .eq('imdb_id', imdbId);

    if (error) {
      console.error('[DynamicEngine] Error removing from not interested:', error);
      throw error;
    }

    // Clear cache to force refresh
    this.clearUserCache(userId);
  }

  async handleComplexQuery(nlQuery: string, userId: string): Promise<DynamicRecommendation[]> {
    // Future Phase 2: Natural language query processing
    console.log('[DynamicEngine] Complex query handling (Phase 2):', nlQuery);
    return [];
  }

  private async filterByUserPreferences(movies: OMDBMovieDetails[], userProfile: UserProfile): Promise<OMDBMovieDetails[]> {
    return movies.filter(movie => {
      // Basic quality filter
      if (movie.imdbRating !== 'N/A') {
        const rating = parseFloat(movie.imdbRating);
        if (rating < userProfile.ratingThreshold - 1) {
          return false;
        }
      }
      
      return true;
    });
  }

  private async excludeWatchlistAndBlacklist(
    movies: OMDBMovieDetails[], 
    watchedImdbIds: Set<string>,
    userId: string
  ): Promise<OMDBMovieDetails[]> {
    // Get blacklisted IMDb IDs
    const { data: notInterested } = await supabase
      .from('user_not_interested')
      .select('imdb_id')
      .eq('user_id', userId);

    const blacklistedIds = new Set(notInterested?.map(item => item.imdb_id) || []);

    return movies.filter(movie => 
      !watchedImdbIds.has(movie.imdbID) && 
      !blacklistedIds.has(movie.imdbID)
    );
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[DynamicEngine] All cache cleared');
  }

  clearUserCache(userId: string): void {
    const cacheKey = `dynamic_recs_${userId}`;
    this.cache.delete(cacheKey);
    this.fallbackMode = false; // Reset fallback mode when cache is cleared
    console.log('[DynamicEngine] User cache cleared for:', userId);
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

  getEngineInfo(): { 
    cacheSize: number; 
    lastAnalysis: string | null;
    version: string;
    fallbackMode: boolean;
    omdbUsage: any;
  } {
    return {
      cacheSize: this.cache.size,
      lastAnalysis: this.cache.size > 0 ? 'Available' : null,
      version: '1.0.0-dynamic',
      fallbackMode: this.fallbackMode,
      omdbUsage: omdbApi.getUsageStats()
    };
  }
}