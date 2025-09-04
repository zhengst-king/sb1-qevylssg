import { Movie } from '../lib/supabase';
import { UserProfile, NotInterestedPattern } from './UserProfileAnalyzer';
import { OMDBMovieDetails } from '../lib/omdb';

export interface ScoredRecommendation {
  movie: OMDBMovieDetails;
  score: number;
  confidence: number;
  reasoning: string[];
  breakdown: {
    genreScore: number;
    eraScore: number;
    qualityScore: number;
    avoidanceScore: number;
    talentScore: number;
  };
}

export class RecommendationScorer {
  scoreMovie(
    movie: OMDBMovieDetails, 
    userProfile: UserProfile, 
    notInterestedPattern: NotInterestedPattern
  ): ScoredRecommendation {
    let totalScore = 0;
    const reasoning: string[] = [];
    const breakdown = {
      genreScore: 0,
      eraScore: 0,
      qualityScore: 0,
      avoidanceScore: 0,
      talentScore: 0
    };

    // 1. Genre matching (35% weight)
    const genreScore = this.calculateGenreScore(movie, userProfile.genrePreferences);
    breakdown.genreScore = genreScore;
    totalScore += genreScore * 0.35;
    
    if (genreScore > 0.7) {
      const topGenres = this.getMovieGenres(movie).filter(genre => 
        userProfile.genrePreferences[genre] > 0.6
      );
      if (topGenres.length > 0) {
        reasoning.push(`Matches your love for ${topGenres.slice(0, 2).join(' and ')}`);
      }
    }

    // 2. Era preferences (25% weight)
    const eraScore = this.calculateEraScore(movie, userProfile.eraPreferences);
    breakdown.eraScore = eraScore;
    totalScore += eraScore * 0.25;
    
    if (eraScore > 0.6) {
      const movieYear = parseInt(movie.Year);
      const decade = Math.floor(movieYear / 10) * 10;
      reasoning.push(`From your preferred ${decade}s era`);
    }

    // 3. Quality threshold (20% weight)
    const qualityScore = this.calculateQualityScore(movie, userProfile.ratingThreshold);
    breakdown.qualityScore = qualityScore;
    totalScore += qualityScore * 0.20;
    
    if (qualityScore > 0.7 && movie.imdbRating !== 'N/A') {
      reasoning.push(`High rating (${movie.imdbRating}) matches your standards`);
    }

    // 4. Not-interested penalty (15% weight)
    const avoidanceScore = this.calculateAvoidanceScore(movie, notInterestedPattern);
    breakdown.avoidanceScore = avoidanceScore;
    totalScore += avoidanceScore * 0.15;

    // 5. Director/actor boost (5% weight)
    const talentScore = this.calculateTalentScore(movie, userProfile);
    breakdown.talentScore = talentScore;
    totalScore += talentScore * 0.05;
    
    if (talentScore > 0.5) {
      const favoriteDirectors = this.getMovieDirectors(movie).filter(director => 
        userProfile.directorPreferences[director] > 0.5
      );
      const favoriteActors = this.getMovieActors(movie).filter(actor => 
        userProfile.actorPreferences[actor] > 0.5
      );
      
      if (favoriteDirectors.length > 0) {
        reasoning.push(`Directed by ${favoriteDirectors[0]} (your favorite)`);
      } else if (favoriteActors.length > 0) {
        reasoning.push(`Stars ${favoriteActors[0]} (you love their work)`);
      }
    }

    // Calculate confidence based on data quality and user profile strength
    const confidence = this.calculateConfidence(movie, userProfile, breakdown);

    return {
      movie,
      score: Math.max(0, Math.min(1, totalScore)),
      confidence,
      reasoning: reasoning.slice(0, 2), // Limit to top 2 reasons
      breakdown
    };
  }

  private calculateGenreScore(movie: OMDBMovieDetails, genrePrefs: Record<string, number>): number {
    const movieGenres = this.getMovieGenres(movie);
    if (movieGenres.length === 0) return 0.1; // Low score for unknown genres

    let totalScore = 0;
    let genreCount = 0;

    movieGenres.forEach(genre => {
      const preference = genrePrefs[genre] || 0;
      
      if (preference > 0.7) {
        totalScore += 1.0; // High preference
      } else if (preference > 0.3) {
        totalScore += 0.7; // Medium preference
      } else if (preference > 0.1) {
        totalScore += 0.3; // Low preference
      } else {
        totalScore += 0.1; // Absent preference
      }
      genreCount++;
    });

    return genreCount > 0 ? totalScore / genreCount : 0.1;
  }

