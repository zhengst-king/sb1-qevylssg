-- Migration: Create recommendation actions and feedback tracking tables
-- File: supabase/migrations/20250914000000_create_recommendation_actions.sql

-- 1. Recommendation Actions Table
CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Recommendation Identification
  recommendation_id TEXT NOT NULL, -- Unique ID for the recommendation (generated client-side)
  imdb_id TEXT,
  title TEXT NOT NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('collection_gap', 'format_upgrade', 'similar_title')),
  recommendation_score DECIMAL(3,2),
  
  -- User Action
  action TEXT NOT NULL CHECK (action IN ('add_to_wishlist', 'mark_as_owned', 'not_interested', 'viewed')),
  action_data JSONB, -- Additional action data (collection_type, format, etc.)
  
  -- Context
  reasoning TEXT, -- Original recommendation reasoning
  suggested_format TEXT,
  session_id TEXT, -- Track recommendations from same session
  
  -- Feedback (for 'not_interested' actions)
  feedback_reason TEXT CHECK (feedback_reason IN ('not_my_genre', 'already_seen', 'too_expensive', 'not_available', 'poor_quality', 'other')),
  feedback_comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate actions for same recommendation
  UNIQUE(user_id, recommendation_id, action)
);

-- 2. Recommendation Sessions Table (track recommendation generations)
CREATE TABLE IF NOT EXISTS recommendation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Session Data
  session_id TEXT NOT NULL,
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  filters_applied JSONB, -- Store the filters used for this session
  
  -- Performance Metrics
  generation_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  
  -- One active session per user (with cleanup)
  UNIQUE(user_id, session_id)
);

-- 3. User Recommendation Preferences (learned from feedback)
CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Preference Data
  preferred_genres TEXT[],
  avoided_genres TEXT[],
  preferred_directors TEXT[],
  avoided_directors TEXT[],
  preferred_formats TEXT[],
  min_rating DECIMAL(2,1),
  max_price DECIMAL(10,2),
  
  -- Algorithm Weights (learned from user actions)
  collection_gap_weight DECIMAL(3,2) DEFAULT 0.3,
  format_upgrade_weight DECIMAL(3,2) DEFAULT 0.3,
  similar_title_weight DECIMAL(3,2) DEFAULT 0.4,
  
  -- Behavioral Patterns
  dismissal_patterns JSONB, -- Track what user tends to dismiss
  conversion_patterns JSONB, -- Track what user tends to add
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One preference record per user
  UNIQUE(user_id)
);

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user_id ON recommendation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_recommendation_id ON recommendation_actions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_action ON recommendation_actions(action);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_imdb_id ON recommendation_actions(imdb_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_created_at ON recommendation_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_user_id ON recommendation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_session_id ON recommendation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_expires_at ON recommendation_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_recommendation_preferences_user_id ON user_recommendation_preferences(user_id);

-- 5. Row Level Security
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendation_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own recommendation actions" ON recommendation_actions;
DROP POLICY IF EXISTS "Users can create own recommendation actions" ON recommendation_actions;
DROP POLICY IF EXISTS "Users can view own recommendation sessions" ON recommendation_sessions;
DROP POLICY IF EXISTS "Users can create own recommendation sessions" ON recommendation_sessions;
DROP POLICY IF EXISTS "Users can view own recommendation preferences" ON user_recommendation_preferences;
DROP POLICY IF EXISTS "Users can manage own recommendation preferences" ON user_recommendation_preferences;

-- Create RLS policies
CREATE POLICY "Users can view own recommendation actions" ON recommendation_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendation actions" ON recommendation_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendation sessions" ON recommendation_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendation sessions" ON recommendation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendation preferences" ON user_recommendation_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recommendation preferences" ON user_recommendation_preferences
  FOR ALL USING (auth.uid() = user_id);

-- 6. Auto-update timestamp trigger for preferences
CREATE TRIGGER update_user_recommendation_preferences_updated_at 
  BEFORE UPDATE ON user_recommendation_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_recommendation_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM recommendation_sessions 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Add collection_type to physical_media_collections if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'physical_media_collections' AND column_name = 'collection_type'
  ) THEN
    ALTER TABLE physical_media_collections 
    ADD COLUMN collection_type TEXT DEFAULT 'owned' 
    CHECK (collection_type IN ('owned', 'wishlist', 'for_sale', 'loaned_out', 'missing'));
  END IF;
END $$;