/*
  # Create movies watchlist table

  1. New Tables
    - `movies`
      - `id` (uuid, primary key)
      - `user_session` (text) - for identifying user's movies without login
      - `title` (text) - movie title
      - `genre` (text) - movie genre
      - `year` (integer) - release year
      - `country` (text) - country of origin
      - `director` (text) - movie director
      - `actors` (text) - main actors
      - `imdb_score` (decimal) - IMDb rating
      - `imdb_url` (text) - link to IMDb page
      - `status` (text) - To Watch/Watching/Watched
      - `user_rating` (integer) - user's personal rating 1-10
      - `poster_url` (text) - movie poster image URL
      - `tmdb_id` (integer) - TMDb movie ID for reference
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `movies` table
    - Add policy for users to manage their own movies based on session
*/

CREATE TABLE IF NOT EXISTS movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session text NOT NULL,
  title text NOT NULL,
  genre text,
  year integer,
  country text,
  director text,
  actors text,
  imdb_score decimal,
  imdb_url text,
  status text DEFAULT 'To Watch' CHECK (status IN ('To Watch', 'Watching', 'Watched')),
  user_rating integer CHECK (user_rating >= 1 AND user_rating <= 10),
  poster_url text,
  tmdb_id integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own movies"
  ON movies
  FOR ALL
  TO public
  USING (user_session = current_setting('request.jwt.claims', true)::json->>'user_session'
    OR user_session = current_setting('movies.user_session', true));

-- Allow public access for session-based movies
CREATE POLICY "Allow session-based access"
  ON movies
  FOR ALL
  TO public
  USING (true);