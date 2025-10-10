-- supabase/migrations/20251009000000_create_movie_cast_cache.sql
-- Migration: Create table for storing movie cast and crew information

-- Movie Cast Cache Table
CREATE TABLE IF NOT EXISTS movie_cast_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Movie Identification
  imdb_id TEXT NOT NULL UNIQUE,
  tmdb_movie_id INTEGER,
  
  -- Cached Data
  cast_data JSONB NOT NULL, -- Array of cast member objects
  crew_data JSONB, -- Array of crew member objects (directors, writers, producers, etc.)
  
  -- Cache Management
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetch_success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_movie_cast_cache_imdb ON movie_cast_cache(imdb_id);
CREATE INDEX IF NOT EXISTS idx_movie_cast_cache_fetched ON movie_cast_cache(last_fetched_at);

-- Enable Row Level Security (RLS)
ALTER TABLE movie_cast_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy (Public read access)
CREATE POLICY "Allow public read access to movie cast cache" ON movie_cast_cache
  FOR SELECT USING (true);

-- Create helper function for updating timestamp
CREATE OR REPLACE FUNCTION update_movie_cast_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_movie_cast_cache_timestamp
  BEFORE UPDATE ON movie_cast_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_cast_cache_timestamp();