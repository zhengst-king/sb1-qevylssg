import { Movie } from '../lib/supabase';

export interface UserPreferenceProfile {
  genreWeights: Record<string, number>;        // Comedy: 0.8, Action: 0.6, etc.
  ratingThreshold: number;                     // User's average "My Rating"
  yearPreferences: {                           // Decade preferences
    recent: number;    // 2020s weight
    modern: number;    // 2010s weight  
    classic: number;   // pre-2010 weight
  };
  watchFrequency: number;                      // Movies per month
  diversityScore: number;                      // Genre variety 0-1
  countryPreferences: Record<string, number>;  // USA: 0.9, Korea: 0.3
  actorDirectorAffinities: Record<string, number>; // Frequent favorites
}

export interface MovieFeatures {
  genres: number[];           // One-hot encoded genres
  year: number;              // Normalized year (0-1)
  rating: number;            // IMDb rating (0-1)
  runtime: number;           // Normalized runtime (0-1)
  country: number[];         // One-hot encoded countries
  director: number;          // Director popularity score
  actors: number[];          // Actor popularity scores
}

export class FeatureExtractor {
  private genreList: string[] = [
    'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History', 'Horror', 'Music',
    'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
  ];

  private countryList: string[] = [
    'USA', 'UK', 'Canada', 'France', 'Germany', 'Italy', 'Spain', 'Japan',
    'South Korea', 'India', 'Australia', 'China', 'Russia', 'Brazil', 'Mexico'
  ];

  async analyzeUserWatchlist(watchlist: Movie[]): Promise<UserPreferenceProfile> {
    console.log('[FeatureExtractor] Analyzing watchlist of', watchlist.length, 'items');

    if (watchlist.length === 0) {
      return this.getDefaultProfile();
    }

    // Extract genre preferences
    const genreWeights = this.extractGenreWeights(watchlist);
    
    // Calculate rating threshold
    const ratingThreshold = this.calculateRatingThreshold(watchlist);
    
    // Analyze year preferences
    const yearPreferences = this.analyzeYearPreferences(watchlist);
    
    // Calculate watch frequency
    const watchFrequency = this.calculateWatchFrequency(watchlist);
    
    // Calculate diversity score
    const diversityScore = this.calculateDiversityScore(watchlist);
    
    // Extract country preferences
    const countryPreferences = this.extractCountryPreferences(watchlist);
    
    // Extract actor/director affinities
    const actorDirectorAffinities = this.extractActorDirectorAffinities(watchlist);

    const profile: UserPreferenceProfile = {
      genreWeights,
      ratingThreshold,
      yearPreferences,
      watchFrequency,
      diversityScore,
      countryPreferences,
      actorDirectorAffinities
    };

    console.log('[FeatureExtractor] Generated user profile:', profile);
    return profile;
  }

  extractMovieFeatures(movie: Movie): number[] {
    const features: number[] = [];

    // Genre features (one-hot encoded)
    const movieGenres = movie.genre ? movie.genre.split(', ').map(g => g.trim()) : [];
    this.genreList.forEach(genre => {
      features.push(movieGenres.includes(genre) ? 1 : 0);
    });

    // Year feature (normalized)
    const currentYear = new Date().getFullYear();
    const movieYear = movie.year || currentYear;
    features.push((movieYear - 1900) / (currentYear - 1900));

    // Rating feature (normalized)
    const rating = movie.imdb_score || 5.0;
    features.push(rating / 10.0);

    // Runtime feature (normalized)
    const runtime = movie.runtime || 120;
    features.push(Math.min(runtime / 300, 1.0)); // Cap at 5 hours

    // Country features (one-hot encoded)
    const movieCountries = movie.country ? movie.country.split(', ').map(c => c.trim()) : [];
    this.countryList.forEach(country => {
      features.push(movieCountries.includes(country) ? 1 : 0);
    });

    return features;
  }

