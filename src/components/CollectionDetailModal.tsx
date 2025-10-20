// src/components/CollectionDetailModal.tsx
// COMPLETE FIXED VERSION - Fetches OMDb data before insert + fixes click handler

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
  const { movies, addMovie, refetch } = useMovies('movie'); // ✅ ADD refetch
  const [addingMovies, setAddingMovies] = useState<Set<number>>(new Set());
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());

  // Get set of movies already in watchlist by IMDb ID
  const watchlistImdbIds = new Set(movies.map(m => m.imdb_id).filter(Boolean));

  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollectionDetails();
    }
  }, [isOpen, collectionId]);

  // Load watchlist movie TMDB IDs
  useEffect(() => {
    loadWatchlistMovieIds();
  }, [movies]);

  const loadWatchlistMovieIds = async () => {
    try {
      const tmdbIds = new Set<number>();
      
      for (const movie of movies) {
        if (movie.imdb_id) {
          // Get TMDB ID from IMDb ID
          const tmdbId = await getTMDBIdFromIMDbId(movie.imdb_id);
          if (tmdbId) {
            tmdbIds.add(tmdbId);
          }
        }
      }
      
      setWatchlistMovieIds(tmdbIds);
    } catch (error) {
      console.error('Error loading watchlist TMDB IDs:', error);
    }
  };

  const getTMDBIdFromIMDbId = async (imdbId: string): Promise<number | null> => {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.movie_results?.[0]?.id || null;
    } catch (error) {
      console.error('Error getting TMDB ID:', error);
      return null;
    }
  };

  const fetchCollectionDetails = async () => {
    setLoading(true);
    const data = await tmdbService.getCollectionDetails(collectionId);
    setCollection(data);
    setLoading(false);
  };

  // ✅ FIXED: Fetch complete OMDb data BEFORE inserting
  const handleAddToWatchlist = async (movie: TMDBCollectionPart) => {
    setAddingMovies(prev => new Set([...prev, movie.id]));
    
    try {
      console.log('[CollectionDetailModal] Adding movie:', movie.title);
      
      // Get IMDb ID from TMDB (using the helper function)
      const imdbId = await getIMDbIdFromTMDB(movie.id, 'movie');
      
      if (!imdbId) {
        console.warn('[CollectionDetailModal] No IMDb ID found for:', movie.title);
        // ✅ Continue anyway with TMDB ID fallback
      }
      
      // Fetch OMDb enrichment (if IMDb ID available)
      let omdbDetails = null;
      if (imdbId) {
        try {
          console.log('[CollectionDetailModal] Fetching OMDb data for:', movie.title, imdbId);
          omdbDetails = await omdbApi.getMovieDetails(imdbId);
        } catch (omdbError) {
          console.error('[CollectionDetailModal] OMDb fetch failed:', omdbError);
          // Continue without OMDb data
        }
      }
      
      // ✅ USE CENTRALIZED BUILDER
      const movieData = buildMovieFromOMDb(
        {
          title: movie.title,
          year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : undefined,
          imdb_id: imdbId || `tmdb_${movie.id}`, // Fallback to TMDB ID
          poster_url: movie.poster_path ? tmdbService.getImageUrl(movie.poster_path) : undefined,
          plot: movie.overview,
          imdb_score: movie.vote_average,
          media_type: 'movie',
          status: 'To Watch' // ✅ FIX: Changed from 'Plan to Watch' to match DB constraint
        },
        omdbDetails
      );

      // ✅ USE HOOK FOR INSERT
      await addMovie(movieData);
      
      console.log('[CollectionDetailModal] ✅ Movie added with complete data');
      
      // Refresh watchlist to update UI
      await refetch();
      await loadWatchlistMovieIds();
      
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

  const isInWatchlist = (movie: TMDBCollectionPart): boolean => {
    return watchlistMovieIds.has(movie.id);
  };

  // ✅ FIXED: Proper click handler for watchlist movies
  const handleCardClick = async (e: React.MouseEvent, movie: TMDBCollectionPart) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onMovieDetailsClick) {
      console.log('[CollectionDetailModal] No onMovieDetailsClick handler provided');
      return;
    }
    
    console.log('[CollectionDetailModal] Clicked watchlist title:', movie.title);
    
    // Fetch the movie from database to get full details
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CollectionDetailModal] No user found');
        return;
      }

      console.log('[CollectionDetailModal] Fetching movie from DB:', { title: movie.title, userId: user.id });

      const { data: dbMovie, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('title', movie.title)
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <Film className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">{collectionName}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : collection ? (
              <div className="p-6">
                {/* Collection Overview */}
                {collection.overview && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">About This Collection</h3>
                    <p className="text-slate-600 leading-relaxed">{collection.overview}</p>
                  </div>
                )}

                {/* Movies Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Movies in Collection ({collection.parts?.length || 0})
                  </h3>
                  // Replace the movie card rendering section in CollectionDetailModal.tsx
// Find the line that says: <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
// Replace everything from that div down to the closing </div> before "Movies Grid" section ends

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {collection.parts
                      .sort((a, b) => {
                        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
                        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
                        return dateA - dateB;
                      })
                      .map((movie) => {
                        const inWatchlist = isInWatchlist(movie);
                        const isAdding = addingMovies.has(movie.id);
                        const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id}`;
                        
                        // ✅ FIX: Use conditional rendering like MovieRecommendations
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

                                  {/* Watchlist Button */}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Already in watchlist, no action needed
                                    }}
                                    disabled={true}
                                    className="absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md bg-green-600 cursor-default"
                                    title="In watchlist"
                                  >
                                    <Plus className="h-4 w-4 text-white rotate-45" />
                                  </button>

                                  {/* Rating Badge */}
                                  {movie.vote_average > 0 && (
                                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                        <span className="text-white text-xs font-semibold">
                                          {movie.vote_average.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Movie Info */}
                                <div className="p-3">
                                  <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">
                                    {movie.title}
                                  </h4>
                                  {movie.release_date && (
                                    <div className="flex items-center text-xs text-slate-500">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(movie.release_date).getFullYear()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Not in watchlist - external link
                          return (
                            <a
                              key={movie.id}
                              href={tmdbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative block"
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
                                      if (!isAdding) {
                                        handleAddToWatchlist(movie);
                                      }
                                    }}
                                    disabled={isAdding}
                                    className={`absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all ${
                                      isAdding
                                        ? 'bg-slate-400 cursor-wait'
                                        : 'bg-white/90 hover:bg-white'
                                    }`}
                                    title={isAdding ? 'Adding...' : 'Add to watchlist'}
                                  >
                                    {isAdding ? (
                                      <div className="h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4 text-slate-600" />
                                    )}
                                  </button>

                                  {/* Rating Badge */}
                                  {movie.vote_average > 0 && (
                                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                        <span className="text-white text-xs font-semibold">
                                          {movie.vote_average.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Movie Info */}
                                <div className="p-3">
                                  <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">
                                    {movie.title}
                                  </h4>
                                  {movie.release_date && (
                                    <div className="flex items-center text-xs text-slate-500">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(movie.release_date).getFullYear()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </a>
                          );
                        }
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500">Failed to load collection details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}