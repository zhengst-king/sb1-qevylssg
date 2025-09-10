-- Migration: Create technical specifications tables and queue system (CORRECTED)

-- 1. Technical Specifications Cache Table
CREATE TABLE IF NOT EXISTS bluray_technical_specs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identification
  title TEXT NOT NULL,
  year INTEGER,
  imdb_id TEXT,
  bluray_com_url TEXT,
  
  -- Video Specifications
  video_codec TEXT,
  video_resolution TEXT,
  hdr_format TEXT[],
  aspect_ratio TEXT,
  frame_rate TEXT,
  
  -- Audio Specifications
  audio_codecs TEXT[],
  audio_channels TEXT[],
  audio_languages TEXT[],
  
  -- Disc Information
  disc_format TEXT NOT NULL,
  region_codes TEXT[],
  disc_count INTEGER DEFAULT 1,
  studio TEXT,
  distributor TEXT,
  
  -- Additional Information
  special_features TEXT[],
  subtitles TEXT[],
  runtime_minutes INTEGER,
  upc_code TEXT,
  
  -- Quality and Metadata
  data_quality TEXT CHECK (data_quality IN ('complete', 'partial', 'minimal')) DEFAULT 'minimal',
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scrape_success BOOLEAN DEFAULT true,
  scrape_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(title, year, disc_format)
);

-- 2. Scraping Queue Table
CREATE TABLE IF NOT EXISTS scraping_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Job Information
  title TEXT NOT NULL,
  year INTEGER,
  imdb_id TEXT,
  search_query TEXT,
  
  -- Job Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Results
  technical_specs_id UUID REFERENCES bluray_technical_specs(id),
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_after TIMESTAMP WITH TIME ZONE,
  
  -- Request metadata
  requested_by_user_id UUID REFERENCES auth.users(id),
  collection_item_id UUID REFERENCES physical_media_collections(id)
);

-- 3. Add technical_specs_id column to existing physical_media_collections table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'physical_media_collections' AND column_name = 'technical_specs_id'
  ) THEN
    ALTER TABLE physical_media_collections 
    ADD COLUMN technical_specs_id UUID REFERENCES bluray_technical_specs(id);
  END IF;
END $$;

-- 4. Create Indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_bluray_specs_title_year ON bluray_technical_specs(title, year);
CREATE INDEX IF NOT EXISTS idx_bluray_specs_imdb_id ON bluray_technical_specs(imdb_id);
CREATE INDEX IF NOT EXISTS idx_bluray_specs_last_scraped ON bluray_technical_specs(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_bluray_specs_quality ON bluray_technical_specs(data_quality);

CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_priority ON scraping_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_retry_after ON scraping_queue(retry_after);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_user ON scraping_queue(requested_by_user_id);

CREATE INDEX IF NOT EXISTS idx_physical_collections_tech_specs ON physical_media_collections(technical_specs_id);

-- 5. Row Level Security
ALTER TABLE bluray_technical_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read technical specs" ON bluray_technical_specs;
DROP POLICY IF EXISTS "Service can write technical specs" ON bluray_technical_specs;
DROP POLICY IF EXISTS "Users can view own scraping requests" ON scraping_queue;
DROP POLICY IF EXISTS "Users can request scraping" ON scraping_queue;
DROP POLICY IF EXISTS "Service can update scraping queue" ON scraping_queue;

-- Create policies
CREATE POLICY "Authenticated users can read technical specs" ON bluray_technical_specs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service can write technical specs" ON bluray_technical_specs
  FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view own scraping requests" ON scraping_queue
  FOR SELECT USING (auth.uid() = requested_by_user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can request scraping" ON scraping_queue
  FOR INSERT WITH CHECK (auth.uid() = requested_by_user_id);

CREATE POLICY "Service can update scraping queue" ON scraping_queue
  FOR UPDATE TO service_role USING (true);

-- 6. Functions
CREATE OR REPLACE FUNCTION update_technical_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS update_bluray_specs_updated_at ON bluray_technical_specs;

CREATE TRIGGER update_bluray_specs_updated_at 
  BEFORE UPDATE ON bluray_technical_specs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_technical_specs_updated_at();

-- 7. Create/Replace View for collections with technical specs
DROP VIEW IF EXISTS collections_with_technical_specs;

CREATE VIEW collections_with_technical_specs AS
SELECT 
  pmc.*,
  bts.video_codec,
  bts.video_resolution,
  bts.hdr_format,
  bts.audio_codecs,
  bts.audio_channels,
  bts.region_codes,
  bts.special_features,
  bts.data_quality,
  bts.bluray_com_url,
  bts.last_scraped_at
FROM physical_media_collections pmc
LEFT JOIN bluray_technical_specs bts ON pmc.technical_specs_id = bts.id;