  calculateSimilarityScore(movieFeatures: number[], userProfile: UserPreferenceProfile): number {
    let score = 0;
    let featureIndex = 0;

    // Genre similarity (40% weight)
    let genreScore = 0;
    this.genreList.forEach(genre => {
      const movieHasGenre = movieFeatures[featureIndex];
      const userGenreWeight = userProfile.genreWeights[genre] || 0;
      genreScore += movieHasGenre * userGenreWeight;
      featureIndex++;
    });
    score += (genreScore / Math.max(Object.keys(userProfile.genreWeights).length, 1)) * 0.4;

    // Year similarity (20% weight)
    const movieYearNorm = movieFeatures[featureIndex++];
    const movieYear = Math.round(movieYearNorm * (new Date().getFullYear() - 1900) + 1900);
    const currentYear = new Date().getFullYear();
    
    let yearScore = 0;
    if (movieYear >= 2020) {
      yearScore = userProfile.yearPreferences.recent;
    } else if (movieYear >= 2010) {
      yearScore = userProfile.yearPreferences.modern;
    } else {
      yearScore = userProfile.yearPreferences.classic;
    }
    score += yearScore * 0.2;

    // Rating similarity (25% weight)
    const movieRating = movieFeatures[featureIndex++] * 10;
    const ratingDiff = Math.abs(movieRating - userProfile.ratingThreshold);
    const ratingScore = Math.max(0, 1 - (ratingDiff / 5));
    score += ratingScore * 0.25;

    // Skip runtime for now
    featureIndex++;

    // Country similarity (15% weight)
    let countryScore = 0;
    this.countryList.forEach(country => {
      const movieHasCountry = movieFeatures[featureIndex];
      const userCountryWeight = userProfile.countryPreferences[country] || 0;
      countryScore += movieHasCountry * userCountryWeight;
      featureIndex++;
    });
    score += (countryScore / Math.max(Object.keys(userProfile.countryPreferences).length, 1)) * 0.15;

    return Math.min(score, 1.0);
  }

