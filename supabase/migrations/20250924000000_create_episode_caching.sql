-- Migration: Create episode discovery and caching system
-- File: supabase/migrations/20250924000000_create_episode_caching.sql

-- 1. Episodes Cache Table (Global/Shared)
CREATE TABLE IF NOT EXISTS episodes_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Episode Identification
  imdb_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  
  -- Episode Data
  title TEXT,
  plot TEXT,
  rating TEXT,
  air_date DATE,
  runtime_minutes INTEGER,
  year INTEGER,
  director TEXT,
  writer TEXT,
  actors TEXT,
  genre TEXT,
  
  -- Metadata
  poster_url TEXT,
  imdb_rating DECIMAL(3,1),
  imdb_votes TEXT,
  
  -- Caching Info
  api_response JSONB, -- Store full OMDb response
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetch_success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Cache Management
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per episode
  UNIQUE(imdb_id, season_number, episode_number)
);

-- 2. Episode Discovery Queue (for background processing)
CREATE TABLE IF NOT EXISTS episode_discovery_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- TV Series Info
  series_imdb_id TEXT NOT NULL,
  series_title TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  
  -- Discovery Strategy
  discovery_type TEXT CHECK (discovery_type IN ('single_episode', 'full_season', 'full_series', 'user_request')) DEFAULT 'single_episode',
  priority INTEGER DEFAULT 5, -- 1-10 scale, 10 = highest
  
  -- Processing Status
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'skipped')) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Results
  episodes_discovered INTEGER DEFAULT 0,
  episodes_cached INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  
  -- Error Handling
  error_message TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  
  -- Request Context
  requested_by_user_id UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retry_after TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Series Episode Count Cache (to avoid re-discovering known series)
CREATE TABLE IF NOT EXISTS series_episode_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Series Identification
  imdb_id TEXT NOT NULL UNIQUE,
  series_title TEXT,
  
  -- Episode Structure
  total_seasons INTEGER,
  seasons_data JSONB, -- Format: {"1": {"episodes": 22, "discovered": true}, "2": {"episodes": 24, "discovered": false}}
  total_episodes INTEGER,
  episodes_discovered INTEGER DEFAULT 0,
  
  -- Discovery Status
  fully_discovered BOOLEAN DEFAULT FALSE,
  last_discovery_attempt TIMESTAMP WITH TIME ZONE,
  discovery_complete_at TIMESTAMP WITH TIME ZONE,
  
  -- API Efficiency
  estimated_api_calls INTEGER, -- Estimated calls needed for full discovery
  actual_api_calls INTEGER DEFAULT 0,
  
  -- Metadata
  first_air_date DATE,
  last_air_date DATE,
  status TEXT, -- 'continuing', 'ended', 'cancelled'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User Episode Preferences (for smart discovery)
CREATE TABLE IF NOT EXISTS user_episode_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Discovery Preferences
  auto_discover_episodes BOOLEAN DEFAULT TRUE,
  preferred_discovery_depth TEXT CHECK (preferred_discovery_depth IN ('current_season', 'full_series', 'on_demand')) DEFAULT 'current_season',
  background_discovery_enabled BOOLEAN DEFAULT TRUE,
  
  -- Usage Patterns
  episodes_viewed INTEGER DEFAULT 0,
  average_viewing_sessions_per_week INTEGER DEFAULT 0,
  preferred_viewing_times TIME[],
  
  -- Performance Preferences
  preload_next_episodes BOOLEAN DEFAULT TRUE,
  cache_ahead_episodes INTEGER DEFAULT 3,
  max_background_api_calls INTEGER DEFAULT 10, -- Per session
  
  -- Notification Settings
  notify_on_new_episodes BOOLEAN DEFAULT FALSE,
  notify_on_season_complete BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_episodes_cache_lookup ON episodes_cache(imdb_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_cache_series ON episodes_cache(imdb_id);
CREATE INDEX IF NOT EXISTS idx_episodes_cache_access_count ON episodes_cache(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_cache_last_accessed ON episodes_cache(last_accessed_at);

CREATE INDEX IF NOT EXISTS idx_discovery_queue_status ON episode_discovery_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_queue_scheduled ON episode_discovery_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_discovery_queue_series ON episode_discovery_queue(series_imdb_id);

CREATE INDEX IF NOT EXISTS idx_series_counts_imdb ON series_episode_counts(imdb_id);
CREATE INDEX IF NOT EXISTS idx_series_counts_discovery_status ON series_episode_counts(fully_discovered, last_discovery_attempt);

CREATE INDEX IF NOT EXISTS idx_user_episode_prefs_user ON user_episode_preferences(user_id);

-- 6. Row Level Security
ALTER TABLE episodes_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_discovery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_episode_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_episode_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Episodes cache is readable by all authenticated users" ON episodes_cache;
DROP POLICY IF EXISTS "Episodes cache can be written by service" ON episodes_cache;
DROP POLICY IF EXISTS "Users can view their discovery requests" ON episode_discovery_queue;
DROP POLICY IF EXISTS "Users can request episode discovery" ON episode_discovery_queue;
DROP POLICY IF EXISTS "Service can process discovery queue" ON episode_discovery_queue;
DROP POLICY IF EXISTS "Series counts readable by authenticated users" ON series_episode_counts;
DROP POLICY IF EXISTS "Service can update series counts" ON series_episode_counts;
DROP POLICY IF EXISTS "Users can view their episode preferences" ON user_episode_preferences;
DROP POLICY IF EXISTS "Users can manage their episode preferences" ON user_episode_preferences;

-- Episodes Cache Policies (Global read, service write)
CREATE POLICY "Episodes cache is readable by all authenticated users"
  ON episodes_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Episodes cache can be written by service"
  ON episodes_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Discovery Queue Policies
CREATE POLICY "Users can view their discovery requests"
  ON episode_discovery_queue
  FOR SELECT
  USING (auth.uid() = requested_by_user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can request episode discovery"
  ON episode_discovery_queue
  FOR INSERT
  WITH CHECK (auth.uid() = requested_by_user_id);

CREATE POLICY "Service can process discovery queue"
  ON episode_discovery_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Series Counts Policies
CREATE POLICY "Series counts readable by authenticated users"
  ON series_episode_counts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can update series counts"
  ON series_episode_counts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User Preferences Policies
CREATE POLICY "Users can view their episode preferences"
  ON user_episode_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their episode preferences"
  ON user_episode_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Create helpful functions
CREATE OR REPLACE FUNCTION update_episodes_cache_access(
  p_imdb_id TEXT,
  p_season_number INTEGER,
  p_episode_number INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE episodes_cache
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE 
    imdb_id = p_imdb_id
    AND season_number = p_season_number
    AND episode_number = p_episode_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_series_discovery_progress(p_imdb_id TEXT)
RETURNS TABLE (
  total_episodes INTEGER,
  episodes_discovered INTEGER,
  discovery_percentage DECIMAL,
  estimated_remaining_calls INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sec.total_episodes,
    sec.episodes_discovered,
    CASE 
      WHEN sec.total_episodes > 0 THEN 
        ROUND((sec.episodes_discovered::DECIMAL / sec.total_episodes * 100), 2)
      ELSE 0::DECIMAL
    END as discovery_percentage,
    GREATEST(0, sec.estimated_api_calls - sec.actual_api_calls) as estimated_remaining_calls
  FROM series_episode_counts sec
  WHERE sec.imdb_id = p_imdb_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;