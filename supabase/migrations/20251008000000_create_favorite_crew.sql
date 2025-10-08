-- Create favorite_crew table
CREATE TABLE IF NOT EXISTS favorite_crew (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_person_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  profile_path TEXT,
  job TEXT NOT NULL,
  department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tmdb_person_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_favorite_crew_user_id ON favorite_crew(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_crew_tmdb_person_id ON favorite_crew(tmdb_person_id);
CREATE INDEX IF NOT EXISTS idx_favorite_crew_job ON favorite_crew(user_id, job);

-- Enable RLS
ALTER TABLE favorite_crew ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite crew" ON favorite_crew
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite crew" ON favorite_crew
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite crew" ON favorite_crew
  FOR DELETE USING (auth.uid() = user_id);