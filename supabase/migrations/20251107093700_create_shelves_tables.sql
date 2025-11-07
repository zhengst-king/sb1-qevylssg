-- Migration: Create shelves/collections tables for Media Library organization
-- Date: 2025-11-06

-- 1. Shelves table - User-created collections/shelves
CREATE TABLE shelves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT, -- Optional custom cover image URL
  sort_order INTEGER DEFAULT 0, -- For user-defined shelf ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate shelf names per user
  UNIQUE(user_id, name)
);

-- 2. Shelf items junction table - Many-to-many relationship
CREATE TABLE shelf_items (
  shelf_id UUID REFERENCES shelves(id) ON DELETE CASCADE NOT NULL,
  library_item_id UUID REFERENCES physical_media_collections(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER DEFAULT 0, -- Order within the shelf
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (shelf_id, library_item_id)
);

-- 3. Indexes for performance
CREATE INDEX idx_shelves_user_id ON shelves(user_id);
CREATE INDEX idx_shelves_sort_order ON shelves(user_id, sort_order);
CREATE INDEX idx_shelf_items_shelf_id ON shelf_items(shelf_id);
CREATE INDEX idx_shelf_items_library_item_id ON shelf_items(library_item_id);

-- 4. Row Level Security for shelves
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shelves" ON shelves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shelves" ON shelves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shelves" ON shelves
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shelves" ON shelves
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Row Level Security for shelf_items
ALTER TABLE shelf_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shelf items" ON shelf_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shelves 
      WHERE shelves.id = shelf_items.shelf_id 
      AND shelves.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own shelf items" ON shelf_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shelves 
      WHERE shelves.id = shelf_items.shelf_id 
      AND shelves.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own shelf items" ON shelf_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM shelves 
      WHERE shelves.id = shelf_items.shelf_id 
      AND shelves.user_id = auth.uid()
    )
  );

-- 6. Auto-update timestamp trigger for shelves
CREATE TRIGGER update_shelves_updated_at 
  BEFORE UPDATE ON shelves 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Function to get shelf item count
CREATE OR REPLACE FUNCTION get_shelf_item_count(shelf_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM shelf_items 
  WHERE shelf_id = shelf_uuid;
$$ LANGUAGE SQL STABLE;

-- 8. Function to get library item's shelves
CREATE OR REPLACE FUNCTION get_item_shelves(item_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  shelf_id UUID,
  shelf_name TEXT,
  added_at TIMESTAMP WITH TIME ZONE
) AS $$
  SELECT s.id, s.name, si.added_at
  FROM shelves s
  INNER JOIN shelf_items si ON s.id = si.shelf_id
  WHERE si.library_item_id = item_uuid
  AND s.user_id = user_uuid
  ORDER BY s.name;
$$ LANGUAGE SQL STABLE;