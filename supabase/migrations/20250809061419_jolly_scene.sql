/*
  # Add OMDb API fields to movies table

  1. New Columns
    - `metascore` (integer) - Metascore rating
    - `imdb_votes` (text) - Number of IMDb votes
    - `runtime` (integer) - Runtime in minutes
    - `awards` (text) - Awards information
    - `box_office` (numeric) - Box office earnings
    - `production` (text) - Production company
    - `website` (text) - Official website
    - `plot` (text) - Full plot description
    - `rated` (text) - MPAA rating
    - `released` (text) - Release date
    - `language` (text) - Languages
    - `writer` (text) - Writers

  2. Column Updates
    - Update existing columns to match OMDb format
    - Ensure compatibility with existing data
*/

-- Add new OMDb-specific columns
DO $$
BEGIN
  -- Metascore rating
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'metascore'
  ) THEN
    ALTER TABLE movies ADD COLUMN metascore integer;
  END IF;

  -- IMDb votes count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'imdb_votes'
  ) THEN
    ALTER TABLE movies ADD COLUMN imdb_votes text;
  END IF;

  -- Runtime in minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'runtime'
  ) THEN
    ALTER TABLE movies ADD COLUMN runtime integer;
  END IF;

  -- Awards information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'awards'
  ) THEN
    ALTER TABLE movies ADD COLUMN awards text;
  END IF;

  -- Box office earnings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'box_office'
  ) THEN
    ALTER TABLE movies ADD COLUMN box_office numeric;
  END IF;

  -- Production company
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'production'
  ) THEN
    ALTER TABLE movies ADD COLUMN production text;
  END IF;

  -- Official website
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'website'
  ) THEN
    ALTER TABLE movies ADD COLUMN website text;
  END IF;

  -- Full plot description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'plot'
  ) THEN
    ALTER TABLE movies ADD COLUMN plot text;
  END IF;

  -- MPAA rating
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'rated'
  ) THEN
    ALTER TABLE movies ADD COLUMN rated text;
  END IF;

  -- Release date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'released'
  ) THEN
    ALTER TABLE movies ADD COLUMN released text;
  END IF;

  -- Languages
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'language'
  ) THEN
    ALTER TABLE movies ADD COLUMN language text;
  END IF;

  -- Writers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'writer'
  ) THEN
    ALTER TABLE movies ADD COLUMN writer text;
  END IF;

  -- Update tmdb_id column name to imdb_id for clarity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'tmdb_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'imdb_id'
  ) THEN
    ALTER TABLE movies RENAME COLUMN tmdb_id TO imdb_id;
    ALTER TABLE movies ALTER COLUMN imdb_id TYPE text;
  END IF;
END $$;