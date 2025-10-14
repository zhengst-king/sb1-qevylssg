-- supabase/migrations/YYYYMMDDHHMMSS_create_favorite_franchises.sql
-- Migration: Create table for storing user's favorite franchises/collections

-- Favorite Franchises Table
CREATE TABLE IF NOT EXISTS favorite_franchises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- TMDB Collection Info
  tmdb_collection_id INTEGER NOT NULL,
  collection_name TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per user/collection
  UNIQUE(user_id, tmdb_collection_id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_favorite_franchises_user_id ON favorite_franchises(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_franchises_collection_id ON favorite_franchises(tmdb_collection_id);

-- Enable Row Level Security (RLS)
ALTER TABLE favorite_franchises ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite franchises" ON favorite_franchises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite franchises" ON favorite_franchises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite franchises" ON favorite_franchises
  FOR DELETE USING (auth.uid() = user_id);