import { useState, useEffect } from 'react';
import { supabase, Movie } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useMovies(mediaType?: 'movie' | 'series') {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();
  
  console.log('[useMovies] Hook initialized with:', {
    mediaType,
    userId: user?.id,
    isAuthenticated,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'missing'
  });

  const fetchMovies = async () => {
    if (!isAuthenticated || !user) {
      console.log('[useMovies] User not authenticated, skipping fetch');
      setMovies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('[useMovies] Starting fetch with userId:', user.id);
      
      let query = supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id);
      
      if (mediaType) {
        query = query.eq('media_type', mediaType);
        console.log('[useMovies] Filtering by media_type:', mediaType);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('[useMovies] Supabase query result:', {
        data: data ? `${data.length} items` : 'null',
        error: error ? error.message : 'none',
        rawData: data
      });

      if (error) throw error;
      setMovies(data || []);
      console.log('[useMovies] Movies state updated:', data?.length || 0, 'items');
    } catch (err) {
      console.error('[useMovies] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch movies');
    } finally {
      setLoading(false);
    }
  };

  const addMovie = async (movie: Omit<Movie, 'id' | 'user_id' | 'user_session' | 'created_at'>) => {
    try {
      // Step 1: Get the current authenticated user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      // Step 2: Check if user is signed in
      if (authError || !currentUser) {
        console.error('[useMovies] User not authenticated:', authError);
        alert('Please sign in to add titles to your watchlist.');
        throw new Error('User not authenticated');
      }

      console.log('[useMovies] Adding movie:', movie.title, 'with userId:', currentUser.id, 'mediaType:', movie.media_type);
      
      // Step 3: Insert with user_id included (CRITICAL FIX)
      const { data, error } = await supabase
        .from('movies')
        .insert([{ 
          ...movie, 
          user_id: currentUser.id  // CRITICAL: Include authenticated user's ID
        }])
        .select()
        .single();

      // Step 4: Handle result
      if (error) {
        console.error('[useMovies] Supabase insert error:', error);
        alert(`Failed to add "${movie.title}" to watchlist. Please try again.`);
        throw error;
      }
      
      console.log('[useMovies] Movie added successfully:', data);
      alert(`"${movie.title}" added to your watchlist!`);
      
      // Only add to local state if it matches the current filter
      if (!mediaType || data.media_type === mediaType) {
        setMovies(prev => [data, ...prev]);
        console.log('[useMovies] Added to local state, new count:', movies.length + 1);
      } else {
        console.log('[useMovies] Not adding to local state due to media type filter');
      }
      return data;
    } catch (err) {
      console.error('[useMovies] Add movie error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add movie';
      setError(errorMessage);
      throw err;
    }
  };

  const updateMovie = async (id: string, updates: Partial<Movie>) => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be authenticated to update movies');
    }

    try {
      // Add timestamp tracking for specific field updates
      const timestampedUpdates = { ...updates };
      
      if ('status' in updates) {
        timestampedUpdates.status_updated_at = new Date().toISOString();
        
        // Clear date_watched if status is changed away from "Watched"
        if (updates.status !== 'Watched' && updates.status !== 'To Watch Again') {
          timestampedUpdates.date_watched = null;
        }
      }
      
      if ('user_rating' in updates) {
        timestampedUpdates.rating_updated_at = new Date().toISOString();
      }

      // Log the update for debugging
      console.log('[useMovies] Updating movie with:', timestampedUpdates);

      const { data, error } = await supabase
        .from('movies')
        .update(timestampedUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[useMovies] Supabase update error:', error);
        throw error;
      }
      
      console.log('[useMovies] Movie updated successfully:', data);
      
      // Update local state if the movie matches current filter
      if (!mediaType || data.media_type === mediaType) {
        setMovies(prev => prev.map(movie => movie.id === id ? data : movie));
      } else {
        // Remove from local state if media type changed and no longer matches filter
        setMovies(prev => prev.filter(movie => movie.id !== id));
      }
      return data;
    } catch (err) {
      console.error('[useMovies] Update movie error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update movie');
      throw err;
    }
  };

  const deleteMovie = async (id: string) => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be authenticated to delete movies');
    }

    try {
      console.log('[useMovies] Deleting movie with id:', id, 'userId:', user.id);
      
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setMovies(prev => prev.filter(movie => movie.id !== id));
      console.log('[useMovies] Movie deleted successfully');
    } catch (err) {
      console.error('[useMovies] Delete movie error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete movie');
      throw err;
    }
  };

  const isMovieInWatchlist = (imdbId: string): boolean => {
    return movies.some(movie => movie.imdb_id === imdbId);
  };

  useEffect(() => {
    console.log('[useMovies] useEffect triggered, calling fetchMovies', { isAuthenticated, userId: user?.id });
    fetchMovies();
  }, [mediaType, user?.id, isAuthenticated]);

  return {
    movies,
    loading,
    error,
    addMovie,
    updateMovie,
    deleteMovie,
    isMovieInWatchlist,
    refetch: fetchMovies
  };
}