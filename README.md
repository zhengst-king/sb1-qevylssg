# CineList - Movie Watchlist Application

A comprehensive movie watchlist application with AI-powered review enhancement.

## Features

- **Movie Search**: Search movies using The Movie Database (TMDb) API
- **Personal Watchlist**: Add movies to your personal watchlist with status tracking
- **AI-Powered Reviews**: Write and enhance movie reviews using AI
- **Advanced Filtering**: Filter movies by year, rating, genre, director, and more
- **Timestamp Tracking**: Track when movies were added, rated, or status changed
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration (Already configured)
VITE_SUPABASE_URL=https://ofzcqugxmlazjwbwikxb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9memNxdWd4bWxhemp3Yndpa3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTk1NDgsImV4cCI6MjA3MDIzNTU0OH0.UNd7LsEOQ-ilM5pD7MiIaEbhlHv_w3JSx77PZIUnUYs

# TMDb API Configuration (Already configured)
VITE_TMDB_API_KEY=a1c48dd97365677772288676568b781d

# Google Gemini API Configuration (Required for AI review enhancement)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Claude API Configuration (Required for AI recommendations)
# Note: This should be set in Supabase Edge Functions environment variables, not in .env
# CLAUDE_API_KEY=your_claude_api_key_here
```

### 2. Setting up Claude API for AI Recommendations

To enable AI-powered movie recommendations, you'll need to configure the Claude API key in your Supabase project:

1. **Get a Claude API Key**: Visit [Anthropic Console](https://console.anthropic.com) and create an API key
2. **Configure in Supabase**: 
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions → recommendations → Settings → Environment Variables
   - Add `CLAUDE_API_KEY` with your Anthropic Claude API key value
   - Save the configuration

### 3. Getting a Free Google Gemini API Key

To enable AI-powered review enhancement, you'll need a free Google Gemini API key:

1. **Visit Google AI Studio**: Go to [https://aistudio.google.com](https://aistudio.google.com)
2. **Sign In**: Use your Google account to sign in (no credit card required)
3. **Get API Key**: Click "Get API Key" in the top navigation
4. **Create New Key**: Click "Create API Key" and select a Google Cloud project (or create a new one)
5. **Copy the Key**: Copy the generated API key (starts with `AIza`)
6. **Add to .env**: Replace `your_gemini_api_key_here` in your `.env` file with the actual key

**Example:**
```env
VITE_GEMINI_API_KEY=AIzaSyC1234567890abcdef1234567890abcdef123
VITE_OPENAI_API_KEY=sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef
```

### 3. Google Gemini Free Tier

The free tier includes:
- **60 requests per minute**
- **1,500 requests per day**
- **1 million tokens per month**
- **No credit card required**

This is more than sufficient for personal use of the review enhancement feature and is completely free forever.

### 4. Getting an OpenAI API Key (Optional)

To enable AI-powered movie and TV series recommendations, you'll need an OpenAI API key:

1. **Visit OpenAI Platform**: Go to [https://platform.openai.com](https://platform.openai.com)
2. **Sign Up/Sign In**: Create an account or sign in with your existing account
3. **Add Payment Method**: OpenAI requires a payment method, but offers free credits for new users
4. **Create API Key**: Go to API Keys section and create a new secret key
5. **Copy the Key**: Copy the generated API key (starts with `sk-`)
6. **Add to .env**: Replace `your_openai_api_key_here` in your `.env` file with the actual key

**Note**: OpenAI API usage is pay-per-use, but the free credits should be sufficient for personal use.

### 5. Running the Application

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## AI Review Enhancement

The AI review feature uses Google's Gemini Pro model to:
- Improve grammar and structure
- Enhance readability while preserving your personal voice
- Make reviews more engaging and well-organized
- Maintain the original meaning and sentiment

**How to use:**
1. Click "Add Review" or "Edit Review" on any movie
2. Write your initial review (minimum 10 characters)
3. Click "Polish with AI" to enhance your review
4. Compare original vs. AI-enhanced versions
5. Choose to keep your original or use the AI version
6. Save your final review

## Troubleshooting

### AI Review Not Working
- Ensure your Google Gemini API key is correctly set in the `.env` file
- Check that the key starts with `AIza`
- Verify you haven't exceeded the free tier limits (60 requests/minute)
- Check browser console for specific error messages

### AI Recommendations Not Working
- Ensure your OpenAI API key is correctly set in the `.env` file
- Check that the key starts with `sk-`
- Verify you have sufficient OpenAI credits or haven't exceeded rate limits
- Check browser console for specific error messages

### Database Issues
- The application uses Supabase with pre-configured credentials
- All database migrations run automatically
- If you encounter database errors, check the browser console

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Movie Data**: The Movie Database (TMDb) API
- **AI Enhancement**: Google Gemini API (Gemini Pro model)
- **Build Tool**: Vite

## Features Overview

### Movie Search
- Real-time search using TMDb API
- Detailed movie information including cast, crew, and ratings
- High-quality movie posters and metadata

### Watchlist Management
- Three status categories: "To Watch", "Watching", "Watched"
- Personal rating system (1-10 scale)
- Date tracking for when movies were watched
- Automatic timestamp tracking for all changes

### Advanced Filtering
- Filter by year range, IMDb rating, genres, directors, cast, and countries
- Personal rating filters
- Status-based filtering
- Real-time filter application with localStorage persistence

### AI-Powered Reviews
- Write personal movie reviews
- AI enhancement using state-of-the-art language models
- Side-by-side comparison of original vs. enhanced reviews
- Character count validation and helpful writing prompts

## License

This project is for educational and personal use. Please respect the terms of service for all integrated APIs (TMDb, Groq, Supabase).