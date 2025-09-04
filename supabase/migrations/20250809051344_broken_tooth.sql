/*
  # Add timestamp tracking columns to movies table

  1. New Columns
    - `status_updated_at` (timestamp) - tracks when status was last changed
    - `rating_updated_at` (timestamp) - tracks when user rating was last changed  
    - `last_modified_at` (timestamp) - general timestamp for any movie record updates

  2. Updates
    - Add columns with proper defaults
    - Create trigger to automatically update last_modified_at on any row change
    - Ensure timezone handling with timestamptz type

  3. Notes
    - Uses timestamptz for timezone awareness
    - Includes automatic trigger for last_modified_at updates
    - Safe column additions with IF NOT EXISTS checks
*/

-- Add timestamp tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'status_updated_at'
  ) THEN
    ALTER TABLE movies ADD COLUMN status_updated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'rating_updated_at'
  ) THEN
    ALTER TABLE movies ADD COLUMN rating_updated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'last_modified_at'
  ) THEN
    ALTER TABLE movies ADD COLUMN last_modified_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace function to update last_modified_at
CREATE OR REPLACE FUNCTION update_last_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic last_modified_at updates
DROP TRIGGER IF EXISTS update_movies_last_modified_at ON movies;
CREATE TRIGGER update_movies_last_modified_at
  BEFORE UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION update_last_modified_at();