-- Migration: Performance Optimization - Caching and Background Processing
-- File: supabase/migrations/20250916000001_performance_optimization_caching.sql

-- 1. Recommendation Cache Table for Database-Level Caching
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Cache identification
  cache_key TEXT NOT NULL,
  cache_type TEXT DEFAULT 'recommendations' CHECK (cache_type IN ('recommendations', 'user_profile', 'omdb_search', 'omdb_details')),
  
  -- Cache data
  cache_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Request context
  filters JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  
  -- Performance metrics  
  generation_time_ms INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  cache_hits_count INTEGER DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0.0,
  
  -- Size tracking
  data_size_bytes INTEGER DEFAULT 0,
  compressed_size_bytes INTEGER DEFAULT 0,
  
  -- Expiration and access tracking
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  
  -- Cache priority for eviction
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  
  -- Source tracking
  source TEXT DEFAULT 'user_request' CHECK (source IN ('user_request', 'background', 'warming', 'prefetch')),
  
  -- Constraints
  UNIQUE(user_id, cache_key, cache_type)
);

-- 2. Background Task Queue Table
CREATE TABLE IF NOT EXISTS background_task_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Task identification
  task_id TEXT NOT NULL UNIQUE,
  task_type TEXT NOT NULL CHECK (task_type IN ('recommendation_generation', 'cache_warming', 'user_profile_update', 'cleanup')),
  
  -- Task status
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 50, -- Higher number = higher priority
  
  -- Task data
  task_data JSONB NOT NULL DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  
  -- Execution tracking
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  retry_delay_ms INTEGER DEFAULT 5000,
  
  -- Results
  result_data JSONB DEFAULT '{}',
  error_message TEXT,
  processing_time_ms INTEGER,
  
  -- Context
  trigger_source TEXT DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'scheduled', 'user_action', 'collection_change', 'cache_expiry')),
  estimated_duration_ms INTEGER DEFAULT 5000,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Activity Patterns for Smart Scheduling
CREATE TABLE IF NOT EXISTS user_activity_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Activity tracking
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_count INTEGER DEFAULT 0,
  total_session_time_minutes INTEGER DEFAULT 0,
  average_session_length_minutes DECIMAL(6,2) DEFAULT 30.0,
  
  -- Usage patterns
  peak_usage_hours INTEGER[] DEFAULT '{}', -- Array of hour integers (0-23)
  common_usage_days INTEGER[] DEFAULT '{}', -- Array of weekday integers (0-6)
  activity_score DECIMAL(5,2) DEFAULT 0.0, -- Overall activity level
  
  -- Interaction patterns
  recommendations_viewed INTEGER DEFAULT 0,
  recommendations_acted_upon INTEGER DEFAULT 0,
  collection_updates_count INTEGER DEFAULT 0,
  preferred_recommendation_types TEXT[] DEFAULT '{}',
  
  -- Performance preferences (learned from user behavior)
  prefers_background_updates BOOLEAN DEFAULT TRUE,
  cache_hit_preference BOOLEAN DEFAULT TRUE, -- Prefers fast cache over fresh data
  notification_preferences JSONB DEFAULT '{}',
  
  -- Scheduling optimization
  optimal_update_times TIME[] DEFAULT '{}',
  last_background_update TIMESTAMP WITH TIME ZONE,
  next_scheduled_update TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One record per user
  UNIQUE(user_id)
);

-- 4. Performance Metrics Tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Metric identification
  metric_type TEXT NOT NULL CHECK (metric_type IN ('recommendation_generation', 'cache_performance', 'background_task', 'user_interaction')),
  metric_name TEXT NOT NULL,
  
  -- Context
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  
  -- Metric data
  value DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL, -- 'ms', 'count', 'percentage', 'bytes', etc.
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  
  -- Partitioning hint for large datasets
  date_partition DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED
);

-- 5. Create Indexes for Optimal Performance

