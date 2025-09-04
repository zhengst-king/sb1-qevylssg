/*
  # Add date_watched column to movies table

  1. New Columns
    - `date_watched` (date, optional) - tracks when user watched the movie
  
  2. Changes
    - Add conditional date field that only applies when status is "Watched"
    - Field is nullable since it only applies to watched movies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'date_watched'
  ) THEN
    ALTER TABLE movies ADD COLUMN date_watched date;
  END IF;
END $$;