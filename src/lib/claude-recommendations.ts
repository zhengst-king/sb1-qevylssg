const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1/messages';

export interface Recommendation {
  title: string;
  reason: string;
  imdbID?: string;
}

export interface AIRecommendations {
  movies: Recommendation[];
  tv_series: Recommendation[];
}

interface UserWatchlistData {
  movies: Array<{
    title: string;
    user_rating?: number;
    status: string;
    date_watched?: string;
    imdb_id?: string;
  }>;
  tv_series: Array<{
    title: string;
    user_rating?: number;
    status: string;
    date_watched?: string;
    imdb_id?: string;
  }>;
}

class ClaudeRecommendationsApi {
  private apiKey: string;
  private cache: Map<string, { data: AIRecommendations; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 2000; // 2 seconds between requests
  private readonly MAX_RETRIES = 3;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getCacheKey(watchlistData: UserWatchlistData): string {
    return JSON.stringify(watchlistData);
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const waitTime = this.REQUEST_DELAY - timeSinceLastRequest;
      console.log(`[Claude] Throttling request, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Anthropic Claude API key is not configured' };
    }

    try {
      const response = await fetch(CLAUDE_BASE_URL, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [
            { role: 'user', content: 'Test connection' }
          ]
        })
      });

      if (response.ok) {
        return { success: true };
      } else if (response.status === 401) {
        return { success: false, error: 'Invalid API key' };
      } else if (response.status === 403) {
        return { success: false, error: 'API access denied' };
      } else {
        return { success: false, error: `API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  private formatWatchlistText(items: UserWatchlistData['movies'] | UserWatchlistData['tv_series']): string {
    return items
      .filter(item => item.user_rating && item.user_rating > 0)
      .map(item => {
        const imdbPart = item.imdb_id ? ` (${item.imdb_id})` : '';
        const ratingPart = item.user_rating ? `: ${item.user_rating}` : '';
        return `• ${item.title}${imdbPart}${ratingPart}`;
      })
      .join('\n');
  }

  async getRecommendations(watchlistData: UserWatchlistData): Promise<AIRecommendations> {
    console.log('[Claude] Starting recommendation request with data:', {
      movieCount: watchlistData.movies.length,
      tvSeriesCount: watchlistData.tv_series.length,
      totalItems: watchlistData.movies.length + watchlistData.tv_series.length
    });

    // Check cache first
    const cacheKey = this.getCacheKey(watchlistData);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValidCache(cached.timestamp)) {
      console.log('[Claude] Using cached recommendations');
      return cached.data;
    }

    if (!this.apiKey) {
      throw new Error('Anthropic Claude API key is not configured');
    }

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[Claude] Attempt ${attempt}/${this.MAX_RETRIES}`);
        
        // Throttle requests
        await this.throttleRequest();
        
        const result = await this.makeRecommendationRequest(watchlistData);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        console.log('[Claude] Successfully got recommendations');
        return result;
      } catch (error) {
        lastError = error as Error;
        console.log(`[Claude] Attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[Claude] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('Failed to get recommendations after retries');
  }

  private async makeRecommendationRequest(watchlistData: UserWatchlistData): Promise<AIRecommendations> {
    const watchedMoviesText = this.formatWatchlistText(watchlistData.movies);
    const watchedSeriesText = this.formatWatchlistText(watchlistData.tv_series);

    const userContent = `Based on these watched titles and ratings, suggest two ranked lists—Top 10 Movies and Top 10 TV Series—they haven't watched. Return JSON arrays of objects with fields: title, imdbID, reason.

Watched Movies:
${watchedMoviesText}

Watched TV Series:
${watchedSeriesText}

Please respond with a JSON object containing "movies" and "tv_series" arrays.`;

    const response = await fetch(CLAUDE_BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          { 
            role: 'system', 
            content: 'You are a film and television recommendation engine. Always respond with valid JSON containing movies and tv_series arrays.' 
          },
          { 
            role: 'user', 
            content: userContent 
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Anthropic Claude API key. Please check your configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 500) {
        throw new Error('Anthropic Claude service is temporarily unavailable. Please try again later.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Claude API error:', response.status, errorData);
        throw new Error(`Anthropic Claude API error: ${response.status}. ${errorData.error?.message || 'Please try again.'}`);
      }
    }

    const data = await response.json();
    console.log('[Claude] API response received:', data);
    
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('No recommendations received from AI service');
    }

    let recommendations: AIRecommendations;
    try {
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      recommendations = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      throw new Error('Invalid response format from AI service');
    }

    // Validate the response structure
    if (!recommendations.movies || !recommendations.tv_series) {
      throw new Error('Invalid recommendation format received');
    }

    // Ensure we have arrays
    if (!Array.isArray(recommendations.movies)) {
      recommendations.movies = [];
    }
    if (!Array.isArray(recommendations.tv_series)) {
      recommendations.tv_series = [];
    }

    return recommendations;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const claudeRecommendationsApi = CLAUDE_API_KEY ? new ClaudeRecommendationsApi(CLAUDE_API_KEY) : new ClaudeRecommendationsApi('');