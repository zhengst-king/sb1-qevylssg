const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

class GeminiApi {
  private apiKey: string;
  private cache: Map<string, string> = new Map();
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset counter every minute
    if (now - this.lastResetTime > oneMinute) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Check if we've exceeded 60 requests per minute
    if (this.requestCount >= 60) {
      return false;
    }
    
    this.requestCount++;
    return true;
  }

  async polishReview(reviewText: string): Promise<string> {
    // Check cache first
    const cacheKey = this.hashString(reviewText);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.apiKey) {
      throw new Error('Google Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded (60 requests/minute). Please wait a moment before trying again.');
    }

    const prompt = `Please improve and polish this movie review while keeping the original meaning and personal voice. Make it more engaging and well-structured: ${reviewText}`;

    try {
      const response = await fetch(`${GEMINI_BASE_URL}?key=${this.apiKey}`, {
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
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
            stopSequences: []
          }
        })
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Gemini API 400 error:', errorData);
          if (errorData.error?.message?.includes('API_KEY_INVALID') || errorData.error?.message?.includes('invalid')) {
            throw new Error('Invalid Google Gemini API key. Please check your VITE_GEMINI_API_KEY.');
          }
          throw new Error('Invalid request. Please check your review text and try again.');
        } else if (response.status === 404) {
          throw new Error('Gemini API endpoint not found. Please verify the API is enabled in your Google Cloud project.');
        } else if (response.status === 403) {
          throw new Error('API access denied. Please verify your Google Gemini API key has the correct permissions.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Gemini API error:', response.status, errorText);
          throw new Error(`Google Gemini API error: ${response.status}. Please check your API key and try again.`);
        }
      }

      const data: GeminiResponse = await response.json();
      console.log('Gemini API response:', data);
      const polishedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!polishedText) {
        throw new Error('No response received from AI service. Please try again.');
      }

      // Cache the result
      this.cache.set(cacheKey, polishedText);
      
      return polishedText;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to AI service. Please check your internet connection and try again.');
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

export const geminiApi = new GeminiApi(GEMINI_API_KEY);