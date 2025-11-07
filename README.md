# CineList - Movie Watchlist Application

A comprehensive movie watchlist application with AI-powered review enhancement.

## Features

- **Movie Search**: Search movies using The Open Movie Database (OMDb) API
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

# OMDb API Configuration (Already configured)
VITE_OMDB_API_KEY=b9fe3880

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
- **Movie Data**: The Open Movie Database (OMDb) API
- **AI Enhancement**: Google Gemini API (Gemini Pro model)
- **Build Tool**: Vite

Physical Media Library:

Supabase for database and RLS
TypeScript for type safety
React hooks for state management
CSV export/import service
Blu-ray.com scraping integration
Technical specs caching system

## Features Overview

### Movie Search
- Real-time search using OMDb API
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

Physical Media Library (My Discs)
Manage your personal physical disc collection with comprehensive tracking and organization features.
Features

Multi-Format Support: Track DVD, Blu-ray, 4K UHD, and 3D Blu-ray discs
Status Management: Organize items by status

Owned: Discs in your collection
Wishlist: Discs you want to purchase
For Sale: Discs you're selling
Loaned Out: Discs borrowed by others
Missing: Discs you can't locate


Purchase Tracking: Record purchase date, price, and location
Condition Tracking: Track disc condition (New, Like New, Good, Fair, Poor)
Technical Specifications: Link to detailed Blu-ray.com specs

Video codec and resolution
HDR format support
Audio codecs and channels
Special features and subtitles
Region codes and disc count


Personal Notes & Ratings: Add ratings (1-10) and personal notes for each item
CSV Export/Import: Backup and migrate your library
Search & Filter: Find discs by title, format, status, or condition
Value Tracking: Monitor your collection's total value

Getting Started

Navigate to My Media Library from the main menu
Click Add Item to start building your collection
Search by title or manually enter disc details
Track purchases, condition, and add personal ratings
Request technical specifications from Blu-ray.com for supported titles
Export your library to CSV for backup or analysis

CSV Import/Export
Export your library:
bash# Exports all items with technical specs
Click "Export Library" button in My Media Library page
Import from CSV:
bash# Supports both new and legacy CSV formats
Click "Import Lists" → Choose CSV file → Import
CSV includes:

Basic information (title, year, format)
Purchase details (date, price, location)
Condition and personal rating
Technical specifications (if available)
IMDB linking

Database Structure
The Media Library uses the physical_media_collections table with the following key fields:
typescript{
  title: string           // Movie/show title
  year?: number          // Release year
  format: string         // DVD, Blu-ray, 4K UHD, 3D Blu-ray
  collection_type: string // owned, wishlist, for_sale, loaned_out, missing
  condition: string      // New, Like New, Good, Fair, Poor
  purchase_price?: number
  purchase_date?: string
  personal_rating?: number // 1-10 scale
  notes?: string
  technical_specs_id?: string // Links to Blu-ray.com specs
}
Technical Specifications
Technical specs are automatically cached from Blu-ray.com when available. If specs aren't found:

Open the item detail view
Click Request Technical Specs
System will scrape Blu-ray.com in the background
Specs appear automatically when ready

Specifications include:

Video: Codec, resolution, HDR format, aspect ratio, frame rate
Audio: Codecs, channels, languages
Disc: Format, region codes, disc count
Content: Special features, subtitles, runtime
Release: Studio, distributor, UPC code


Architecture Notes
Media Library vs. Collections
To avoid confusion with TMDB franchise collections, we use clear terminology:

Media Library: Your personal physical disc collection (this feature)
Collections: TMDB movie franchises (e.g., "The Lord of the Rings Collection")

Database Design
The Media Library feature:

Uses physical_media_collections table
Enforces Row Level Security (users only see their own items)
Supports technical specs via foreign key to bluray_technical_specs
Maintains audit trail with created_at and updated_at timestamps

Developer Resources

Migration Guide: docs/TERMINOLOGY_MIGRATION.md
Developer Guide: docs/MEDIA_LIBRARY_GUIDE.md
Hook Documentation: See src/hooks/useMediaLibrary.ts
Service Documentation: See src/services/csvExportService.ts

## License

This project is for educational and personal use. Please respect the terms of service for all integrated APIs (OMDb, Groq, Supabase).