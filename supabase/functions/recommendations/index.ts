const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

interface Recommendation {
  title: string;
  reason: string;
  imdbID?: string;
}

interface AIRecommendations {
  movies: Recommendation[];
  tv_series: Recommendation[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Step 1: Validate environment variables
  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
  const claudeEndpoint = Deno.env.get('CLAUDE_ENDPOINT') || 'https://api.anthropic.com/v1/messages';
  
  console.log('[Recommendations] Environment check:', {
    hasApiKey: !!(claudeApiKey && claudeApiKey.trim()),
    apiKeyPrefix: claudeApiKey ? claudeApiKey.substring(0, 10) + '...' : 'missing',
    endpoint: claudeEndpoint
  });

  if (!claudeApiKey || claudeApiKey.trim() === '') {
    console.error('[Recommendations] Claude API key not configured');
    return new Response(
      JSON.stringify({ 
        error: 'Claude API key not configured',
        details: 'Please set CLAUDE_API_KEY environment variable in Supabase Edge Functions'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }

  try {
    // Step 2: Parse request body
    const { watchlistData }: { watchlistData: UserWatchlistData } = await req.json();
    
    console.log('[Recommendations] Received request with data:', {
      movieCount: watchlistData.movies.length,
      tvSeriesCount: watchlistData.tv_series.length
    });

    // Step 3: Format watchlist text for Claude
    const formatWatchlistText = (items: UserWatchlistData['movies'] | UserWatchlistData['tv_series']): string => {
      return items
        .filter(item => item.user_rating && item.user_rating > 0)
        .map(item => {
          const imdbPart = item.imdb_id ? ` (${item.imdb_id})` : '';
          const ratingPart = item.user_rating ? `: ${item.user_rating}` : '';
          return `• ${item.title}${imdbPart}${ratingPart}`;
        })
        .join('\n');
    };

    const watchedMoviesText = formatWatchlistText(watchlistData.movies);
    const watchedSeriesText = formatWatchlistText(watchlistData.tv_series);

    const userContent = `Based on these watched titles and ratings, suggest two ranked lists—Top 10 Movies and Top 10 TV Series—they haven't watched. Return JSON arrays of objects with fields: title, imdbID, reason.

Watched Movies:
${watchedMoviesText}

Watched TV Series:
${watchedSeriesText}

Please respond with a JSON object containing "movies" and "tv_series" arrays.`;

    // Step 4: Call Claude API with proper error handling
    console.log('[Recommendations] Calling Claude API...');
    
    const response = await fetch(claudeEndpoint, {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'User-Agent': 'Supabase-Edge-Function/1.0'
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

    console.log('[Recommendations] Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Recommendations] Claude API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      let errorMessage = 'Claude API request failed';
      let details = `Status: ${response.status}`;

      if (response.status === 401) {
        errorMessage = 'Invalid Claude API key';
        details = 'Please check your CLAUDE_API_KEY configuration';
      } else if (response.status === 429) {
        errorMessage = 'Claude API rate limit exceeded';
        details = 'Please try again in a moment';
      } else if (response.status === 500) {
        errorMessage = 'Claude API service error';
        details = 'Claude service is temporarily unavailable';
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: details,
          claudeError: errorText
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        },
      );
    }

    // Step 5: Parse Claude response
    const data = await response.json();
    console.log('[Recommendations] Claude API response received successfully');
    
    const content = data.content?.[0]?.text;
    if (!content) {
      console.error('[Recommendations] No content in Claude response:', data);
      throw new Error('No recommendations received from Claude API');
    }

    let recommendations: AIRecommendations;
    try {
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      recommendations = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[Recommendations] Failed to parse Claude response:', {
        content: content.substring(0, 500) + '...',
        parseError: parseError.message
      });
      throw new Error('Invalid response format from Claude API');
    }

    // Step 6: Validate response structure
    if (!recommendations.movies || !recommendations.tv_series) {
      console.error('[Recommendations] Invalid recommendation format:', recommendations);
      throw new Error('Invalid recommendation format received from Claude');
    }

    // Ensure we have arrays
    if (!Array.isArray(recommendations.movies)) {
      recommendations.movies = [];
    }
    if (!Array.isArray(recommendations.tv_series)) {
      recommendations.tv_series = [];
    }

    console.log('[Recommendations] Successfully processed recommendations:', {
      movieCount: recommendations.movies.length,
      tvSeriesCount: recommendations.tv_series.length
    });

    return new Response(
      JSON.stringify(recommendations),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );

  } catch (error) {
    console.error('[Recommendations] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get recommendations',
        details: error.message,
        type: 'server_error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});