-- supabase/migrations/[timestamp]_create_user_episode_tracking.sql
-- Create table to store user-specific episode tracking data

CREATE TABLE IF NOT EXISTS user_episode_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Episode identification
  series_imdb_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  
  -- User tracking fields (same as movies table)
  status TEXT DEFAULT 'To Watch' CHECK (status IN ('To Watch', 'Watching', 'Watched', 'To Watch Again')),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 10),
  user_review TEXT,
  
  -- Timestamps
  date_watched DATE,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_updated_at TIMESTAMP WITH TIME ZONE,
  rating_updated_at TIMESTAMP WITH TIME ZONE,
  last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one tracking record per user per episode
  UNIQUE(user_id, series_imdb_id, season_number, episode_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_episode_tracking_user_id ON user_episode_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_tracking_series ON user_episode_tracking(series_imdb_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_tracking_episode ON user_episode_tracking(series_imdb_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_user_episode_tracking_status ON user_episode_tracking(user_id, status);

-- Enable Row Level Security
ALTER TABLE user_episode_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own episode tracking
CREATE POLICY "Users can view own episode tracking" ON user_episode_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own episode tracking" ON user_episode_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own episode tracking" ON user_episode_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own episode tracking" ON user_episode_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_episode_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_episode_tracking_timestamp
  BEFORE UPDATE ON user_episode_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_user_episode_tracking_updated_at();

-- Comments
COMMENT ON TABLE user_episode_tracking IS 'User-specific tracking data for TV series episodes (status, rating, review)';
COMMENT ON COLUMN user_episode_tracking.series_imdb_id IS 'IMDb ID of the TV series';
COMMENT ON COLUMN user_episode_tracking.season_number IS 'Season number (1-indexed)';
COMMENT ON COLUMN user_episode_tracking.episode_number IS 'Episode number within the season (1-indexed)';