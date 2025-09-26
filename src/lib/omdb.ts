// src/lib/omdb.ts - Enhanced version with proper episode support
const OMDB_API_KEY = 'b9fe3880';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

export interface OMDBSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export interface OMDBSearchResponse {
  Search: OMDBSearchResult[];
  totalResults: string;
  Response: string;
  Error?: string;
}

export interface OMDBMovieDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  Error?: string;
  // Episode specific fields
  Season?: string;
  Episode?: string;
  seriesID?: string;
}

// Enhanced Episode interface
export interface OMDBEpisodeDetails {
  season: number;
  episode: number;
  imdbID?: string;
  title?: string;
  plot?: string;
  released?: string;
  runtime?: string;
  imdbRating?: string;
  poster?: string;
  director?: string;
  writer?: string;
  actors?: string;
  seriesID: string;
}

class OMDBApi {
  private apiKey: string;
  private lastRequestTime: number = 0;
  private readonly REQUEST_DELAY = 200; // 200ms between requests for paid tier
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly DAILY_LIMIT = 100000; // Much higher limit for paid tier
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.loadRequestCount();
  }

  private loadRequestCount(): void {
    try {
      const stored = localStorage.getItem('omdb_request_count');
      const storedTime = localStorage.getItem('omdb_last_reset');
      
      if (stored && storedTime) {
        const lastReset = parseInt(storedTime);
        const now = Date.now();
        
        // Reset daily counter if more than 24 hours have passed
        if (now - lastReset > 24 * 60 * 60 * 1000) {
          this.requestCount = 0;
          this.lastResetTime = now;
          this.saveRequestCount();
        } else {
          this.requestCount = parseInt(stored);
          this.lastResetTime = lastReset;
        }
      }
    } catch (error) {
      console.warn('[OMDb] Failed to load request count from localStorage:', error);
    }
  }

  private saveRequestCount(): void {
    try {
      localStorage.setItem('omdb_request_count', this.requestCount.toString());
      localStorage.setItem('omdb_last_reset', this.lastResetTime.toString());
    } catch (error) {
      console.warn('[OMDb] Failed to save request count to localStorage:', error);
    }
  }

  private checkDailyLimit(): boolean {
    return this.requestCount < this.DAILY_LIMIT;
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

  private getCacheKey(type: string, params: Record<string, string>): string {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, string>);
    return `${type}_${JSON.stringify(sortedParams)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[OMDb] Cache hit for:', key);
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[OMDb] Attempt ${attempt + 1}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`[OMDb] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  private getFallbackRecommendations(): OMDBSearchResponse {
    console.log('[OMDb] Returning fallback empty results');
    return {
      Search: [],
      totalResults: '0',
      Response: 'True'
    };
  }

  async searchMovies(query: string, page = 1): Promise<OMDBSearchResponse> {
    // Check daily limit first
    if (!this.checkDailyLimit()) {
      console.warn('[OMDb] Daily request limit reached (paid tier), returning fallback');
      return this.getFallbackRecommendations();
    }

    // Check cache first
    const cacheKey = this.getCacheKey('search', { s: query, page: page.toString() });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.throttleRequest();
    
    return this.retryWithBackoff(async () => {
      try {
        const url = `${OMDB_BASE_URL}?apikey=${this.apiKey}&s=${encodeURIComponent(query)}&page=${page}`;
        console.log('[OMDb] Making search request:', query);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[OMDb] API error response:', errorText);
          
          // Parse error response
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.Error === 'Request limit reached!') {
              console.warn('[OMDb] Rate limit reached, returning fallback');
              return this.getFallbackRecommendations();
            }
          } catch (parseError) {
            // Continue with original error
          }
          
          throw new Error(`OMDb API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Check for API-level errors
        if (data.Response === 'False') {
          if (data.Error === 'Request limit reached!') {
            console.warn('[OMDb] Rate limit reached in response, returning fallback');
            return this.getFallbackRecommendations();
          }
          
          // Return empty results for "not found" cases
          console.log('[OMDb] No results found for search:', query, '- Error:', data.Error);
          return {
            Search: [],
            totalResults: '0',
            Response: 'True'
          };
        }

        // Increment counter and cache result
        this.requestCount++;
        this.saveRequestCount();
        this.setCache(cacheKey, data);
        
        console.log(`[OMDb] Search successful. Requests used: ${this.requestCount}/${this.DAILY_LIMIT}`);
        return data;
        
      } catch (error) {
        console.error('[OMDb] Search error:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error: Please check your internet connection and try again');
        }
        throw error;
      }
    });
  }

  async getMovieDetails(imdbId: string, episodeParams?: { Season: string; Episode: string }): Promise<OMDBMovieDetails> {
    // Check daily limit first
    if (!this.checkDailyLimit()) {
      console.warn('[OMDb] Daily request limit reached (paid tier), cannot get movie details');
      throw new Error('Daily API limit reached (paid tier). Please contact support.');
    }

    // Build cache key including episode params
    const params: Record<string, string> = { i: imdbId };
    if (episodeParams) {
      params.Season = episodeParams.Season;
      params.Episode = episodeParams.Episode;
    }

    const cacheKey = this.getCacheKey('details', params);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.throttleRequest();
    
    return this.retryWithBackoff(async () => {
      try {
        let url = `${OMDB_BASE_URL}?apikey=${this.apiKey}&i=${imdbId}&plot=full`;
        
        // Add episode parameters if provided
        if (episodeParams) {
          url += `&Season=${episodeParams.Season}&Episode=${episodeParams.Episode}`;
          console.log('[OMDb] Making episode details request:', `${imdbId} S${episodeParams.Season}E${episodeParams.Episode}`);
        } else {
          console.log('[OMDb] Making details request:', imdbId);
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[OMDb] API error response:', errorText);
          
          // Parse error response
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.Error === 'Request limit reached!') {
              throw new Error('Daily API limit reached. Please try again tomorrow.');
            }
          } catch (parseError) {
            // Continue with original error
          }
          
          throw new Error(`OMDb API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Check for API-level errors
        if (data.Response === 'False') {
          if (data.Error === 'Request limit reached!') {
            throw new Error('Daily API limit reached. Please try again tomorrow.');
          }
          throw new Error(data.Error || 'Movie details not found');
        }

        // Increment counter and cache result
        this.requestCount++;
        this.saveRequestCount();
        this.setCache(cacheKey, data);
        
        console.log(`[OMDb] Details successful. Requests used: ${this.requestCount}/${this.DAILY_LIMIT}`);
        return data;
        
      } catch (error) {
        console.error('[OMDb] Details error:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error: Please check your internet connection and try again');
        }
        throw error;
      }
    });
  }

  // NEW: Dedicated method for fetching episode details
  async getEpisodeDetails(seriesImdbId: string, season: number, episode: number): Promise<OMDBEpisodeDetails | null> {
    try {
      const episodeData = await this.getMovieDetails(seriesImdbId, {
        Season: season.toString(),
        Episode: episode.toString()
      });

      // Convert OMDb response to our Episode format
      return {
        season,
        episode,
        seriesID: seriesImdbId,
        imdbID: episodeData.imdbID,
        title: episodeData.Title,
        plot: episodeData.Plot,
        released: episodeData.Released,
        runtime: episodeData.Runtime,
        imdbRating: episodeData.imdbRating,
        poster: episodeData.Poster !== 'N/A' ? episodeData.Poster : undefined,
        director: episodeData.Director,
        writer: episodeData.Writer,
        actors: episodeData.Actors,
      };
    } catch (error) {
      // Return null for episodes that don't exist, rather than throwing
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  // NEW: Batch episode fetching with smart discovery
  async discoverSeasonEpisodes(
    seriesImdbId: string, 
    season: number, 
    options: {
      maxEpisodes?: number;
      maxConsecutiveFailures?: number;
      onProgress?: (found: number, tried: number) => void;
    } = {}
  ): Promise<OMDBEpisodeDetails[]> {
    const {
      maxEpisodes = 30,
      maxConsecutiveFailures = 3,
      onProgress
    } = options;

    const foundEpisodes: OMDBEpisodeDetails[] = [];
    let consecutiveFailures = 0;

    console.log(`[OMDb] Starting episode discovery for Season ${season} (max ${maxEpisodes} episodes)`);

    for (let episodeNum = 1; episodeNum <= maxEpisodes; episodeNum++) {
      try {
        const episodeData = await this.getEpisodeDetails(seriesImdbId, season, episodeNum);
        
        if (episodeData) {
          foundEpisodes.push(episodeData);
          consecutiveFailures = 0; // Reset failure counter
          console.log(`[OMDb] ✓ Found S${season}E${episodeNum}: ${episodeData.title}`);
        } else {
          consecutiveFailures++;
          console.log(`[OMDb] ✗ S${season}E${episodeNum} not found (${consecutiveFailures}/${maxConsecutiveFailures})`);
          
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log(`[OMDb] Stopping discovery after ${consecutiveFailures} consecutive failures`);
            break;
          }
        }

        // Report progress
        if (onProgress) {
          onProgress(foundEpisodes.length, episodeNum);
        }

        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (error) {
        consecutiveFailures++;
        console.warn(`[OMDb] Error fetching S${season}E${episodeNum}:`, error);
        
        if (episodeNum === 1) {
          // If first episode fails, season likely doesn't exist
          throw new Error(`Season ${season} not found or no episodes available`);
        }

        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`[OMDb] Stopping discovery due to errors after ${consecutiveFailures} failures`);
          break;
        }
      }
    }

    console.log(`[OMDb] Episode discovery complete: Found ${foundEpisodes.length} episodes in Season ${season}`);
    return foundEpisodes;
  }

  getIMDbUrl(imdbId: string): string {
    return `https://www.imdb.com/title/${imdbId}/`;
  }

  getIMDbEpisodesUrl(imdbId: string): string {
    return `https://www.imdb.com/title/${imdbId}/episodes/`;
  }

  formatValue(value: string | undefined): string | null {
    if (!value || value === 'N/A' || value === 'undefined') {
      return null;
    }
    return value;
  }

  parseYear(yearString: string): number | null {
    if (!yearString || yearString === 'N/A') return null;
    const year = parseInt(yearString);
    return isNaN(year) ? null : year;
  }

  parseRating(ratingString: string): number | null {
    if (!ratingString || ratingString === 'N/A') return null;
    const rating = parseFloat(ratingString);
    return isNaN(rating) ? null : rating;
  }

  parseRuntime(runtimeString: string): number | null {
    if (!runtimeString || runtimeString === 'N/A') return null;
    const match = runtimeString.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  parseBoxOffice(boxOfficeString: string): number | null {
    if (!boxOfficeString || boxOfficeString === 'N/A') return null;
    const cleanValue = boxOfficeString.replace(/[$,]/g, '');
    const value = parseFloat(cleanValue);
    return isNaN(value) ? null : value;
  }

  // Get current usage stats
  getUsageStats(): { requestCount: number; dailyLimit: number; resetTime: number } {
    return {
      requestCount: this.requestCount,
      dailyLimit: this.DAILY_LIMIT,
      resetTime: this.lastResetTime + (24 * 60 * 60 * 1000)
    };
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.cache.clear();
    console.log('[OMDb] Cache cleared');
  }
}

export const omdbApi = new OMDBApi(OMDB_API_KEY);