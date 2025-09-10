-- Migration: Create technical specifications tables and queue system

-- 1. Technical Specifications Cache Table
CREATE TABLE bluray_technical_specs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identification
  title TEXT NOT NULL,
  year INTEGER,
  imdb_id TEXT,
  bluray_com_url TEXT,
  
  -- Video Specifications
  video_codec TEXT, -- "HEVC / H.265", "AVC / H.264"
  video_resolution TEXT, -- "2160p", "1080p", "720p"
  hdr_format TEXT[], -- ["HDR10", "Dolby Vision", "HDR10+"]
  aspect_ratio TEXT, -- "2.39:1", "1.78:1"
  frame_rate TEXT, -- "23.976 fps", "29.97 fps"
  
  -- Audio Specifications
  audio_codecs TEXT[], -- ["Dolby Atmos", "DTS-X", "DTS-HD MA"]
  audio_channels TEXT[], -- ["7.1", "5.1", "2.0"]
  audio_languages TEXT[], -- ["English", "French", "Spanish"]
  
  -- Disc Information
  disc_format TEXT NOT NULL, -- "4K Ultra HD Blu-ray", "Blu-ray", "DVD"
  region_codes TEXT[], -- ["A", "B", "C"]
  disc_count INTEGER DEFAULT 1,
  studio TEXT,
  distributor TEXT,
  
  -- Additional Information
  special_features TEXT[], -- Array of special features
  subtitles TEXT[], -- ["English SDH", "French", "Spanish"]
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
CREATE TABLE scraping_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Job Information
  title TEXT NOT NULL,
  year INTEGER,
  imdb_id TEXT,
  search_query TEXT,
  
  -- Job Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')) DEFAULT 'pending',
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
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

-- 3. Create Indexes
CREATE INDEX idx_bluray_specs_title_year ON bluray_technical_specs(title, year);
CREATE INDEX idx_bluray_specs_imdb_id ON bluray_technical_specs(imdb_id);
CREATE INDEX idx_bluray_specs_last_scraped ON bluray_technical_specs(last_scraped_at);
CREATE INDEX idx_bluray_specs_quality ON bluray_technical_specs(data_quality);

CREATE INDEX idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX idx_scraping_queue_priority ON scraping_queue(priority DESC, created_at ASC);
CREATE INDEX idx_scraping_queue_retry_after ON scraping_queue(retry_after);
CREATE INDEX idx_scraping_queue_user ON scraping_queue(requested_by_user_id);

-- 4. Row Level Security
ALTER TABLE bluray_technical_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_queue ENABLE ROW LEVEL SECURITY;

-- Technical specs are readable by all authenticated users (shared cache)
CREATE POLICY "Authenticated users can read technical specs" ON bluray_technical_specs
  FOR SELECT TO authenticated USING (true);

-- Only service accounts can write technical specs
CREATE POLICY "Service can write technical specs" ON bluray_technical_specs
  FOR ALL TO service_role USING (true);

-- Users can view their own scraping requests
CREATE POLICY "Users can view own scraping requests" ON scraping_queue
  FOR SELECT USING (auth.uid() = requested_by_user_id OR auth.role() = 'service_role');

-- Users can insert scraping requests
CREATE POLICY "Users can request scraping" ON scraping_queue
  FOR INSERT WITH CHECK (auth.uid() = requested_by_user_id);

-- Only service can update scraping queue
CREATE POLICY "Service can update scraping queue" ON scraping_queue
  FOR UPDATE TO service_role USING (true);

-- 5. Functions
CREATE OR REPLACE FUNCTION update_technical_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bluray_specs_updated_at 
  BEFORE UPDATE ON bluray_technical_specs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_technical_specs_updated_at();

-- 6. Link collections to technical specs
ALTER TABLE physical_media_collections 
ADD COLUMN technical_specs_id UUID REFERENCES bluray_technical_specs(id);

CREATE INDEX idx_physical_collections_tech_specs ON physical_media_collections(technical_specs_id);

-- 7. View for collections with technical specs
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