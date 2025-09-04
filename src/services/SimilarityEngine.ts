interface SimilarityStrategy {
  type: 'director' | 'actor' | 'genre' | 'franchise';
  searchQuery: string;
  confidence: number;
  reason: string;
}

interface SimilarMovie {
  imdbID: string;
  title: string;
  year: number;
  genre: string;
  imdbRating: string;
  poster: string;
  director: string;
  actors: string;
  plot: string;
  similarityReason: string;
  confidence: number;
}

class SimilarityDetector {
  createSimilarityStrategies(movie: any): SimilarityStrategy[] {
    const strategies: SimilarityStrategy[] = [];
    
    // Strategy 1: Same Director
    if (movie.director && movie.director !== 'N/A') {
      strategies.push({
        type: 'director',
        searchQuery: movie.director,
        confidence: 0.9,
        reason: `Same director: ${movie.director}`
      });
    }
    
    // Strategy 2: Main Actors (first 2 actors)
    if (movie.actors && movie.actors !== 'N/A') {
      const actors = movie.actors.split(',').slice(0, 2);
      actors.forEach(actor => {
        const actorName = actor.trim();
        if (actorName) {
          strategies.push({
            type: 'actor',
            searchQuery: actorName,
            confidence: 0.7,
            reason: `Features ${actorName}`
          });
        }
      });
    }
    
    // Strategy 3: Primary Genre + Era
    if (movie.genre && movie.genre !== 'N/A') {
      const primaryGenre = movie.genre.split(',')[0].trim();
      const decade = Math.floor(movie.year / 10) * 10;
      strategies.push({
        type: 'genre',
        searchQuery: `${primaryGenre} ${decade}s`,
        confidence: 0.6,
        reason: `Similar ${primaryGenre} from ${decade}s`
      });
    }
    
    // Strategy 4: Franchise Detection
    const franchiseName = this.extractFranchiseName(movie.title);
    if (franchiseName) {
      strategies.push({
        type: 'franchise',
        searchQuery: franchiseName,
        confidence: 0.8,
        reason: `Part of ${franchiseName} franchise`
      });
    }
    
    return strategies;
  }
  
  private extractFranchiseName(title: string): string | null {
    // Remove sequel indicators
    const cleanTitle = title
      .replace(/\s*\d+$/, '') // Remove trailing numbers
      .replace(/:\s*.+$/, '') // Remove subtitle after colon
      .replace(/\s*-\s*.+$/, '') // Remove subtitle after dash
      .replace(/\s*(II|III|IV|V)$/, '') // Remove roman numerals
      .replace(/\s*(Part\s*\d+)$/i, '') // Remove "Part X"
      .trim();
    
    // Only consider as franchise if significantly different from original
    return cleanTitle.length < title.length - 2 ? cleanTitle : null;
  }
}

class OMDbSimilaritySearcher {
  private apiKey = 'b9fe3880'; // Use the same API key as omdb.ts
  private baseUrl = 'https://www.omdbapi.com/';
  
  async findSimilarMovies(sourceMovie: any): Promise<SimilarMovie[]> {
    console.log('=== SIMILARITY SEARCH DEBUG ===');
    console.log('Source movie:', sourceMovie);
    console.log('API Key available:', !!this.apiKey);
    
    const detector = new SimilarityDetector();
    const strategies = detector.createSimilarityStrategies(sourceMovie);
    
    console.log('Generated strategies:', strategies);
    
    const allResults: SimilarMovie[] = [];
    
    for (const strategy of strategies) {
      try {
        console.log(`Executing strategy: ${strategy.type} - "${strategy.searchQuery}"`);
        const similar = await this.searchByStrategy(strategy, sourceMovie.imdbID);
        console.log(`Strategy "${strategy.type}" found ${similar.length} movies:`, similar.map(m => m.title));
        allResults.push(...similar);
      } catch (error) {
        console.error(`Strategy "${strategy.type}" failed:`, error);
      }
    }
    
    const final = this.deduplicateAndRank(allResults);
    console.log(`Final result: ${final.length} similar movies`);
    console.log('=== END DEBUG ===');
    
    return final;
  }
  
