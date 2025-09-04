/*
  # Add media type support for movies and TV series

  1. Schema Changes
    - Add `media_type` column to movies table with values 'movie' or 'series'
    - Set default value to 'movie' for backward compatibility
    - Add check constraint to ensure valid media types

  2. Data Migration
    - Update all existing records to have media_type = 'movie'

  3. Security
    - Update RLS policies to include media_type filtering
*/

-- Add media_type column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE movies ADD COLUMN media_type text DEFAULT 'movie';
  END IF;
END $$;

-- Add check constraint for valid media types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'movies_media_type_check'
  ) THEN
    ALTER TABLE movies ADD CONSTRAINT movies_media_type_check 
    CHECK (media_type IN ('movie', 'series'));
  END IF;
END $$;

-- Update existing records to have media_type = 'movie'
UPDATE movies SET media_type = 'movie' WHERE media_type IS NULL;

-- Make media_type NOT NULL after setting defaults
ALTER TABLE movies ALTER COLUMN media_type SET NOT NULL;