-- Optional migration to add Netflix-specific tracking fields
-- Create this file: supabase/migrations/20250109000000_netflix_import_fields.sql

/*
  # Add Netflix import tracking fields

  1. New Columns
    - `netflix_id` (text) - Original Netflix video ID
    - `netflix_title` (text) - Original Netflix title (in case it differs)
    - `netflix_synopsis` (text) - Netflix description/synopsis
    - `import_source` (text) - Track where the title was imported from
    - `enrichment_status` (text) - Track OMDb enrichment success/failure
    - `import_date` (timestamptz) - When the title was imported

  2. Notes
    - All fields are optional
    - Helps with debugging import issues
    - Useful for future Netflix API changes
*/

DO $$
BEGIN
  -- Netflix video ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'netflix_id'
  ) THEN
    ALTER TABLE movies ADD COLUMN netflix_id text;
  END IF;

  -- Original Netflix title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'netflix_title'
  ) THEN
    ALTER TABLE movies ADD COLUMN netflix_title text;
  END IF;

  -- Netflix synopsis
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'netflix_synopsis'
  ) THEN
    ALTER TABLE movies ADD COLUMN netflix_synopsis text;
  END IF;

  -- Import source tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'import_source'
  ) THEN
    ALTER TABLE movies ADD COLUMN import_source text;
  END IF;

  -- Enrichment status tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'enrichment_status'
  ) THEN
    ALTER TABLE movies ADD COLUMN enrichment_status text;
  END IF;

  -- Import date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'import_date'
  ) THEN
    ALTER TABLE movies ADD COLUMN import_date timestamptz;
  END IF;
END $$;

-- Add check constraint for enrichment status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'movies_enrichment_status_check'
  ) THEN
    ALTER TABLE movies ADD CONSTRAINT movies_enrichment_status_check 
    CHECK (enrichment_status IN ('success', 'failed', 'not_found') OR enrichment_status IS NULL);
  END IF;
END $$;