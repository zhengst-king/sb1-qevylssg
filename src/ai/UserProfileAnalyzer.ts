import { Movie, supabase } from '../lib/supabase';

export interface UserProfile {
  genrePreferences: Record<string, number>;     // Comedy: 0.3, Action: 0.8, etc.
  eraPreferences: Record<string, number>;       // 1990s: 0.2, 2010s: 0.9, etc.
  ratingThreshold: number;                      // User's avg rating - 1 std dev
  directorPreferences: Record<string, number>;  // Dynamically extracted
  actorPreferences: Record<string, number>;     // Dynamically extracted
  countryPreferences: Record<string, number>;   // USA: 0.9, Spain: 0.4, etc.
  totalWatchlistSize: number;
  averageRating: number;
  ratingStandardDeviation: number;
}

export interface NotInterestedPattern {
  rejectedGenres: Record<string, number>;
  rejectedActors: Record<string, number>;
  rejectedDirectors: Record<string, number>;
  rejectedThemes: string[];
  totalRejected: number;
}

export interface NotInterestedItem {
  imdb_id: string;
  title_type: 'movie' | 'tv';
  created_at: string;
}

export class UserProfileAnalyzer {
  async analyzeWatchlist(watchlist: Movie[]): Promise<UserProfile> {
    console.log('[UserProfileAnalyzer] Analyzing watchlist of', watchlist.length, 'items');

    if (watchlist.length === 0) {
      return this.getDefaultProfile();
    }

    // Extract all user ratings (prioritize user_rating over imdb_score)
    const ratings = watchlist
      .map(movie => movie.user_rating || movie.imdb_score)
      .filter((rating): rating is number => rating !== null && rating !== undefined)
      .map(rating => Number(rating));

    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 7.0;

    const ratingStandardDeviation = this.calculateStandardDeviation(ratings);
    const ratingThreshold = Math.max(1, averageRating - ratingStandardDeviation);

    // Analyze genre preferences
    const genrePreferences = this.analyzeGenrePreferences(watchlist, ratings);
    
    // Analyze era preferences
    const eraPreferences = this.analyzeEraPreferences(watchlist, ratings);
    
    // Analyze director preferences
    const directorPreferences = this.analyzeDirectorPreferences(watchlist, ratings);
    
    // Analyze actor preferences
    const actorPreferences = this.analyzeActorPreferences(watchlist, ratings);
    
    // Analyze country preferences
    const countryPreferences = this.analyzeCountryPreferences(watchlist, ratings);

    const profile: UserProfile = {
      genrePreferences,
      eraPreferences,
      ratingThreshold,
      directorPreferences,
      actorPreferences,
      countryPreferences,
      totalWatchlistSize: watchlist.length,
      averageRating,
      ratingStandardDeviation
    };

    console.log('[UserProfileAnalyzer] Generated profile:', {
      topGenres: Object.entries(genrePreferences).sort(([,a], [,b]) => b - a).slice(0, 3),
      topEras: Object.entries(eraPreferences).sort(([,a], [,b]) => b - a).slice(0, 2),
      ratingThreshold: profile.ratingThreshold,
      averageRating: profile.averageRating
    });

    return profile;
  }

