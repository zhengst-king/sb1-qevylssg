-- Migration: Create physical media collections and specs cache tables

-- 1. Physical Media Collections Table
CREATE TABLE physical_media_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Core movie data
  imdb_id TEXT,
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  director TEXT,
  poster_url TEXT,
  
  -- Physical collection specific fields
  format TEXT NOT NULL CHECK (format IN ('DVD', 'Blu-ray', '4K UHD', '3D Blu-ray')),
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  purchase_location TEXT,
  condition TEXT NOT NULL DEFAULT 'New' CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
  
  -- User metadata
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate formats per user
  UNIQUE(user_id, imdb_id, format)
);

-- 2. Create indexes
CREATE INDEX idx_physical_collections_user_id ON physical_media_collections(user_id);
CREATE INDEX idx_physical_collections_imdb_id ON physical_media_collections(imdb_id);
CREATE INDEX idx_physical_collections_format ON physical_media_collections(format);

-- 3. Row Level Security
ALTER TABLE physical_media_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections" ON physical_media_collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections" ON physical_media_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON physical_media_collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" ON physical_media_collections
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_physical_collections_updated_at 
  BEFORE UPDATE ON physical_media_collections 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();