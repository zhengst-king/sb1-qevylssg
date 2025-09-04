/*
  # Add user review column to movies table

  1. New Column
    - `user_review` (text, nullable) - stores user's movie review text

  2. Notes
    - Column is optional since not all movies will have reviews
    - No length constraints at database level for flexibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'user_review'
  ) THEN
    ALTER TABLE movies ADD COLUMN user_review text;
  END IF;
END $$;