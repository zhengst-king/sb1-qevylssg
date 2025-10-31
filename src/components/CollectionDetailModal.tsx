// src/components/CollectionDetailModal.tsx
// COMPLETE FIXED VERSION - Fetches OMDb data before insert + fixes click handler

import React, { useEffect, useState } from 'react';
import { X, Film, Plus, Calendar, Star, Layers, Check } from 'lucide-react';
import { tmdbService, TMDBCollection, TMDBCollectionPart } from '../lib/tmdb';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';
import { buildMovieFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder';
import { useCustomCollections } from '../hooks/useCustomCollections';
import type { CustomCollection } from '../types/customCollections';
import { tmdbCacheService } from '../services/tmdbCacheService';

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
  const { movies, addMovie, refetch } = useMovies('movie');
  const [addingMovies, setAddingMovies] = useState<Set<number>>(new Set());
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());
  
  // Custom Collections state
  const { collections: customCollections } = useCustomCollections();
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollections, setAddingToCollections] = useState(false);

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

  const handleAddToWatchlist = async (movie: TMDBCollectionPart) => {
    setAddingMovies(prev => new Set([...prev, movie.id]));
    
    try {
      console.log('[CollectionDetailModal] Adding movie:', movie.title);
      
      // Get IMDb ID from TMDB (using the helper function)
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
      
      const movieData = buildMovieFromOMDb(
        {
          title: movie.title,
          year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : undefined,
          imdb_id: imdbId || `tmdb_${movie.id}`,
          tmdb_id: movie.id,
          poster_url: movie.poster_path ? tmdbService.getImageUrl(movie.poster_path) : undefined,
          plot: movie.overview,
          imdb_score: movie.vote_average,
          media_type: 'movie',
          status: 'To Watch'
        },
        omdbDetails
      );

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

  const handleToggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollections(newSelected);
  };

  const handleAddTitlesToCollections = async () => {
    if (selectedCollections.size === 0 || !collection?.parts || collection.parts.length === 0) return;

    setAddingToCollections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to add items to collections');
        return;
      }

      const tmdbIds = collection.parts.map(part => part.id);
      
      // Check which titles already exist in user's watchlist
      const { data: existingMovies, error: queryError } = await supabase
        .from('movies')
        .select('id, tmdb_id, title')
        .eq('user_id', user.id)
        .in('tmdb_id', tmdbIds);

      if (queryError) {
        console.error('Error querying existing movies:', queryError);
        alert('Failed to check existing movies. Please try again.');
        return;
      }

      // Prepare bulk insert data for all selected collections
      const insertData: Array<{
        collection_item_id: string | null;
        custom_collection_id: string;
        tmdb_id: number | null;
      }> = [];

      for (const collectionId of selectedCollections) {
        for (const part of collection.parts) {
          const watchlistMovie = existingMovies?.find(m => m.tmdb_id === part.id);
          
          insertData.push({
            custom_collection_id: collectionId,
            collection_item_id: watchlistMovie?.id || null,
            tmdb_id: watchlistMovie ? null : part.id, // Store TMDB ID if not in watchlist
          });
        }
      }

      // Insert all associations (with conflict handling to avoid duplicates)
      const { error: insertError } = await supabase
        .from('collection_items_custom_collections')
        .upsert(insertData, { 
          onConflict: 'custom_collection_id,collection_item_id,tmdb_id',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('Error adding items to collections:', insertError);
        alert('Failed to add items to collections. Please try again.');
        return;
      }

      // Success feedback
      const collectionsText = selectedCollections.size === 1 ? 'collection' : 'collections';
      const totalTitles = collection.parts.length;
      const watchlistedCount = existingMovies?.length || 0;
      const unwatchlistedCount = totalTitles - watchlistedCount;
      
      let message = `Successfully added ${totalTitles} ${totalTitles === 1 ? 'title' : 'titles'} to ${selectedCollections.size} ${collectionsText}!`;
      
      if (unwatchlistedCount > 0) {
        message += `\n\n${watchlistedCount} on watchlist, ${unwatchlistedCount} not on watchlist.`;
      }
      
      alert(message);
      
      setShowCollectionSelector(false);
      setSelectedCollections(new Set());

      // Refresh watchlist status
      await loadWatchlistMovieIds();
      
      // Update collection posters with newest titles
      await updateCustomCollectionPosters();
      
      // Notify parent to refresh collection counts
      if (onCollectionsUpdated) {
        onCollectionsUpdated();
      }

    } catch (error) {
      console.error('Error adding titles:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setAddingToCollections(false);
    }
  };

  const updateCustomCollectionPosters = async () => {
    // Get all custom collections that were just updated
    for (const collectionId of selectedCollections) {
      try {
        // Fetch items in this collection
        const items = await customCollectionsService.getItemsInCollection(collectionId);
        
        if (items.length > 0) {
          // Find newest item by release year
          const newestItem = items.reduce((latest, current) => {
            const latestYear = latest.year || 0;
            const currentYear = current.year || 0;
            return currentYear > latestYear ? current : latest;
          }, items[0]);
          
          // Update collection poster
          if (newestItem.poster_url) {
            await customCollectionsService.updateCustomCollection(collectionId, {
              poster_url: newestItem.poster_url
            });
          }
        }
      } catch (error) {
        console.error('Error updating collection poster:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
                <Layers className="h-6 w-6 text-purple-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{collectionName}</h2>
                  {collection && (
                    <p className="text-sm text-slate-500">{collection.parts?.length || 0} titles</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {collection && collection.parts && collection.parts.length > 0 && (
                  <button
                    onClick={() => setShowCollectionSelector(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Titles to Collection</span>
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
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
                          
                          if (inWatchlist) {
                            return (
                              <div
                                key={movie.id}
                                onClick={(e) => handleCardClick(e, movie)}
                                className="group relative cursor-pointer"
                              >
                                <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
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

                                    <button
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        if (isAdding) return;
                                        
                                        setAddingMovies(prev => new Set([...prev, movie.id]));
                                        
                                        try {
                                          const { data: { user } } = await supabase.auth.getUser();
                                          if (!user) return;
                                          
                                          const { error } = await supabase
                                            .from('movies')
                                            .delete()
                                            .eq('user_id', user.id)
                                            .eq('title', movie.title)
                                            .eq('media_type', 'movie');
                                          
                                          if (error) throw error;
                                          
                                          await refetch();
                                          await loadWatchlistMovieIds();
                                        } catch (error) {
                                          console.error('Error removing from watchlist:', error);
                                        } finally {
                                          setAddingMovies(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(movie.id);
                                            return newSet;
                                          });
                                        }
                                      }}
                                      disabled={isAdding}
                                      className="absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all bg-red-500 hover:bg-red-600"
                                      title="Remove from watchlist"
                                    >
                                      {isAdding ? (
                                        <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4 text-white" />
                                      )}
                                    </button>

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
                            return (
                              <a
                                key={movie.id}
                                href={tmdbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative block"
                              >
                                <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
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

      {/* Collection Selector Popup */}
      {showCollectionSelector && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCollectionSelector(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Select Collections</h3>
              <button
                onClick={() => setShowCollectionSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {customCollections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-2">No custom collections yet</p>
                  <p className="text-sm text-slate-500">
                    Create a custom collection first to add titles
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customCollections.map((collection) => (
                    <label
                      key={collection.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollections.has(collection.id)}
                        onChange={() => handleToggleCollection(collection.id)}
                        className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: collection.color }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {collection.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{collection.name}</p>
                        {collection.description && (
                          <p className="text-xs text-slate-500 truncate">{collection.description}</p>
                        )}
                      </div>
                      {selectedCollections.has(collection.id) && (
                        <Check className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCollectionSelector(false);
                  setSelectedCollections(new Set());
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTitlesToCollections}
                disabled={selectedCollections.size === 0 || addingToCollections}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {addingToCollections ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Done ({selectedCollections.size} selected)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}