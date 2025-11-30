// src/components/CollectionDetailModal.tsx
// REFACTORED VERSION - Uses AddToWatchlistButton component

import React, { useEffect, useState } from 'react';
import { X, Film, Calendar, Star, Layers, Check, ExternalLink } from 'lucide-react';
import { tmdbService, TMDBCollection, TMDBCollectionPart } from '../lib/tmdb';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useCustomCollections } from '../hooks/useCustomCollections';
import type { CustomCollection } from '../types/customCollections';
import { tmdbCacheService } from '../services/tmdbCacheService';
import { CustomCollectionsModal } from './CustomCollectionsModal';
import { customCollectionsService } from '../services/customCollectionsService';
import { AddToWatchlistButton } from './AddToWatchlistButton'; // ✅ NEW IMPORT

interface CollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  collectionName: string;
  onMovieDetailsClick?: (movie: Movie) => void;
  onCollectionsUpdated?: () => void;
}

export function CollectionDetailModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  onMovieDetailsClick,
  onCollectionsUpdated
}: CollectionDetailModalProps) {
  const [collection, setCollection] = useState<TMDBCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const { movies, refetch } = useMovies('movie'); // ✅ REMOVED: addMovie (no longer needed)
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());
  
  // Custom Collections state
  const { collections: customCollections } = useCustomCollections();
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollections, setAddingToCollections] = useState(false);

  // Handle ESC key - only close if no child modals are open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showCollectionSelector) {
        // Check if movie details modal is open by checking DOM
        const movieDetailsModal = document.querySelector('[data-modal="movie-details"]');
        if (!movieDetailsModal) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, showCollectionSelector, onClose]);

  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollectionDetails();
    }
  }, [isOpen, collectionId]);

  // Load watchlist movie TMDB IDs
  useEffect(() => {
    loadWatchlistMovieIds();
  }, [movies]);

  const loadWatchlistMovieIds = () => {
    // Use tmdb_id directly from database - no API calls needed
    const tmdbIds = new Set<number>();
    
    for (const movie of movies) {
      if (movie.tmdb_id) {
        tmdbIds.add(movie.tmdb_id);
      }
    }
    
    setWatchlistMovieIds(tmdbIds);
    console.log('[CollectionDetailModal] Loaded', tmdbIds.size, 'watchlist TMDB IDs');
  };

  // Update fetchCollectionDetails
  const fetchCollectionDetails = async () => {
    setLoading(true);
    const data = await tmdbService.getCollectionDetails(collectionId);
    setCollection(data);
  
    // Cache all movies in this collection for future use
    if (data?.parts) {
      tmdbCacheService.cacheCollectionMovies(collectionId).catch(err => 
        console.error('Background cache failed:', err)
      );
    }
  
    setLoading(false);
  };

  // ✅ REMOVED: handleAddToWatchlist function (lines 91-148)
  // This is now handled by AddToWatchlistButton component

  const isInWatchlist = (movie: TMDBCollectionPart): boolean => {
    return watchlistMovieIds.has(movie.id);
  };

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

      console.log('[CollectionDetailModal] Fetching movie from DB:', { title: movie.title, userId: user.id });

      const { data: dbMovie, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('tmdb_id', movie.id)
        .eq('media_type', 'movie')
        .maybeSingle();

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

  const handleAddToCollection = async (movie: TMDBCollectionPart) => {
    if (!customCollections || customCollections.length === 0) {
      alert('No custom collections found. Please create a collection first.');
      return;
    }

    // Reset selection state
    setSelectedCollections(new Set());
    
    // Find which collections this movie is already in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get movie's watchlist ID if it exists
      const { data: watchlistMovie } = await supabase
        .from('movies')
        .select('id')
        .eq('user_id', user.id)
        .eq('tmdb_id', movie.id)
        .eq('media_type', 'movie')
        .maybeSingle();

      if (watchlistMovie) {
        // Check which collections already have this item
        const { data: existingCollections } = await supabase
          .from('collection_items_custom_collections')
          .select('custom_collection_id')
          .eq('collection_item_id', watchlistMovie.id);

        if (existingCollections) {
          const existingIds = new Set(existingCollections.map(ec => ec.custom_collection_id));
          setSelectedCollections(existingIds);
        }
      }
    } catch (error) {
      console.error('Error loading existing collections:', error);
    }

    setShowCollectionSelector(true);
  };

  const handleSaveToCollections = async (movie: TMDBCollectionPart) => {
    setAddingToCollections(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create watchlist entry
      let watchlistId = null;
      
      const { data: existingMovie } = await supabase
        .from('movies')
        .select('id')
        .eq('user_id', user.id)
        .eq('tmdb_id', movie.id)
        .eq('media_type', 'movie')
        .maybeSingle();

      if (existingMovie) {
        watchlistId = existingMovie.id;
      }

      // Add to selected collections
      for (const collectionId of selectedCollections) {
        try {
          if (watchlistId) {
            await customCollectionsService.addItemToCollection(watchlistId, collectionId);
          } else {
            // Add as TMDB reference if not in watchlist
            const { error } = await supabase
              .from('collection_items_custom_collections')
              .insert([{
                custom_collection_id: collectionId,
                tmdb_id: movie.id,
                collection_item_id: null
              }]);

            if (error) throw error;
          }
        } catch (error) {
          console.error('Error adding to collection:', error);
        }
      }

      setShowCollectionSelector(false);
      
      if (onCollectionsUpdated) {
        onCollectionsUpdated();
      }

    } catch (error) {
      console.error('Error saving to collections:', error);
      alert('Failed to save to collections. Please try again.');
    } finally {
      setAddingToCollections(false);
    }
  };

  // Handle background click to close
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
      onClick={handleBackgroundClick}
    >
      <div className="min-h-screen px-4 py-8" onClick={handleBackgroundClick}>
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-6xl mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Layers className="h-6 w-6 text-purple-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{collectionName}</h2>
                  <div className="flex items-center space-x-3">
                    <p className="text-sm text-slate-500">
                      {collection?.parts?.length || 0} movies
                    </p>
                    <a
                      href={`https://www.themoviedb.org/collection/${collectionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>View on TMDB</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : !collection ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Failed to load collection details.</p>
              </div>
            ) : (
              <>
                {/* Collection Overview */}
                {collection.overview && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <p className="text-slate-700 leading-relaxed">{collection.overview}</p>
                  </div>
                )}

                {/* Movies Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {collection.parts
                    .sort((a, b) => {
                      const dateA = a.release_date || '';
                      const dateB = b.release_date || '';
                      return dateA.localeCompare(dateB);
                    })
                    .map((movie) => {
                      const posterUrl = movie.poster_path
                        ? tmdbService.getImageUrl(movie.poster_path, 'w342')
                        : null;

                      const inWatchlist = isInWatchlist(movie);
                      const year = movie.release_date
                        ? new Date(movie.release_date).getFullYear()
                        : null;
                      const rating = movie.vote_average
                        ? movie.vote_average.toFixed(1)
                        : null;

                      return (
                        <div key={movie.id} className="group relative">
                          {/* Movie Card */}
                          <div
                            onClick={inWatchlist ? (e) => handleCardClick(e, movie) : undefined}
                            className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all ${
                              inWatchlist ? 'cursor-pointer' : ''
                            }`}
                          >
                            {/* Poster */}
                            <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
                              {posterUrl ? (
                                <img
                                  src={posterUrl}
                                  alt={movie.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="h-12 w-12 text-slate-400" />
                                </div>
                              )}

                              {/* ✅ NEW: AddToWatchlistButton Component */}
                              <div className="absolute top-2 right-2 z-10">
                                <AddToWatchlistButton
                                  tmdbId={movie.id}
                                  title={movie.title}
                                  mediaType="movie"
                                  year={year || undefined}
                                  posterPath={movie.poster_path}
                                  overview={movie.overview}
                                  voteAverage={movie.vote_average}
                                  releaseDate={movie.release_date}
                                  variant="card-overlay"
                                  iconSize="md"
                                  isInWatchlist={inWatchlist}
                                  onWatchlistChange={() => {
                                    // Refresh watchlist IDs after change
                                    refetch();
                                    loadWatchlistMovieIds();
                                  }}
                                />
                              </div>

                              {/* Rating Badge */}
                              {rating && parseFloat(rating) > 0 && (
                                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                    <span className="text-white text-xs font-semibold">
                                      {rating}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Add to Custom Collection Button */}
                              {inWatchlist && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCollection(movie);
                                  }}
                                  className="absolute bottom-2 left-2 p-1.5 bg-purple-600 hover:bg-purple-700 backdrop-blur-sm rounded-full shadow-md transition-colors z-10"
                                  title="Add to custom collection"
                                >
                                  <Layers className="h-4 w-4 text-white" />
                                </button>
                              )}
                            </div>

                            {/* Movie Info */}
                            <div className="p-3">
                              <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
                                {movie.title}
                              </h3>
                              {year && (
                                <div className="flex items-center text-xs text-slate-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {year}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom Collections Modal */}
      {showCollectionSelector && (
        <CustomCollectionsModal
          isOpen={showCollectionSelector}
          onClose={() => setShowCollectionSelector(false)}
          collections={customCollections}
          selectedCollections={selectedCollections}
          onToggleCollection={(collectionId) => {
            setSelectedCollections(prev => {
              const next = new Set(prev);
              if (next.has(collectionId)) {
                next.delete(collectionId);
              } else {
                next.add(collectionId);
              }
              return next;
            });
          }}
          onSave={async () => {
            // Find the movie that was clicked
            const clickedMovie = collection?.parts[0]; // This should be tracked better
            if (clickedMovie) {
              await handleSaveToCollections(clickedMovie);
            }
          }}
          isSaving={addingToCollections}
        />
      )}
    </div>
  );
}