  private extractGenreWeights(watchlist: Movie[]): Record<string, number> {
    const genreCounts: Record<string, number> = {};
    const genreRatings: Record<string, number[]> = {};

    watchlist.forEach(movie => {
      if (movie.genre) {
        const genres = movie.genre.split(', ').map(g => g.trim());
        const rating = movie.user_rating || movie.imdb_score || 5;

        genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          if (!genreRatings[genre]) genreRatings[genre] = [];
          genreRatings[genre].push(Number(rating));
        });
      }
    });

    // Calculate weights based on frequency and average rating
    const weights: Record<string, number> = {};
    Object.keys(genreCounts).forEach(genre => {
      const frequency = genreCounts[genre] / watchlist.length;
      const avgRating = genreRatings[genre].reduce((sum, r) => sum + r, 0) / genreRatings[genre].length;
      weights[genre] = frequency * (avgRating / 10); // Normalize to 0-1
    });

    return weights;
  }

  private calculateRatingThreshold(watchlist: Movie[]): number {
    const ratings = watchlist
      .map(movie => movie.user_rating || movie.imdb_score)
      .filter((rating): rating is number => rating !== null && rating !== undefined)
      .map(rating => Number(rating));

    if (ratings.length === 0) return 7.0;

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  private analyzeYearPreferences(watchlist: Movie[]): UserPreferenceProfile['yearPreferences'] {
    const yearCounts = { recent: 0, modern: 0, classic: 0 };
    const yearRatings = { recent: [], modern: [], classic: [] } as Record<string, number[]>;

    watchlist.forEach(movie => {
      if (movie.year) {
        const rating = movie.user_rating || movie.imdb_score || 5;
        
        if (movie.year >= 2020) {
          yearCounts.recent++;
          yearRatings.recent.push(Number(rating));
        } else if (movie.year >= 2010) {
          yearCounts.modern++;
          yearRatings.modern.push(Number(rating));
        } else {
          yearCounts.classic++;
          yearRatings.classic.push(Number(rating));
        }
      }
    });

    // Calculate preferences based on frequency and rating
    const total = yearCounts.recent + yearCounts.modern + yearCounts.classic;
    if (total === 0) return { recent: 0.6, modern: 0.3, classic: 0.1 };

    return {
      recent: (yearCounts.recent / total) * (this.averageRating(yearRatings.recent) / 10),
      modern: (yearCounts.modern / total) * (this.averageRating(yearRatings.modern) / 10),
      classic: (yearCounts.classic / total) * (this.averageRating(yearRatings.classic) / 10)
    };
  }

  private calculateWatchFrequency(watchlist: Movie[]): number {
    const watchDates = watchlist
      .map(movie => movie.date_watched || movie.created_at)
      .filter((date): date is string => !!date)
      .map(date => new Date(date))
      .sort((a, b) => b.getTime() - a.getTime());

    if (watchDates.length < 2) return 1;

    const monthsSpan = (watchDates[0].getTime() - watchDates[watchDates.length - 1].getTime()) / (1000 * 60 * 60 * 24 * 30);
    return watchDates.length / Math.max(monthsSpan, 1);
  }

  private calculateDiversityScore(watchlist: Movie[]): number {
    const uniqueGenres = new Set<string>();
    
    watchlist.forEach(movie => {
      if (movie.genre) {
        movie.genre.split(', ').forEach(genre => uniqueGenres.add(genre.trim()));
      }
    });

    return Math.min(uniqueGenres.size / this.genreList.length, 1.0);
  }

  private extractCountryPreferences(watchlist: Movie[]): Record<string, number> {
    const countryCounts: Record<string, number> = {};
    const countryRatings: Record<string, number[]> = {};

    watchlist.forEach(movie => {
      if (movie.country) {
        const countries = movie.country.split(', ').map(c => c.trim());
        const rating = movie.user_rating || movie.imdb_score || 5;

        countries.forEach(country => {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
          if (!countryRatings[country]) countryRatings[country] = [];
          countryRatings[country].push(Number(rating));
        });
      }
    });

    const preferences: Record<string, number> = {};
    Object.keys(countryCounts).forEach(country => {
      const frequency = countryCounts[country] / watchlist.length;
      const avgRating = this.averageRating(countryRatings[country]);
      preferences[country] = frequency * (avgRating / 10);
    });

    return preferences;
  }

  private extractActorDirectorAffinities(watchlist: Movie[]): Record<string, number> {
    const personCounts: Record<string, number> = {};
    const personRatings: Record<string, number[]> = {};

    watchlist.forEach(movie => {
      const rating = movie.user_rating || movie.imdb_score || 5;
      
      // Directors
      if (movie.director) {
        movie.director.split(', ').forEach(director => {
          const name = director.trim();
          personCounts[name] = (personCounts[name] || 0) + 1;
          if (!personRatings[name]) personRatings[name] = [];
          personRatings[name].push(Number(rating));
        });
      }

      // Actors (limit to first 3 to avoid noise)
      if (movie.actors) {
        movie.actors.split(', ').slice(0, 3).forEach(actor => {
          const name = actor.trim();
          personCounts[name] = (personCounts[name] || 0) + 1;
          if (!personRatings[name]) personRatings[name] = [];
          personRatings[name].push(Number(rating));
        });
      }
    });

    // Only include people with 2+ movies and good ratings
    const affinities: Record<string, number> = {};
    Object.keys(personCounts).forEach(person => {
      if (personCounts[person] >= 2) {
        const avgRating = this.averageRating(personRatings[person]);
        if (avgRating >= 6.0) {
          affinities[person] = (personCounts[person] / watchlist.length) * (avgRating / 10);
        }
      }
    });

    return affinities;
  }

  private averageRating(ratings: number[]): number {
    if (ratings.length === 0) return 5.0;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  private getDefaultProfile(): UserPreferenceProfile {
    return {
      genreWeights: {
        'Drama': 0.7,
        'Comedy': 0.6,
        'Action': 0.5,
        'Thriller': 0.4
      },
      ratingThreshold: 7.0,
      yearPreferences: {
        recent: 0.6,
        modern: 0.3,
        classic: 0.1
      },
      watchFrequency: 2.0,
      diversityScore: 0.5,
      countryPreferences: {
        'USA': 0.8,
        'UK': 0.3
      },
      actorDirectorAffinities: {}
    };
  }
}