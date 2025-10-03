-- supabase/migrations/20251002000000_create_episode_cast_tables.sql
-- Migration: Create tables for storing episode cast and character information

-- 1. People/Actors Table (Global reference table)
CREATE TABLE IF NOT EXISTS people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- TMDB Identification
  tmdb_person_id INTEGER UNIQUE NOT NULL,
  imdb_person_id TEXT,
  
  -- Personal Info
  name TEXT NOT NULL,
  biography TEXT,
  birthday DATE,
  deathday DATE,
  place_of_birth TEXT,
  gender INTEGER, -- 0 = not set, 1 = female, 2 = male, 3 = non-binary
  
  -- Career Info
  known_for_department TEXT, -- Acting, Directing, Writing, etc.
  popularity DECIMAL(10,2),
  
  -- Images
  profile_path TEXT, -- TMDB profile image path
  profile_url TEXT, -- Full URL to profile image
  
  -- Social Media
  homepage TEXT,
  
  -- Metadata
  tmdb_data JSONB, -- Store full TMDB person object
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Characters Table (Character definitions)
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- TMDB Identification
  tmdb_character_id INTEGER, -- May not always be available
  
  -- Character Info
  character_name TEXT NOT NULL,
  
  -- Associated Person (Actor)
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  
  -- Series/Movie Association
  imdb_id TEXT NOT NULL, -- Series or movie IMDb ID
  media_type TEXT CHECK (media_type IN ('tv', 'movie')) DEFAULT 'tv',
  
  -- Episode-specific (for TV)
  season_number INTEGER,
  episode_number INTEGER,
  
  -- Role Info
  role_type TEXT CHECK (role_type IN ('regular', 'guest', 'recurring')) DEFAULT 'guest',
  credit_order INTEGER, -- Order in credits (lower = more prominent)
  
  -- Character Details
  description TEXT,
  
  -- Metadata
  tmdb_data JSONB, -- Store full TMDB character/credit object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per episode/character/actor combination
  UNIQUE(imdb_id, season_number, episode_number, person_id, character_name)
);

-- 3. Episode Cast Cache (Performance optimization)
CREATE TABLE IF NOT EXISTS episode_cast_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Episode Identification
  imdb_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  tmdb_episode_id INTEGER, -- TMDB's episode ID
  
  -- Cached Data
  cast_data JSONB NOT NULL, -- Array of cast member objects
  crew_data JSONB, -- Array of crew member objects (directors, writers, etc.)
  guest_stars JSONB, -- Array of guest star objects
  
  -- Cache Management
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetch_success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per episode
  UNIQUE(imdb_id, season_number, episode_number)
);

-- 4. Series Cast Cache (For series-level regular cast)
CREATE TABLE IF NOT EXISTS series_cast_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Series Identification
  imdb_id TEXT NOT NULL UNIQUE,
  tmdb_series_id INTEGER,
  
  -- Cached Data
  aggregate_credits JSONB NOT NULL, -- Full aggregate credits response from TMDB
  regular_cast JSONB, -- Array of main cast members
  
  -- Cache Management
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetch_success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_people_tmdb_id ON people(tmdb_person_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_popularity ON people(popularity DESC);

CREATE INDEX IF NOT EXISTS idx_characters_person_id ON characters(person_id);
CREATE INDEX IF NOT EXISTS idx_characters_imdb_id ON characters(imdb_id);
CREATE INDEX IF NOT EXISTS idx_characters_episode ON characters(imdb_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_characters_credit_order ON characters(credit_order);

CREATE INDEX IF NOT EXISTS idx_episode_cast_cache_episode ON episode_cast_cache(imdb_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_episode_cast_cache_fetched ON episode_cast_cache(last_fetched_at);

CREATE INDEX IF NOT EXISTS idx_series_cast_cache_imdb ON series_cast_cache(imdb_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_cast_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_cast_cache ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies (Public read access)
CREATE POLICY "Allow public read access to people" ON people
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to characters" ON characters
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to episode cast cache" ON episode_cast_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to series cast cache" ON series_cast_cache
  FOR SELECT USING (true);

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION update_episode_cast_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_episode_cast_cache_timestamp
  BEFORE UPDATE ON episode_cast_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_episode_cast_cache_timestamp();

CREATE TRIGGER update_series_cast_cache_timestamp
  BEFORE UPDATE ON series_cast_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_episode_cast_cache_timestamp();

CREATE TRIGGER update_characters_timestamp
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_episode_cast_cache_timestamp();