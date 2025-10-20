// src/components/CollectionDetailModal.tsx
// OPTIMIZED VERSION - Uses tmdb_id column to avoid API calls

import React, { useEffect, useState } from 'react';
import { X, Film, Plus, Calendar, Star } from 'lucide-react';
import { tmdbService, TMDBCollection, TMDBCollectionPart } from '../lib/tmdb';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';
import { buildMovieFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder';

interface CollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  collectionName: string;
  onMovieDetailsClick?: (movie: Movie) => void;
}

export function CollectionDetailModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  onMovieDetailsClick
}: CollectionDetailModalProps) {
  const [collection, setCollection] = useState<TMDBCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const { movies, addMovie, removeMovie, refetch } = useMovies('movie');
  const [addingMovies, setAddingMovies] = useState<Set<number>>(new Set());
  const [removingMovies, setRemovingMovies] = useState<Set<number>>(new Set());
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollectionDetails();
    }
  }, [isOpen, collectionId]);

  // ✅ OPTIMIZED: Load watchlist TMDB IDs directly from database
  useEffect(() => {
    loadWatchlistMovieIds();
  }, [movies]);

  const loadWatchlistMovieIds = () => {
    // Simple and fast: just use tmdb_id from database
    const tmdbIds = new Set<number>();
    
    for (const movie of movies) {
      if (movie.tmdb_id) {
        tmdbIds.add(movie.tmdb_id);
      }
    }
    
    setWatchlistMovieIds(tmdbIds);
    console.log('[CollectionDetailModal] Loaded watchlist TMDB IDs:', tmdbIds.size);
  };

  const fetchCollectionDetails = async () => {
    setLoading(true);
    const data = await tmdbService.getCollectionDetails(collectionId);
    setCollection(data);
    setLoading(false);
  };

  // ✅ OPTIMIZED: Add movie with tmdb_id
  const handleAddToWatchlist = async (movie: TMDBCollectionPart) => {
    setAddingMovies(prev => new Set([...prev, movie.id]));
    
    try {
      console.log('[CollectionDetailModal] Adding movie:', movie.title);
      
      // Get IMDb ID from TMDB
      const imdbId = await getIMDbIdFromTMDB(movie.id, 'movie');
      
      if (!imdbId) {
        console.warn('[CollectionDetailModal] No IMDb ID found for:', movie.title);
      }
      
      // Fetch OMDb enrichment (if IMDb ID available)
      let omdbDetails = null;
      if (imdbId) {
        try {
          console.log('[CollectionDetailModal] Fetching OMDb data for:', movie.title, imdbId);
          omdbDetails = await omdbApi.getMovieDetails(imdbId);
        } catch (omdbError) {
          console.error('[CollectionDetailModal] OMDb fetch failed:', omdbError);
        }
      }
      
      // ✅ BUILD WITH BOTH IDs
      const movieData = buildMovieFromOMDb(
        {
          title: movie.title,
          year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : undefined,
          imdb_id: imdbId || `tmdb_${movie.id}`,
          tmdb_id: movie.id, // ✅ ADD TMDB ID
          poster_url: movie.poster_path ? tmdbService.getImageUrl(movie.poster_path) : undefined,
          plot: movie.overview,
          imdb_score: movie.vote_average,
          media_type: 'movie',
          status: 'To Watch'
        },
        omdbDetails
      );

      await addMovie(movieData);
      
      console.log('[CollectionDetailModal] ✅ Movie added with tmdb_id:', movie.id);
      
      // Refresh watchlist to update UI
      await refetch();
      loadWatchlistMovieIds();
      
    } catch (error) {
      console.error('[CollectionDetailModal] Error adding movie to watchlist:', error);
      alert(`Failed to add "${movie.title}" to watchlist. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setAddingMovies(prev => {
        const newSet = new Set(prev);
        newSet.delete(movie.id);
        return newSet;
      });
    }
  };

  // ✅ OPTIMIZED: Remove movie using tmdb_id
  const handleRemoveFromWatchlist = async (movie: TMDBCollectionPart) => {
    setRemovingMovies(prev => new Set([...prev, movie.id]));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CollectionDetailModal] No user found');
        return;
      }

      console.log('[CollectionDetailModal] Removing movie by tmdb_id:', movie.id);

      // ✅ OPTIMIZED: Query by tmdb_id directly
      const { data: dbMovie, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('tmdb_id', movie.id)
        .eq('media_type', 'movie')
        .maybeSingle();

      if (error) {
        console.error('[CollectionDetailModal] Error fetching movie:', error);
        throw error;
      }

      if (!dbMovie) {
        console.error('[CollectionDetailModal] Movie not found in watchlist');
        throw new Error('Movie not found in watchlist');
      }

      console.log('[CollectionDetailModal] Found movie to remove:', dbMovie.title);
      await removeMovie(dbMovie.id);
      
      console.log('[CollectionDetailModal] ✅ Movie removed');
      
      // Refresh watchlist
      await refetch();
      loadWatchlistMovieIds();
      
    } catch (error) {
      console.error('[CollectionDetailModal] Error removing movie:', error);
      alert(`Failed to remove "${movie.title}" from watchlist. Please try again.`);
    } finally {
      setRemovingMovies(prev => {
        const newSet = new Set(prev);
        newSet.delete(movie.id);
        return newSet;
      });
    }
  };

  const isInWatchlist = (movie: TMDBCollectionPart): boolean => {
    return watchlistMovieIds.has(movie.id);
  };

  // ✅ OPTIMIZED: Click handler using tmdb_id
  const handleCardClick = async (e: React.MouseEvent, movie: TMDBCollectionPart) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onMovieDetailsClick) {
      console.log('[CollectionDetailModal] No onMovieDetailsClick handler provided');
      return;
    }
    
    console.log('[CollectionDetailModal] Clicked watchlist title:', movie.title);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CollectionDetailModal] No user found');
        return;
      }

      console.log('[CollectionDetailModal] Fetching movie from DB by tmdb_id:', movie.id);

      // ✅ OPTIMIZED: Query by tmdb_id
      const { data: dbMovie, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('tmdb_id', movie.id)
        .eq('media_type', 'movie')
        .single();

      console.log('[CollectionDetailModal] Query result:', { dbMovie, error });

      if (error) {
        console.error('[CollectionDetailModal] Error fetching movie:', error);
        alert(`Could not find "${movie.title}" in your watchlist.`);
        return;
      }

      if (dbMovie) {
        console.log('[CollectionDetailModal] Opening movie details modal for:', dbMovie.title);
        onMovieDetailsClick(dbMovie);
      } else {
        console.log('[CollectionDetailModal] No movie found in database');
        alert(`Could not find "${movie.title}" in your watchlist.`);
      }
    } catch (error) {
      console.error('[CollectionDetailModal] Error in handleCardClick:', error);
      alert('An error occurred while trying to open movie details.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{collectionName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : collection ? (
            <div>
              {/* Collection Overview */}
              {collection.overview && (
                <p className="text-slate-600 mb-6">{collection.overview}</p>
              )}

              {/* Movies Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {collection.parts
                  .sort((a, b) => {
                    const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
                    const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
                    return dateA - dateB;
                  })
                  .map((movie) => {
                    const inWatchlist = isInWatchlist(movie);
                    const isAdding = addingMovies.has(movie.id);
                    const isRemoving = removingMovies.has(movie.id);
                    const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id}`;
                    
                    if (inWatchlist) {
                      // Watchlist movie - clickable div
                      return (
                        <div
                          key={movie.id}
                          onClick={(e) => handleCardClick(e, movie)}
                          className="group relative cursor-pointer"
                        >
                          <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* Poster */}
                            <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
                              {movie.poster_path ? (
                                <img
                                  src={tmdbService.getImageUrl(movie.poster_path, 'w342')}
                                  alt={movie.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="h-12 w-12 text-slate-400" />
                                </div>
                              )}

                              {/* Remove from Watchlist Button */}
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await handleRemoveFromWatchlist(movie);
                                }}
                                disabled={isRemoving}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                title="Remove from watchlist"
                              >
                                {isRemoving ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            </div>

                            {/* Movie Info */}
                            <div className="p-3">
                              <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
                                {movie.title}
                              </h3>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                {movie.release_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{movie.release_date.substring(0, 4)}</span>
                                  </div>
                                )}
                                {movie.vote_average > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{movie.vote_average.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Non-watchlist movie - link to TMDB with add button
                      return (
                        <div key={movie.id} className="group relative">
                          <a
                            href={tmdbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                              {/* Poster */}
                              <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
                                {movie.poster_path ? (
                                  <img
                                    src={tmdbService.getImageUrl(movie.poster_path, 'w342')}
                                    alt={movie.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Film className="h-12 w-12 text-slate-400" />
                                  </div>
                                )}

                                {/* Add to Watchlist Button */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddToWatchlist(movie);
                                  }}
                                  disabled={isAdding}
                                  className="absolute top-2 right-2 p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                  title="Add to watchlist"
                                >
                                  {isAdding ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </button>
                              </div>

                              {/* Movie Info */}
                              <div className="p-3">
                                <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
                                  {movie.title}
                                </h3>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  {movie.release_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{movie.release_date.substring(0, 4)}</span>
                                    </div>
                                  )}
                                  {movie.vote_average > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span>{movie.vote_average.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </a>
                        </div>
                      );
                    }
                  })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600">Failed to load collection details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}