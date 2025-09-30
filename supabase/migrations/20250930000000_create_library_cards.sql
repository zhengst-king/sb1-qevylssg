-- Migration: Create user library cards table
-- Allows users to store their library card information for quick access

CREATE TABLE IF NOT EXISTS user_library_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Library Info
  library_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  library_system TEXT NOT NULL CHECK (library_system IN ('public', 'university', 'school', 'special', 'other')),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate library cards
  UNIQUE(user_id, library_name, card_number)
);

-- Indexes
CREATE INDEX idx_user_library_cards_user_id ON user_library_cards(user_id);

-- Row Level Security
ALTER TABLE user_library_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own library cards" ON user_library_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own library cards" ON user_library_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library cards" ON user_library_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own library cards" ON user_library_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_user_library_cards_updated_at
  BEFORE UPDATE ON user_library_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_library_cards IS 'User library card information for quick access to digital library services';