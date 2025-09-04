import { omdbApi, OMDBMovieDetails } from './omdb';
import { supabase, Movie } from './supabase';

export interface RecommendationItem {
  imdbID: string;
  title: string;
  year: string;
  genre: string;
  poster: string;
  imdbRating: string;
  type: 'movie' | 'series';
  reason: string;
  score: number;
}

export interface RecommendationLists {
  upcomingMovies: RecommendationItem[];
  upcomingTVSeries: RecommendationItem[];
  releasedMovies: RecommendationItem[];
  releasedTVSeries: RecommendationItem[];
}

interface UserPreferences {
  topGenres: string[];
  averageRating: number;
  favoriteDecades: number[];
  recentWatchingPattern: 'recent' | 'classic' | 'mixed';
  watchedImdbIds: Set<string>;
}

class RecommendationEngine {
  private cache: Map<string, { data: RecommendationLists; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BATCH_SIZE = 5;
  private readonly MAX_RETRIES = 3;

  async getRecommendations(userId: string): Promise<RecommendationLists> {
    console.log('[Recommendations] Starting recommendation generation for user:', userId);

    // Check cache first
    const cacheKey = `recommendations_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[Recommendations] Using cached recommendations');
      return cached.data;
    }

    // Get user's watchlist and preferences
    const userMovies = await this.getUserWatchlist(userId);
    const notInterestedIds = await this.getNotInterestedIds(userId);
    const preferences = this.analyzeUserPreferences(userMovies);

    console.log('[Recommendations] User preferences:', preferences);
    console.log('[Recommendations] User watchlist size:', userMovies.length);
    console.log('[Recommendations] Not interested count:', notInterestedIds.size);

    // Generate recommendations for each category
    const recommendations: RecommendationLists = {
      upcomingMovies: await this.generateRecommendations('movie', 'upcoming', preferences, notInterestedIds),
      upcomingTVSeries: await this.generateRecommendations('series', 'upcoming', preferences, notInterestedIds),
      releasedMovies: await this.generateRecommendations('movie', 'released', preferences, notInterestedIds),
      releasedTVSeries: await this.generateRecommendations('series', 'released', preferences, notInterestedIds)
    };

    // Cache the results
    this.cache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now()
    });

    console.log('[Recommendations] Generated recommendations:', {
      upcomingMovies: recommendations.upcomingMovies.length,
      upcomingTVSeries: recommendations.upcomingTVSeries.length,
      releasedMovies: recommendations.releasedMovies.length,
      releasedTVSeries: recommendations.releasedTVSeries.length
    });

    return recommendations;
  }

  private async getUserWatchlist(userId: string): Promise<Movie[]> {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Recommendations] Error fetching watchlist:', error);
      return [];
    }

    // For large watchlists, sample recent 50 + highest rated 50
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
        console.error('[Recommendations] Error fetching not interested:', error);
        return new Set();
      }

      return new Set(data?.map(item => item.imdb_id) || []);
    } catch (error) {
      console.error('[Recommendations] Error in getNotInterestedIds:', error);
      return new Set();
    }
  }

  private analyzeUserPreferences(movies: Movie[]): UserPreferences {
    const genreCounts: { [genre: string]: number } = {};
    const ratings: number[] = [];
    const decades: { [decade: number]: number } = {};
    const watchDates: Date[] = [];
    const watchedImdbIds = new Set<string>();

    movies.forEach(movie => {
      // Track watched IMDb IDs
      if (movie.imdb_id) {
        watchedImdbIds.add(movie.imdb_id);
      }

      // Analyze genres
      if (movie.genre) {
        movie.genre.split(', ').forEach(genre => {
          genreCounts[genre.trim()] = (genreCounts[genre.trim()] || 0) + 1;
        });
      }

      // Analyze ratings (prioritize user rating over IMDb)
      const rating = movie.user_rating || movie.imdb_score;
      if (rating && rating > 0) {
        ratings.push(Number(rating));
      }

      // Analyze decades
      if (movie.year) {
        const decade = Math.floor(movie.year / 10) * 10;
        decades[decade] = (decades[decade] || 0) + 1;
      }

      // Analyze watch dates
      const watchDate = movie.date_watched || movie.created_at;
      if (watchDate) {
        watchDates.push(new Date(watchDate));
      }
    });

    // Get top 3 genres
    const topGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    // Calculate average rating
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 7.0;

    // Get favorite decades (top 2)
    const favoriteDecades = Object.entries(decades)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([decade]) => parseInt(decade));

    // Analyze recency pattern
    const recentWatchingPattern = this.analyzeRecencyPattern(watchDates);

    return {
      topGenres,
      averageRating,
      favoriteDecades,
      recentWatchingPattern,
      watchedImdbIds
    };
  }

  private analyzeRecencyPattern(watchDates: Date[]): 'recent' | 'classic' | 'mixed' {
    if (watchDates.length === 0) return 'mixed';

    const now = new Date();
    const recentCount = watchDates.filter(date => {
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30; // Last 30 days
    }).length;

    const recentPercentage = recentCount / watchDates.length;

    if (recentPercentage > 0.7) return 'recent';
    if (recentPercentage < 0.3) return 'classic';
    return 'mixed';
  }

  private async generateRecommendations(
    type: 'movie' | 'series',
    category: 'upcoming' | 'released',
    preferences: UserPreferences,
    notInterestedIds: Set<string>
  ): Promise<RecommendationItem[]> {
    console.log(`[Recommendations] Generating ${category} ${type} recommendations`);
    
    // For upcoming content, use current year + 1 and + 2
    const currentYear = new Date().getFullYear();
    if (category === 'upcoming') {
      return await this.generateUpcomingRecommendations(type, preferences, notInterestedIds, currentYear);
    }

    // For released content, use comprehensive search strategy
    return await this.generateReleasedRecommendations(type, preferences, notInterestedIds, currentYear);
  }

  private async generateUpcomingRecommendations(
    type: 'movie' | 'series',
    preferences: UserPreferences,
    notInterestedIds: Set<string>,
    currentYear: number
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];
    const searchTerms: string[] = [];

    // Generate search terms for upcoming content
    const upcomingYears = [currentYear + 1, currentYear + 2];
    
    // If user has genre preferences, search by genre + year
    if (preferences.topGenres.length > 0) {
      preferences.topGenres.forEach(genre => {
        upcomingYears.forEach(year => {
          searchTerms.push(`${genre} ${year}`);
        });
      });
    }

    // Add general upcoming searches
    upcomingYears.forEach(year => {
      searchTerms.push(`${year}`);
      if (type === 'series') {
        searchTerms.push(`series ${year}`);
        searchTerms.push(`tv ${year}`);
      }
    });

    // Search for upcoming content
    for (const searchTerm of searchTerms.slice(0, 8)) {
      if (recommendations.length >= 10) break;

      try {
        await this.delay(1100);
        const searchResults = await omdbApi.searchMovies(searchTerm);
        
        if (searchResults.Search && searchResults.Search.length > 0) {
          const filteredResults = searchResults.Search
            .filter(result => result.Type === type)
            .filter(result => !preferences.watchedImdbIds.has(result.imdbID))
            .filter(result => !notInterestedIds.has(result.imdbID))
            .slice(0, 5);

          for (const result of filteredResults) {
            if (recommendations.length >= 10) break;

            try {
              await this.delay(1100);
              const details = await omdbApi.getMovieDetails(result.imdbID);
              
              const year = parseInt(details.Year);
              if (year <= currentYear) continue; // Only upcoming

              const score = this.scoreRecommendation(details, preferences);
              if (score < 0.2) continue;

              const reason = this.generateReason(details, preferences);
              
              recommendations.push({
                imdbID: details.imdbID,
                title: details.Title,
                year: details.Year,
                genre: details.Genre,
                poster: details.Poster,
                imdbRating: details.imdbRating,
                type: type,
                reason,
                score
              });
            } catch (error) {
              console.error(`[Recommendations] Failed to get details for ${result.imdbID}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`[Recommendations] Search failed for "${searchTerm}":`, error);
        continue;
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private async generateReleasedRecommendations(
    type: 'movie' | 'series',
    preferences: UserPreferences,
    notInterestedIds: Set<string>,
    currentYear: number
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];
    const searchTerms: string[] = [];

    // Generate search terms based on user preferences
    if (preferences.topGenres.length > 0) {
      // Search by top genres
      preferences.topGenres.forEach(genre => {
        searchTerms.push(genre);
        
        // Add genre + recent years
        for (let year = currentYear - 1; year >= currentYear - 5; year--) {
          searchTerms.push(`${genre} ${year}`);
        }
        
        // Add genre + favorite decades
        preferences.favoriteDecades.forEach(decade => {
          if (decade >= 1980) {
            searchTerms.push(`${genre} ${decade}`);
          }
        });
      });
    }

    // Add general high-quality searches
    const recentYears = [currentYear - 1, currentYear - 2, currentYear - 3];
    recentYears.forEach(year => {
      if (type === 'movie') {
        searchTerms.push(`best movies ${year}`);
        searchTerms.push(`top rated ${year}`);
      } else {
        searchTerms.push(`best series ${year}`);
        searchTerms.push(`tv series ${year}`);
      }
    });

    // Add popular searches
    if (type === 'movie') {
      searchTerms.push('popular movies', 'critically acclaimed', 'award winning');
    } else {
      searchTerms.push('popular series', 'tv drama', 'television series');
    }

    // Search for released content
    for (const searchTerm of searchTerms.slice(0, 15)) {
      if (recommendations.length >= 10) break;

      try {
        await this.delay(1100);
        const searchResults = await omdbApi.searchMovies(searchTerm);
        
        if (searchResults.Search && searchResults.Search.length > 0) {
          const filteredResults = searchResults.Search
            .filter(result => result.Type === type)
            .filter(result => !preferences.watchedImdbIds.has(result.imdbID))
            .filter(result => !notInterestedIds.has(result.imdbID))
            .slice(0, 5);

          for (const result of filteredResults) {
            if (recommendations.length >= 10) break;

            try {
              await this.delay(1100);
              const details = await omdbApi.getMovieDetails(result.imdbID);
              
              const year = parseInt(details.Year);
              if (year > currentYear) continue; // Only released

              const score = this.scoreRecommendation(details, preferences);
              if (score < 0.3) continue;

              const reason = this.generateReason(details, preferences);
              
              recommendations.push({
                imdbID: details.imdbID,
                title: details.Title,
                year: details.Year,
                genre: details.Genre,
                poster: details.Poster,
                imdbRating: details.imdbRating,
                type: type,
                reason,
                score
              });
            } catch (error) {
              console.error(`[Recommendations] Failed to get details for ${result.imdbID}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`[Recommendations] Search failed for "${searchTerm}":`, error);
        continue;
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private scoreRecommendation(movie: OMDBMovieDetails, preferences: UserPreferences): number {
    let score = 0;

    // Genre match (35%)
    if (movie.Genre && movie.Genre !== 'N/A') {
      const movieGenres = movie.Genre.split(', ').map(g => g.trim());
      const genreMatches = movieGenres.filter(genre => 
        preferences.topGenres.some(userGenre => 
          userGenre.toLowerCase() === genre.toLowerCase()
        )
      ).length;
      if (preferences.topGenres.length > 0) {
        score += (genreMatches / preferences.topGenres.length) * 0.35;
      }
    }

    // Rating similarity (30%)
    if (movie.imdbRating && movie.imdbRating !== 'N/A') {
      const movieRating = parseFloat(movie.imdbRating);
      if (!isNaN(movieRating)) {
        const ratingDiff = Math.abs(movieRating - preferences.averageRating);
        const ratingScore = Math.max(0, 1 - (ratingDiff / 5)); // Normalize to 0-1
        score += ratingScore * 0.30;
      }
    }

    // Release timing (10%)
    if (movie.Year && movie.Year !== 'N/A') {
      const movieYear = parseInt(movie.Year);
      const movieDecade = Math.floor(movieYear / 10) * 10;
      if (preferences.favoriteDecades.includes(movieDecade)) {
        score += 0.10;
      }
    }

    // Recency preference (25%)
    const currentYear = new Date().getFullYear();
    const movieYear = parseInt(movie.Year);
    
    if (preferences.recentWatchingPattern === 'recent') {
      // Prefer newer content
      const yearDiff = currentYear - movieYear;
      const recencyScore = Math.max(0, 1 - (yearDiff / 20)); // Favor last 20 years
      score += recencyScore * 0.25;
    } else if (preferences.recentWatchingPattern === 'classic') {
      // Prefer older content
      const yearDiff = currentYear - movieYear;
      const classicScore = yearDiff > 10 ? 0.25 : yearDiff / 40; // Favor 10+ years old
      score += classicScore;
    } else {
      // Mixed preference - moderate bonus for any content
      score += 0.125;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private generateReason(movie: OMDBMovieDetails, preferences: UserPreferences): string {
    const reasons: string[] = [];

    // Genre match
    if (movie.Genre && movie.Genre !== 'N/A') {
      const movieGenres = movie.Genre.split(', ').map(g => g.trim());
      const matchingGenres = movieGenres.filter(genre => 
        preferences.topGenres.some(userGenre => 
          userGenre.toLowerCase() === genre.toLowerCase()
        )
      );
      if (matchingGenres.length > 0) {
        reasons.push(`matches your interest in ${matchingGenres.join(', ')}`);
      }
    }

    // Rating similarity
    if (movie.imdbRating && movie.imdbRating !== 'N/A') {
      const movieRating = parseFloat(movie.imdbRating);
      if (!isNaN(movieRating) && Math.abs(movieRating - preferences.averageRating) <= 1.0) {
        reasons.push(`has a similar rating (${movie.imdbRating}) to your preferences`);
      }
    }

    // Decade preference
    if (movie.Year && movie.Year !== 'N/A') {
      const movieYear = parseInt(movie.Year);
      const movieDecade = Math.floor(movieYear / 10) * 10;
      if (preferences.favoriteDecades.includes(movieDecade)) {
        reasons.push(`from your favorite decade (${movieDecade}s)`);
      }
    }

    return reasons.length > 0 
      ? `Recommended because it ${reasons.join(' and ')}.`
      : 'Recommended based on your viewing history.';
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
      console.error('[Recommendations] Error adding to not interested:', error);
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
      console.error('[Recommendations] Error removing from not interested:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const recommendationEngine = new RecommendationEngine();