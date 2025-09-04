import { UserPreferenceProfile, MovieFeatures } from './FeatureExtractor';
import { Movie } from '../lib/supabase';

export interface MLPrediction {
  score: number;
  confidence: number;
  reasoning: string[];
}

export class LocalMLModel {
  private isInitialized = false;
  private modelWeights: number[] = [];
  private readonly FEATURE_COUNT = 50; // Approximate feature vector size

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[LocalMLModel] Initializing lightweight ML model...');
    
    // Initialize with random weights (in production, these would be pre-trained)
    this.modelWeights = Array.from({ length: this.FEATURE_COUNT }, () => Math.random() * 0.1 - 0.05);
    
    this.isInitialized = true;
    console.log('[LocalMLModel] Model initialized with', this.FEATURE_COUNT, 'features');
  }

  async predict(movieFeatures: number[], userProfile: UserPreferenceProfile): Promise<MLPrediction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Simple linear model prediction
    let score = 0;
    const reasoning: string[] = [];

    // Genre-based scoring (primary factor)
    let genreScore = 0;
    let genreMatches = 0;
    
    // Assuming first 22 features are genres
    for (let i = 0; i < 22 && i < movieFeatures.length; i++) {
      if (movieFeatures[i] === 1) { // Movie has this genre
        const genreName = this.getGenreNameByIndex(i);
        const userWeight = userProfile.genreWeights[genreName] || 0;
        genreScore += userWeight;
        
        if (userWeight > 0.3) {
          genreMatches++;
          reasoning.push(`Matches your interest in ${genreName} (${(userWeight * 100).toFixed(0)}% preference)`);
        }
      }
    }

    // Year-based scoring
    const yearFeature = movieFeatures[22] || 0.5;
    const movieYear = Math.round(yearFeature * (new Date().getFullYear() - 1900) + 1900);
    let yearScore = 0;
    
    if (movieYear >= 2020) {
      yearScore = userProfile.yearPreferences.recent;
      if (yearScore > 0.4) reasoning.push(`From your preferred era (2020s)`);
    } else if (movieYear >= 2010) {
      yearScore = userProfile.yearPreferences.modern;
      if (yearScore > 0.4) reasoning.push(`From your preferred era (2010s)`);
    } else {
      yearScore = userProfile.yearPreferences.classic;
      if (yearScore > 0.4) reasoning.push(`Classic film matching your taste`);
    }

    // Rating-based scoring
    const movieRating = (movieFeatures[23] || 0.5) * 10;
    const ratingDiff = Math.abs(movieRating - userProfile.ratingThreshold);
    const ratingScore = Math.max(0, 1 - (ratingDiff / 5));
    
    if (ratingScore > 0.7) {
      reasoning.push(`High rating (${movieRating.toFixed(1)}) matches your standards`);
    }

    // Combine scores
    score = (genreScore * 0.4) + (yearScore * 0.2) + (ratingScore * 0.25) + (0.15); // Base score

    // Calculate confidence based on data quality
    const confidence = Math.min(
      (genreMatches / 3) * 0.4 + // Genre match confidence
      (ratingScore) * 0.3 + // Rating confidence
      (yearScore) * 0.3, // Year confidence
      1.0
    );

    return {
      score: Math.max(0, Math.min(score, 1)),
      confidence,
      reasoning: reasoning.slice(0, 2) // Limit to top 2 reasons
    };
  }

  async retrain(userFeedback: Array<{ movie: Movie; liked: boolean }>): Promise<void> {
    console.log('[LocalMLModel] Retraining with', userFeedback.length, 'feedback items');
    
    // Simple online learning update (in production, this would be more sophisticated)
    userFeedback.forEach(feedback => {
      const adjustment = feedback.liked ? 0.01 : -0.01;
      
      // Adjust weights based on feedback (simplified)
      for (let i = 0; i < this.modelWeights.length; i++) {
        this.modelWeights[i] += adjustment * Math.random() * 0.1;
      }
    });

    console.log('[LocalMLModel] Model retrained successfully');
  }

  private getGenreNameByIndex(index: number): string {
    const genres = [
      'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
      'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History', 'Horror', 'Music',
      'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
    ];
    return genres[index] || 'Unknown';
  }

  getModelInfo(): { initialized: boolean; featureCount: number; version: string } {
    return {
      initialized: this.isInitialized,
      featureCount: this.FEATURE_COUNT,
      version: '1.0.0'
    };
  }
}