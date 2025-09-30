-- supabase/migrations/20250929000000_create_tmdb_cache.sql
-- Migration: Create TMDB TV series data caching system

-- 1. TMDB Series Cache Table (Global/Shared)
CREATE TABLE IF NOT EXISTS tmdb_series_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Series Identification
  imdb_id TEXT NOT NULL UNIQUE,
  tmdb_id INTEGER NOT NULL,
  
  -- Basic Info
  name TEXT,
  overview TEXT,
  homepage TEXT,
  status TEXT,
  first_air_date DATE,
  last_air_date DATE,
  
  -- Creators
  created_by JSONB, -- Array of creator objects with id, name, profile_path
  
  -- Networks
  networks JSONB, -- Array of network objects with id, name, logo_path, origin_country
  
  -- Production
  production_companies JSONB, -- Array of company objects with id, name, logo_path, origin_country
  production_countries JSONB, -- Array of country objects with iso_3166_1, name
  
  -- Keywords
  keywords JSONB, -- Array of keyword objects with id, name
  
  -- Videos (Trailers)
  videos JSONB, -- Array of video objects with id, key, name, site, type, official
  
  -- External IDs
  external_ids JSONB, -- Object with imdb_id, tvdb_id, etc.
  
  -- Full API Response (for reference)
  api_response JSONB,
  
  -- Caching Info
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  fetch_success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Smart Cache Management
  calculated_ttl_days INTEGER,
  imdb_rating DECIMAL(3,1), -- Store rating for TTL calculation
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_tmdb_series_cache_imdb_id ON tmdb_series_cache(imdb_id);
CREATE INDEX IF NOT EXISTS idx_tmdb_series_cache_tmdb_id ON tmdb_series_cache(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tmdb_series_cache_last_accessed ON tmdb_series_cache(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_tmdb_series_cache_rating ON tmdb_series_cache(imdb_rating);

-- 3. Create function to update access time
CREATE OR REPLACE FUNCTION update_tmdb_cache_access(p_imdb_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE tmdb_series_cache
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE imdb_id = p_imdb_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function for smart TMDB cache cleanup (reuse calculate_smart_ttl)
CREATE OR REPLACE FUNCTION tmdb_smart_cache_cleanup()
RETURNS TABLE (
  series_cleaned TEXT,
  reason TEXT
) AS $$
DECLARE
  cache_record RECORD;
  ttl_days INTEGER;
  access_cutoff TIMESTAMP WITH TIME ZONE;
  hard_limit_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Hard limit: 8 weeks maximum retention
  hard_limit_cutoff := NOW() - INTERVAL '56 days';
  
  FOR cache_record IN 
    SELECT imdb_id, imdb_rating, calculated_ttl_days, last_accessed_at, last_fetched_at
    FROM tmdb_series_cache
  LOOP
    -- Calculate TTL for this series (use existing function)
    ttl_days := COALESCE(
      cache_record.calculated_ttl_days,
      calculate_smart_ttl(COALESCE(cache_record.imdb_rating, 5.0))
    );
    
    -- Access-based expiration cutoff
    access_cutoff := NOW() - (ttl_days || ' days')::INTERVAL;
    
    -- Clean if not accessed within TTL period OR older than hard limit
    IF cache_record.last_accessed_at < access_cutoff 
       OR cache_record.last_fetched_at < hard_limit_cutoff THEN
      
      DELETE FROM tmdb_series_cache
      WHERE imdb_id = cache_record.imdb_id;
      
      series_cleaned := cache_record.imdb_id;
      reason := format('Rating: %s, TTL: %s days, Last accessed: %s', 
        COALESCE(cache_record.imdb_rating::TEXT, 'unrated'), 
        ttl_days,
        cache_record.last_accessed_at::TEXT);
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to automatically calculate TTL when rating is updated
CREATE OR REPLACE FUNCTION auto_calculate_tmdb_ttl()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.imdb_rating IS NOT NULL THEN
    NEW.calculated_ttl_days := calculate_smart_ttl(NEW.imdb_rating);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_tmdb_ttl ON tmdb_series_cache;

CREATE TRIGGER trigger_auto_calculate_tmdb_ttl
  BEFORE INSERT OR UPDATE ON tmdb_series_cache
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_tmdb_ttl();

-- 6. Create view for easy cache monitoring
CREATE OR REPLACE VIEW tmdb_cache_overview AS
SELECT 
  imdb_id,
  name as series_title,
  tmdb_id,
  imdb_rating,
  calculated_ttl_days,
  status,
  access_count,
  last_accessed_at,
  last_fetched_at,
  CASE 
    WHEN imdb_rating >= 8.0 THEN 'Premium (4 weeks)'
    WHEN imdb_rating >= 6.0 THEN 'Good (3 weeks)'
    WHEN imdb_rating >= 4.0 THEN 'Average (2 weeks)'
    ELSE 'Basic (1 week)'
  END as cache_tier,
  -- Calculate remaining cache time
  CASE 
    WHEN last_accessed_at IS NULL THEN NULL
    ELSE GREATEST(0, 
      EXTRACT(EPOCH FROM (
        last_accessed_at + 
        (COALESCE(calculated_ttl_days, 7) || ' days')::INTERVAL - 
        NOW()
      )) / 86400
    )::INTEGER
  END as days_until_expiry
FROM tmdb_series_cache
ORDER BY imdb_rating DESC NULLS LAST;

-- 7. Row Level Security
ALTER TABLE tmdb_series_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "TMDB cache is readable by all authenticated users" ON tmdb_series_cache;
DROP POLICY IF EXISTS "TMDB cache can be written by service" ON tmdb_series_cache;

-- TMDB Cache Policies (Global read, service write)
CREATE POLICY "TMDB cache is readable by all authenticated users"
  ON tmdb_series_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TMDB cache can be written by service"
  ON tmdb_series_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION update_tmdb_cache_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION tmdb_smart_cache_cleanup() TO service_role;
GRANT SELECT ON tmdb_cache_overview TO authenticated;

-- 9. Add comments for documentation
COMMENT ON TABLE tmdb_series_cache IS 'Server-side cache for TMDB TV series data with smart retention';
COMMENT ON FUNCTION update_tmdb_cache_access(TEXT) IS 'Track TMDB cache access for retention management';
COMMENT ON FUNCTION tmdb_smart_cache_cleanup() IS 'Clean expired TMDB cache entries based on rating-specific TTL';
COMMENT ON VIEW tmdb_cache_overview IS 'Monitoring view for TMDB cache status with retention information';

-- 10. Sample cleanup query (for manual use or cron job)
/*
-- Run periodic cleanup (e.g., weekly via pg_cron or Edge Function)
SELECT * FROM tmdb_smart_cache_cleanup();

-- View cache statistics
SELECT 
  COUNT(*) as total_series,
  COUNT(CASE WHEN imdb_rating >= 8.0 THEN 1 END) as premium_series,
  COUNT(CASE WHEN imdb_rating >= 6.0 AND imdb_rating < 8.0 THEN 1 END) as good_series,
  COUNT(CASE WHEN imdb_rating >= 4.0 AND imdb_rating < 6.0 THEN 1 END) as average_series,
  AVG(access_count) as avg_access_count
FROM tmdb_series_cache;

-- View expiring cache entries
SELECT * FROM tmdb_cache_overview 
WHERE days_until_expiry IS NOT NULL 
AND days_until_expiry <= 7
ORDER BY days_until_expiry;
*/