  async analyzeNotInterestedPatterns(userId: string): Promise<NotInterestedPattern> {
    try {
      const { data: notInterestedItems, error } = await supabase
        .from('user_not_interested')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('[UserProfileAnalyzer] Error fetching not interested items:', error);
        return this.getDefaultNotInterestedPattern();
      }

      if (!notInterestedItems || notInterestedItems.length === 0) {
        return this.getDefaultNotInterestedPattern();
      }

      // For now, return basic pattern (can be enhanced with OMDb lookups later)
      return {
        rejectedGenres: {},
        rejectedActors: {},
        rejectedDirectors: {},
        rejectedThemes: [],
        totalRejected: notInterestedItems.length
      };
    } catch (error) {
      console.error('[UserProfileAnalyzer] Error in analyzeNotInterestedPatterns:', error);
      return this.getDefaultNotInterestedPattern();
    }
  }

  private analyzeGenrePreferences(watchlist: Movie[], ratings: number[]): Record<string, number> {
    const genreRatings: Record<string, number[]> = {};
    const genreCounts: Record<string, number> = {};

    watchlist.forEach((movie, index) => {
      if (movie.genre) {
        const movieRating = movie.user_rating || movie.imdb_score || ratings[index] || 7;
        const genres = movie.genre.split(', ').map(g => g.trim());
        
        genres.forEach(genre => {
          if (!genreRatings[genre]) {
            genreRatings[genre] = [];
            genreCounts[genre] = 0;
          }
          genreRatings[genre].push(Number(movieRating));
          genreCounts[genre]++;
        });
      }
    });

    // Calculate preference scores based on average rating and frequency
    const preferences: Record<string, number> = {};
    Object.keys(genreRatings).forEach(genre => {
      const avgRating = genreRatings[genre].reduce((sum, r) => sum + r, 0) / genreRatings[genre].length;
      const frequency = genreCounts[genre] / watchlist.length;
      
      // Combine rating quality (0-1) with frequency weight
      const ratingScore = Math.max(0, (avgRating - 5) / 5); // Normalize 5-10 to 0-1
      const frequencyWeight = Math.min(frequency * 3, 1); // Cap frequency impact
      
      preferences[genre] = (ratingScore * 0.7) + (frequencyWeight * 0.3);
    });

    return preferences;
  }

  private analyzeEraPreferences(watchlist: Movie[], ratings: number[]): Record<string, number> {
    const eraRatings: Record<string, number[]> = {};
    const eraCounts: Record<string, number> = {};

    watchlist.forEach((movie, index) => {
      if (movie.year) {
        const movieRating = movie.user_rating || movie.imdb_score || ratings[index] || 7;
        const decade = Math.floor(movie.year / 10) * 10;
        const era = `${decade}s`;
        
        if (!eraRatings[era]) {
          eraRatings[era] = [];
          eraCounts[era] = 0;
        }
        eraRatings[era].push(Number(movieRating));
        eraCounts[era]++;
      }
    });

    // Calculate era preferences
    const preferences: Record<string, number> = {};
    Object.keys(eraRatings).forEach(era => {
      const avgRating = eraRatings[era].reduce((sum, r) => sum + r, 0) / eraRatings[era].length;
      const frequency = eraCounts[era] / watchlist.length;
      
      const ratingScore = Math.max(0, (avgRating - 5) / 5);
      const frequencyWeight = Math.min(frequency * 2, 1);
      
      preferences[era] = (ratingScore * 0.6) + (frequencyWeight * 0.4);
    });

    return preferences;
  }

  private analyzeDirectorPreferences(watchlist: Movie[], ratings: number[]): Record<string, number> {
    const directorRatings: Record<string, number[]> = {};
    const directorCounts: Record<string, number> = {};

    watchlist.forEach((movie, index) => {
      if (movie.director) {
        const movieRating = movie.user_rating || movie.imdb_score || ratings[index] || 7;
        const directors = movie.director.split(', ').map(d => d.trim());
        
        directors.forEach(director => {
          if (!directorRatings[director]) {
            directorRatings[director] = [];
            directorCounts[director] = 0;
          }
          directorRatings[director].push(Number(movieRating));
          directorCounts[director]++;
        });
      }
    });

    // Only include directors with 2+ movies and good ratings
    const preferences: Record<string, number> = {};
    Object.keys(directorRatings).forEach(director => {
      if (directorCounts[director] >= 2) {
        const avgRating = directorRatings[director].reduce((sum, r) => sum + r, 0) / directorRatings[director].length;
        if (avgRating >= 6.5) {
          const ratingScore = Math.max(0, (avgRating - 5) / 5);
          const frequencyBonus = Math.min(directorCounts[director] / 10, 0.5);
          preferences[director] = ratingScore + frequencyBonus;
        }
      }
    });

    return preferences;
  }

  private analyzeActorPreferences(watchlist: Movie[], ratings: number[]): Record<string, number> {
    const actorRatings: Record<string, number[]> = {};
    const actorCounts: Record<string, number> = {};

    watchlist.forEach((movie, index) => {
      if (movie.actors) {
        const movieRating = movie.user_rating || movie.imdb_score || ratings[index] || 7;
        // Only consider first 3 actors to focus on leads
        const actors = movie.actors.split(', ').slice(0, 3).map(a => a.trim());
        
        actors.forEach(actor => {
          if (!actorRatings[actor]) {
            actorRatings[actor] = [];
            actorCounts[actor] = 0;
          }
          actorRatings[actor].push(Number(movieRating));
          actorCounts[actor]++;
        });
      }
    });

    // Only include actors with 2+ movies and good ratings
    const preferences: Record<string, number> = {};
    Object.keys(actorRatings).forEach(actor => {
      if (actorCounts[actor] >= 2) {
        const avgRating = actorRatings[actor].reduce((sum, r) => sum + r, 0) / actorRatings[actor].length;
        if (avgRating >= 6.5) {
          const ratingScore = Math.max(0, (avgRating - 5) / 5);
          const frequencyBonus = Math.min(actorCounts[actor] / 8, 0.3);
          preferences[actor] = ratingScore + frequencyBonus;
        }
      }
    });

    return preferences;
  }

  private analyzeCountryPreferences(watchlist: Movie[], ratings: number[]): Record<string, number> {
    const countryRatings: Record<string, number[]> = {};
    const countryCounts: Record<string, number> = {};

    watchlist.forEach((movie, index) => {
      if (movie.country) {
        const movieRating = movie.user_rating || movie.imdb_score || ratings[index] || 7;
        const countries = movie.country.split(', ').map(c => c.trim());
        
        countries.forEach(country => {
          if (!countryRatings[country]) {
            countryRatings[country] = [];
            countryCounts[country] = 0;
          }
          countryRatings[country].push(Number(movieRating));
          countryCounts[country]++;
        });
      }
    });

    // Calculate country preferences
    const preferences: Record<string, number> = {};
    Object.keys(countryRatings).forEach(country => {
      const avgRating = countryRatings[country].reduce((sum, r) => sum + r, 0) / countryRatings[country].length;
      const frequency = countryCounts[country] / watchlist.length;
      
      const ratingScore = Math.max(0, (avgRating - 5) / 5);
      const frequencyWeight = Math.min(frequency * 2, 1);
      
      preferences[country] = (ratingScore * 0.7) + (frequencyWeight * 0.3);
    });

    return preferences;
  }

  private calculateStandardDeviation(numbers: number[]): number {
    if (numbers.length === 0) return 1;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  private getDefaultProfile(): UserProfile {
    return {
      genrePreferences: {
        'Drama': 0.7,
        'Comedy': 0.6,
        'Action': 0.5,
        'Thriller': 0.4
      },
      eraPreferences: {
        '2020s': 0.8,
        '2010s': 0.7,
        '2000s': 0.5,
        '1990s': 0.3
      },
      ratingThreshold: 6.5,
      directorPreferences: {},
      actorPreferences: {},
      countryPreferences: {
        'USA': 0.8,
        'UK': 0.4
      },
      totalWatchlistSize: 0,
      averageRating: 7.0,
      ratingStandardDeviation: 1.0
    };
  }

  private getDefaultNotInterestedPattern(): NotInterestedPattern {
    return {
      rejectedGenres: {},
      rejectedActors: {},
      rejectedDirectors: {},
      rejectedThemes: [],
      totalRejected: 0
    };
  }
}