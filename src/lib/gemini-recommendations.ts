const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
  }>;
  tv_series: Array<{
    title: string;
    user_rating?: number;
    status: string;
    date_watched?: string;
  }>;
}

class GeminiRecommendationsApi {
  private apiKey: string;
  private selectedModel: string | null = null;
  private cache: Map<string, { data: AIRecommendations; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 1000; // 1 second between requests
  private readonly MAX_RETRIES = 3;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.discoverModels();
  }

  private async discoverModels(): Promise<void> {
    if (!this.apiKey) return;
    
    try {
      console.log('[Gemini] Discovering available models...');
      const response = await fetch(`${GEMINI_MODELS_URL}?key=${this.apiKey}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Gemini] Available models:', data);
        
        // Look for gemini-2.5-flash or similar models that support generateContent
        const supportedModels = data.models?.filter((model: any) => 
          model.supportedGenerationMethods?.includes('generateContent') &&
          (model.name.includes('gemini-2.5-flash') || 
           model.name.includes('gemini-1.5-flash') ||
           model.name.includes('gemini-pro'))
        );
        
        if (supportedModels && supportedModels.length > 0) {
          // Prefer gemini-2.5-flash, then gemini-1.5-flash, then gemini-pro
          const preferredModel = supportedModels.find((m: any) => m.name.includes('gemini-2.5-flash')) ||
                                supportedModels.find((m: any) => m.name.includes('gemini-1.5-flash')) ||
                                supportedModels[0];
          
          this.selectedModel = preferredModel.name;
          console.log('[Gemini] Selected model:', this.selectedModel);
        } else {
          console.warn('[Gemini] No supported models found, using fallback');
          this.selectedModel = 'models/gemini-1.5-flash-latest';
        }
      } else {
        console.warn('[Gemini] Model discovery failed, using fallback model');
        this.selectedModel = 'models/gemini-1.5-flash-latest';
      }
    } catch (error) {
      console.warn('[Gemini] Model discovery error, using fallback:', error);
      this.selectedModel = 'models/gemini-1.5-flash-latest';
    }
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
      console.log(`[Gemini] Throttling request, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Google Gemini API key is not configured' };
    }

    // Ensure we have a model selected
    if (!this.selectedModel) {
      await this.discoverModels();
    }

    try {
      const testModel = this.selectedModel || 'models/gemini-1.5-flash-latest';
      const response = await fetch(`${GEMINI_BASE_URL}/${testModel}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test connection'
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        })
      });

      if (response.ok) {
        return { success: true };
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.message?.includes('API_KEY_INVALID')) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: false, error: 'Invalid request format' };
      } else if (response.status === 403) {
        return { success: false, error: 'API access denied' };
      } else {
        return { success: false, error: `API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async getRecommendations(watchlistData: UserWatchlistData): Promise<AIRecommendations> {
    console.log('[Gemini] Starting recommendation request with data:', {
      movieCount: watchlistData.movies.length,
      tvSeriesCount: watchlistData.tv_series.length,
      totalItems: watchlistData.movies.length + watchlistData.tv_series.length
    });

    // Check cache first
    const cacheKey = this.getCacheKey(watchlistData);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValidCache(cached.timestamp)) {
      console.log('[Gemini] Using cached recommendations');
      return cached.data;
    }

    if (!this.apiKey) {
      throw new Error('Google Gemini API key is not configured');
    }

    // Ensure we have a model selected
    if (!this.selectedModel) {
      await this.discoverModels();
    }

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[Gemini] Attempt ${attempt}/${this.MAX_RETRIES}`);
        
        // Throttle requests
        await this.throttleRequest();
        
        const result = await this.makeRecommendationRequest(watchlistData);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        console.log('[Gemini] Successfully got recommendations');
        return result;
      } catch (error) {
        lastError = error as Error;
        console.log(`[Gemini] Attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[Gemini] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('Failed to get recommendations after retries');
  }

  private async makeRecommendationRequest(watchlistData: UserWatchlistData): Promise<AIRecommendations> {
    const prompt = `You are a film and television recommendation engine. Based on a user's existing watchlists and ratings, suggest two lists: Top 10 Movies and Top 10 TV Series. 

User's current watchlist data:
${JSON.stringify(watchlistData, null, 2)}

Please exclude any titles already in their lists. Respond with a JSON object containing two arrays: "movies" and "tv_series". Each item should have:
- "title": The movie/series title
- "reason": 1-2 sentences explaining why this is recommended based on their preferences
- "imdbID": The IMDb ID if known (optional)

Focus on titles that match their viewing preferences based on ratings and genres they've enjoyed.`;

    const model = this.selectedModel || 'models/gemini-1.5-flash-latest';
    const response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 2048,
          candidateCount: 1
        }
      })
    });

    if (!response.ok) {
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.message?.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Google Gemini API key. Please check your configuration.');
        }
        throw new Error('Invalid request format. Please try again.');
      } else if (response.status === 403) {
        throw new Error('API access denied. Please verify your Google Gemini API key permissions.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded (60 requests/minute). Please try again in a moment.');
      } else if (response.status === 500) {
        throw new Error('Google Gemini service is temporarily unavailable. Please try again later.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', response.status, errorData);
        throw new Error(`Google Gemini API error: ${response.status}. ${errorData.error?.message || 'Please try again.'}`);
      }
    }

    const data = await response.json();
    console.log('[Gemini] API response received:', data);
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No recommendations received from AI service');
    }

    let recommendations: AIRecommendations;
    try {
      // Extract JSON from the response (Gemini might wrap it in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      recommendations = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content);
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

export const geminiRecommendationsApi = GEMINI_API_KEY ? new GeminiRecommendationsApi(GEMINI_API_KEY) : new GeminiRecommendationsApi('');