  private async searchByStrategy(strategy: SimilarityStrategy, sourceImdbId: string): Promise<SimilarMovie[]> {
    // Simplified search - try different approaches
    let searchUrl;
    
    if (strategy.type === 'director' || strategy.type === 'actor') {
      // Search by person name
      searchUrl = `${this.baseUrl}?apikey=${this.apiKey}&s=${encodeURIComponent(strategy.searchQuery)}&type=movie`;
    } else if (strategy.type === 'genre') {
      // Search by primary genre only
      const primaryGenre = strategy.searchQuery.split(' ')[0]; // Just "Action" not "Action 2010s"
      searchUrl = `${this.baseUrl}?apikey=${this.apiKey}&s=${encodeURIComponent(primaryGenre)}&type=movie`;
    } else {
      // Franchise search
      searchUrl = `${this.baseUrl}?apikey=${this.apiKey}&s=${encodeURIComponent(strategy.searchQuery)}&type=movie`;
    }
    
    console.log('Search URL:', searchUrl);
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    console.log('OMDb Response:', data);
    
    if (data.Response !== "True") {
      console.log('Search failed:', data.Error || 'Unknown error');
      return [];
    }
    
    if (!data.Search || data.Search.length === 0) {
      console.log('No search results found');
      return [];
    }
    
    console.log(`Found ${data.Search.length} initial results`);
    
    // Get detailed info for top 3 results (reduced from 5)
    const detailPromises = data.Search.slice(0, 3).map(movie => 
      this.getDetailedMovieInfo(movie.imdbID)
    );
    
    const detailedMovies = await Promise.all(detailPromises);
    
    const validMovies = detailedMovies
      .filter(movie => movie !== null && movie.imdbID !== sourceImdbId)
      .map(movie => ({
        ...movie,
        similarityReason: strategy.reason,
        confidence: strategy.confidence
      }));
      
    console.log(`Valid movies after filtering: ${validMovies.length}`);
    
    return validMovies;
  }
  
  private async getDetailedMovieInfo(imdbId: string): Promise<any> {
    try {
      const detailUrl = `${this.baseUrl}?apikey=${this.apiKey}&i=${imdbId}&plot=short`;
      console.log('Fetching details for:', imdbId);
      const response = await fetch(detailUrl);
      const data = await response.json();
      
      if (data.Response !== "True") {
        console.log('Failed to get details for', imdbId, ':', data.Error);
        return null;
      }
      
      return data.Response === "True" ? data : null;
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return null;
    }
  }
  
  private deduplicateAndRank(results: SimilarMovie[]): SimilarMovie[] {
    // Remove duplicates by imdbID
    const unique = results.reduce((acc, movie) => {
      if (!acc.find(m => m.imdbID === movie.imdbID)) {
        acc.push(movie);
      }
      return acc;
    }, [] as SimilarMovie[]);
    
    // STRICTER quality filtering to match user's high standards
    const filtered = unique.filter(movie => {
      if (movie.imdbRating === 'N/A') return false;
      if (parseFloat(movie.imdbRating) < 7.5) return false; // Increased from 5.0 to 7.5
      if (movie.genre?.toLowerCase().includes('short')) return false;
      if (movie.genre?.toLowerCase().includes('documentary')) return false;
      return true;
    });
    
    console.log(`Quality filter: ${unique.length} -> ${filtered.length} movies (removed ${unique.length - filtered.length} low-rated)`);
    
    // Sort by rating first, then confidence
    return filtered
      .sort((a, b) => {
        const ratingA = parseFloat(a.imdbRating) || 0;
        const ratingB = parseFloat(b.imdbRating) || 0;
        if (ratingA !== ratingB) return ratingB - ratingA; // Higher rating first
        return b.confidence - a.confidence; // Then by confidence
      })
      .slice(0, 15); // Return top 15 recommendations
  }
}

// Export for use in other components
export { SimilarityDetector, OMDbSimilaritySearcher, type SimilarMovie };