  private calculateEraScore(movie: OMDBMovieDetails, eraPrefs: Record<string, number>): number {
    if (movie.Year === 'N/A') return 0.5; // Neutral for unknown year
    
    const movieYear = parseInt(movie.Year);
    const decade = Math.floor(movieYear / 10) * 10;
    const era = `${decade}s`;
    
    const eraPreference = eraPrefs[era] || 0.2; // Default low preference for unknown eras
    
    // Special exception: Pre-1990 movies with IMDb >8.0 get era penalty waived
    if (movieYear < 1990 && movie.imdbRating !== 'N/A' && parseFloat(movie.imdbRating) > 8.0) {
      return Math.max(eraPreference, 0.8); // Boost classic high-quality films
    }
    
    return eraPreference;
  }

  private calculateQualityScore(movie: OMDBMovieDetails, ratingThreshold: number): number {
    if (movie.imdbRating === 'N/A') return 0.3; // Low score for unknown rating
    
    const movieRating = parseFloat(movie.imdbRating);
    if (isNaN(movieRating)) return 0.3;
    
    // Score based on how much it exceeds user's threshold
    if (movieRating >= ratingThreshold + 1) {
      return 1.0; // Significantly above threshold
    } else if (movieRating >= ratingThreshold) {
      return 0.8; // Meets threshold
    } else if (movieRating >= ratingThreshold - 0.5) {
      return 0.5; // Close to threshold
    } else {
      return 0.1; // Below threshold
    }
  }

  private calculateAvoidanceScore(movie: OMDBMovieDetails, notInterestedPattern: NotInterestedPattern): number {
    // Start with neutral score
    let score = 1.0;
    
    // Apply penalties based on rejection patterns
    const movieGenres = this.getMovieGenres(movie);
    movieGenres.forEach(genre => {
      const rejectionRate = notInterestedPattern.rejectedGenres[genre] || 0;
      if (rejectionRate > 0.5) {
        score -= 0.8; // Heavy penalty for frequently rejected genres
      } else if (rejectionRate > 0.2) {
        score -= 0.5; // Medium penalty
      }
    });

    const movieDirectors = this.getMovieDirectors(movie);
    movieDirectors.forEach(director => {
      const rejectionRate = notInterestedPattern.rejectedDirectors[director] || 0;
      if (rejectionRate > 0.3) {
        score -= 0.6; // Penalty for rejected directors
      }
    });

    const movieActors = this.getMovieActors(movie);
    movieActors.forEach(actor => {
      const rejectionRate = notInterestedPattern.rejectedActors[actor] || 0;
      if (rejectionRate > 0.3) {
        score -= 0.4; // Penalty for rejected actors
      }
    });

    return Math.max(0, Math.min(1, score));
  }

  private calculateTalentScore(movie: OMDBMovieDetails, userProfile: UserProfile): number {
    let score = 0;
    
    // Director boost
    const movieDirectors = this.getMovieDirectors(movie);
    movieDirectors.forEach(director => {
      const preference = userProfile.directorPreferences[director] || 0;
      score = Math.max(score, preference);
    });
    
    // Actor boost
    const movieActors = this.getMovieActors(movie);
    movieActors.forEach(actor => {
      const preference = userProfile.actorPreferences[actor] || 0;
      score = Math.max(score, preference * 0.7); // Actors weighted less than directors
    });
    
    return Math.min(score, 1.0);
  }

  private calculateConfidence(
    movie: OMDBMovieDetails, 
    userProfile: UserProfile, 
    breakdown: any
  ): number {
    let confidence = 0;
    
    // Data quality factors
    const hasGenre = movie.Genre !== 'N/A' ? 0.3 : 0;
    const hasRating = movie.imdbRating !== 'N/A' ? 0.3 : 0;
    const hasYear = movie.Year !== 'N/A' ? 0.2 : 0;
    
    // User profile strength
    const profileStrength = Math.min(userProfile.totalWatchlistSize / 20, 1) * 0.2;
    
    confidence = hasGenre + hasRating + hasYear + profileStrength;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private getMovieGenres(movie: OMDBMovieDetails): string[] {
    if (movie.Genre === 'N/A' || !movie.Genre) return [];
    return movie.Genre.split(', ').map(g => g.trim());
  }

  private getMovieDirectors(movie: OMDBMovieDetails): string[] {
    if (movie.Director === 'N/A' || !movie.Director) return [];
    return movie.Director.split(', ').map(d => d.trim());
  }

  private getMovieActors(movie: OMDBMovieDetails): string[] {
    if (movie.Actors === 'N/A' || !movie.Actors) return [];
    return movie.Actors.split(', ').slice(0, 3).map(a => a.trim()); // Top 3 actors only
  }
}