-- Recommendation cache indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_key ON recommendation_cache(user_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_type_expires ON recommendation_cache(cache_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_priority ON recommendation_cache(priority, last_accessed);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON recommendation_cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_access_count ON recommendation_cache(access_count DESC, last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_quality ON recommendation_cache(quality_score DESC) WHERE quality_score > 0;

-- Background task indexes
CREATE INDEX IF NOT EXISTS idx_background_tasks_user_status ON background_task_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_background_tasks_priority_scheduled ON background_task_queue(priority DESC, scheduled_at ASC) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_background_tasks_type_status ON background_task_queue(task_type, status);
CREATE INDEX IF NOT EXISTS idx_background_tasks_retry ON background_task_queue(retry_count, max_retries) WHERE status = 'failed';

-- Activity patterns indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_last_active ON user_activity_patterns(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_score ON user_activity_patterns(activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_next_update ON user_activity_patterns(next_scheduled_update) WHERE next_scheduled_update IS NOT NULL;

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_time ON performance_metrics(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_type ON performance_metrics(user_id, metric_type, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_partition ON performance_metrics(date_partition, metric_type);

-- 6. Row Level Security Policies

-- Enable RLS
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Recommendation cache policies
CREATE POLICY "Users can access own cache entries" ON recommendation_cache
  FOR ALL USING (auth.uid() = user_id);

-- Background task policies
CREATE POLICY "Users can view own background tasks" ON background_task_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage background tasks" ON background_task_queue
  FOR ALL USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Activity patterns policies
CREATE POLICY "Users can access own activity patterns" ON user_activity_patterns
  FOR ALL USING (auth.uid() = user_id);

-- Performance metrics policies (more permissive for analytics)
CREATE POLICY "Users can view own metrics" ON performance_metrics
  FOR SELECT USING (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can write metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 7. Utility Functions

-- Update cache access statistics
CREATE OR REPLACE FUNCTION update_cache_access(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE recommendation_cache 
  SET 
    last_accessed = NOW(),
    access_count = access_count + 1
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired entries
  DELETE FROM recommendation_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also clean up old background tasks
  DELETE FROM background_task_queue 
  WHERE status IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '7 days';
  
  -- Clean old performance metrics (keep 30 days)
  DELETE FROM performance_metrics 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate cache hit rate for user
CREATE OR REPLACE FUNCTION get_user_cache_hit_rate(p_user_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_requests INTEGER;
  cache_hits INTEGER;
BEGIN
  -- Get cache hits from the last 24 hours
  SELECT COUNT(*) INTO cache_hits
  FROM recommendation_cache
  WHERE user_id = p_user_id 
    AND last_accessed > NOW() - INTERVAL '24 hours'
    AND access_count > 1;
    
  -- Get total requests (simplified - could be enhanced with actual request tracking)
  SELECT SUM(access_count) INTO total_requests
  FROM recommendation_cache
  WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '24 hours';
  
  IF total_requests IS NULL OR total_requests = 0 THEN
    RETURN 0.0;
  END IF;
  
  RETURN ROUND((cache_hits::DECIMAL / total_requests::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Smart cache eviction based on LRU and priority
CREATE OR REPLACE FUNCTION smart_cache_eviction(p_user_id UUID, target_entries INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  evicted_count INTEGER;
BEGIN
  -- Evict based on: low priority + old access time + low quality
  DELETE FROM recommendation_cache 
  WHERE id IN (
    SELECT id FROM recommendation_cache
    WHERE user_id = p_user_id
    ORDER BY 
      CASE priority 
        WHEN 'low' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'high' THEN 3 
      END ASC,
      last_accessed ASC,
      quality_score ASC
    LIMIT target_entries
  );
  
  GET DIAGNOSTICS evicted_count = ROW_COUNT;
  RETURN evicted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user activity pattern
CREATE OR REPLACE FUNCTION update_user_activity_pattern(
  p_user_id UUID,
  p_session_length_minutes INTEGER DEFAULT NULL,
  p_recommendations_viewed INTEGER DEFAULT 0,
  p_recommendations_acted_upon INTEGER DEFAULT 0,
  p_collection_updates INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
  current_hour INTEGER;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW());
  
  INSERT INTO user_activity_patterns (
    user_id,
    peak_usage_hours,
    session_count,
    total_session_time_minutes,
    recommendations_viewed,
    recommendations_acted_upon,
    collection_updates_count
  ) VALUES (
    p_user_id,
    ARRAY[current_hour],
    1,
    COALESCE(p_session_length_minutes, 0),
    p_recommendations_viewed,
    p_recommendations_acted_upon,
    p_collection_updates
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_active_at = NOW(),
    peak_usage_hours = CASE 
      WHEN current_hour = ANY(user_activity_patterns.peak_usage_hours) THEN user_activity_patterns.peak_usage_hours
      ELSE array_append(user_activity_patterns.peak_usage_hours[1:5], current_hour) -- Keep max 6 peak hours
    END,
    session_count = user_activity_patterns.session_count + 1,
    total_session_time_minutes = user_activity_patterns.total_session_time_minutes + COALESCE(p_session_length_minutes, 0),
    average_session_length_minutes = CASE 
      WHEN p_session_length_minutes IS NOT NULL THEN
        (user_activity_patterns.total_session_time_minutes + p_session_length_minutes)::DECIMAL / (user_activity_patterns.session_count + 1)
      ELSE user_activity_patterns.average_session_length_minutes
    END,
    recommendations_viewed = user_activity_patterns.recommendations_viewed + p_recommendations_viewed,
    recommendations_acted_upon = user_activity_patterns.recommendations_acted_upon + p_recommendations_acted_upon,
    collection_updates_count = user_activity_patterns.collection_updates_count + p_collection_updates,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Auto-update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_background_task_queue_updated_at 
  BEFORE UPDATE ON background_task_queue 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_patterns_updated_at 
  BEFORE UPDATE ON user_activity_patterns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Automatic Cleanup Job Setup

-- Create a scheduled function that can be called by external cron
CREATE OR REPLACE FUNCTION scheduled_maintenance()
RETURNS TABLE(
  cache_cleaned INTEGER,
  tasks_cleaned INTEGER,
  metrics_cleaned INTEGER
) AS $$
DECLARE
  cache_count INTEGER;
  task_count INTEGER;
  metric_count INTEGER;
BEGIN
  -- Clean expired cache
  cache_count := cleanup_expired_cache();
  
  -- Clean old completed tasks
  DELETE FROM background_task_queue 
  WHERE status IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS task_count = ROW_COUNT;
  
  -- Clean old metrics
  DELETE FROM performance_metrics 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS metric_count = ROW_COUNT;
  
  RETURN QUERY SELECT cache_count, task_count, metric_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Monitoring Views

CREATE OR REPLACE VIEW cache_performance_summary AS
SELECT 
  u.email,
  rc.cache_type,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE rc.expires_at > NOW()) as active_entries,
  AVG(rc.generation_time_ms) as avg_generation_time_ms,
  AVG(rc.access_count) as avg_access_count,
  SUM(rc.data_size_bytes) as total_cache_size_bytes,
  MAX(rc.last_accessed) as last_cache_access
FROM recommendation_cache rc
JOIN auth.users u ON rc.user_id = u.id
GROUP BY u.email, rc.cache_type
ORDER BY total_cache_size_bytes DESC;

CREATE OR REPLACE VIEW background_task_summary AS
SELECT 
  task_type,
  status,
  COUNT(*) as task_count,
  AVG(processing_time_ms) as avg_processing_time_ms,
  AVG(retry_count) as avg_retry_count,
  MIN(scheduled_at) as oldest_task,
  MAX(completed_at) as latest_completion
FROM background_task_queue
GROUP BY task_type, status
ORDER BY task_count DESC;

-- 11. Sample Data and Testing Queries

-- Insert sample performance metric
INSERT INTO performance_metrics (metric_type, metric_name, value, unit, metadata)
VALUES ('recommendation_generation', 'average_generation_time', 1250.0, 'ms', '{"version": "enhanced", "cache_enabled": true}')
ON CONFLICT DO NOTHING;

-- 12. Comments for documentation
COMMENT ON TABLE recommendation_cache IS 'High-performance cache for recommendations and OMDB data with automatic expiration and LRU eviction';
COMMENT ON TABLE background_task_queue IS 'Queue for background recommendation generation and cache warming tasks';
COMMENT ON TABLE user_activity_patterns IS 'User activity tracking for smart scheduling and personalization';
COMMENT ON TABLE performance_metrics IS 'System performance metrics for monitoring and optimization';

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired cache entries and old background tasks';
COMMENT ON FUNCTION smart_cache_eviction(UUID, INTEGER) IS 'Intelligent cache eviction based on priority, access patterns, and quality';
COMMENT ON FUNCTION update_user_activity_pattern(UUID, INTEGER, INTEGER, INTEGER, INTEGER) IS 'Updates user activity patterns for smart background scheduling';

-- Migration complete
SELECT 'Performance optimization migration completed successfully' as status;