-- Update custom collections to reference movies table instead of physical_media_collection

-- 1. Drop existing foreign key constraint
ALTER TABLE collection_items_custom_collections 
  DROP CONSTRAINT IF EXISTS collection_items_custom_collections_collection_item_id_fkey;

-- 2. Update the column comment/reference
COMMENT ON COLUMN collection_items_custom_collections.collection_item_id 
  IS 'References movies.id (watchlist items)';

-- 3. Add new foreign key constraint pointing to movies table
ALTER TABLE collection_items_custom_collections
  ADD CONSTRAINT collection_items_custom_collections_movie_id_fkey 
  FOREIGN KEY (collection_item_id) 
  REFERENCES movies(id) 
  ON DELETE CASCADE;

-- 4. Optionally: If you want to rename the column for clarity (recommended)
-- ALTER TABLE collection_items_custom_collections 
--   RENAME COLUMN collection_item_id TO movie_id;

-- 5. Update any existing data if needed (only if there's data to migrate)
-- This depends on your current state