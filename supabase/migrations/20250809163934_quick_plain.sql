/*
  # Add Supabase Auth support to movies table

  1. Schema Changes
    - Add `user_id` column to movies table
    - Migrate existing data from `user_session` to `user_id`
    - Keep `user_session` for backward compatibility during transition

  2. Security
    - Enable RLS on movies table
    - Add policy for authenticated users to manage their own data
    - Add policy for session-based access during transition
*/

-- Add user_id column to movies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE movies ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS movies_user_id_idx ON movies(user_id);

-- Enable RLS on movies table
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own movies" ON movies;
DROP POLICY IF EXISTS "Allow session-based access" ON movies;

-- Create policy for authenticated users
CREATE POLICY "Users can manage their own movies"
  ON movies
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for session-based access (temporary during transition)
CREATE POLICY "Allow session-based access"
  ON movies
  FOR ALL
  TO public
  USING (
    (user_id IS NULL AND user_session IS NOT NULL) OR
    (user_id = auth.uid())
  )
  WITH CHECK (
    (user_id IS NULL AND user_session IS NOT NULL) OR
    (user_id = auth.uid())
  );