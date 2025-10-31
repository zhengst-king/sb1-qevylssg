// src/components/CustomCollectionDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Package, Calendar, Star, Film, Tv, Plus, Trash2 } from 'lucide-react';
import { customCollectionsService } from '../services/customCollectionsService';
import { Movie } from '../lib/supabase';
import { tmdbService } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import type { CustomCollection } from '../types/customCollections';

interface CustomCollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CustomCollection;
  onMovieClick: (movie: Movie) => void;
  onUpdatePoster?: (collectionId: string, posterUrl: string) => void;
}

export function CustomCollectionDetailModal({
  isOpen,
  onClose,
  collection,
  onMovieClick,
  onUpdatePoster
}: CustomCollectionDetailModalProps) {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && collection) {
      fetchCollectionItems();
    }
  }, [isOpen, collection.id]);

  const fetchCollectionItems = async () => {
    setLoading(true);
    try {
      console.log('[CustomCollectionDetailModal] Fetching items for collection:', collection.id);
      
      const fetchedItems = await customCollectionsService.getItemsInCollection(collection.id);
      
      console.log('[CustomCollectionDetailModal] Fetched items:', fetchedItems);
      console.log('[CustomCollectionDetailModal] Number of items:', fetchedItems.length);
      
      setItems(fetchedItems);
      
      // Build set of watchlist movie IDs
      const movieIds = new Set(fetchedItems.map(item => item.id));
      setWatchlistMovieIds(movieIds);
      
      // Update collection poster with NEWEST item by release year
      if (fetchedItems.length > 0 && onUpdatePoster) {
        // Find the item with the latest release year
        const newestItem = fetchedItems.reduce((latest, current) => {
          const latestYear = latest.year || 0;
          const currentYear = current.year || 0;
          return currentYear > latestYear ? current : latest;
        }, fetchedItems[0]);
        
        console.log('[CustomCollectionDetailModal] Newest item by year:', newestItem);
        if (newestItem.poster_url) {
          onUpdatePoster(collection.id, newestItem.poster_url);
        }
      }
    } catch (error) {
      console.error('[CustomCollectionDetailModal] Error fetching collection items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCollection = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine if this is a watchlist item or TMDB item
      const isWatchlistItem = !itemId.startsWith('tmdb_');

      if (isWatchlistItem) {
        // Remove by collection_item_id (watchlist item)
        await customCollectionsService.removeItemFromCollection(itemId, collection.id);
      } else {
        // Remove by tmdb_id (non-watchlist item)
        const tmdbId = parseInt(itemId.replace('tmdb_', ''));
        const { error } = await supabase
          .from('collection_items_custom_collections')
          .delete()
          .eq('custom_collection_id', collection.id)
          .eq('tmdb_id', tmdbId);

        if (error) throw error;
      }

      // Refresh items
      await fetchCollectionItems();
    } catch (error) {
      console.error('Error removing item from collection:', error);
      alert('Failed to remove item from collection.');
    }
  };

  const handleItemClick = (item: Movie) => {
    onMovieClick(item);
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
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: collection.color }}
              >
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{collection.name}</h2>
                {collection.description && (
                  <p className="text-sm text-slate-600">{collection.description}</p>
                )}
                <p className="text-sm text-slate-500 mt-1">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
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
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">No items in this collection yet</p>
                <p className="text-sm text-slate-500">
                  Add movies or TV shows to "{collection.name}" to see them here
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {items.map((item) => {
                    const isInWatchlist = item.in_watchlist !== false;
                    const tmdbUrl = item.tmdb_id 
                      ? `https://www.themoviedb.org/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.tmdb_id}`
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Poster - Clickable if in watchlist */}
                        <div 
                          className={`aspect-[2/3] bg-slate-200 relative overflow-hidden ${isInWatchlist ? 'cursor-pointer' : ''}`}
                          onClick={isInWatchlist ? () => handleItemClick(item) : undefined}
                        >
                          {item.poster_url ? (
                            <img
                              src={item.poster_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {item.media_type === 'tv' ? (
                                <Tv className="h-12 w-12 text-slate-400" />
                              ) : (
                                <Film className="h-12 w-12 text-slate-400" />
                              )}
                            </div>
                          )}

                          {/* Upper Left: Rating Badge */}
                          {item.imdb_score && item.imdb_score > 0 && (
                            <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-white text-xs font-semibold">
                                  {item.imdb_score.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Upper Right: Remove from Watchlist Button (X) - Only show if in watchlist */}
                          {isInWatchlist && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Remove "${item.title}" from your watchlist?\n\nNote: This will keep it in custom collections as a TMDB reference.`)) {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) return;

                                    // First, convert all collection references to TMDB references
                                    const { data: collectionItems, error: fetchError } = await supabase
                                      .from('collection_items_custom_collections')
                                      .select('id, custom_collection_id')
                                      .eq('collection_item_id', item.id);

                                    if (fetchError) {
                                      console.error('Error fetching collection items:', fetchError);
                                      alert('Failed to update collections. Please try again.');
                                      return;
                                    }

                                    // Update each collection item to use tmdb_id instead
                                    if (collectionItems && collectionItems.length > 0 && item.tmdb_id) {
                                      const updatePromises = collectionItems.map(ci => 
                                        supabase
                                          .from('collection_items_custom_collections')
                                          .update({
                                            collection_item_id: null,
                                            tmdb_id: item.tmdb_id
                                          })
                                          .eq('id', ci.id)
                                      );

                                      const results = await Promise.all(updatePromises);
                                      const failed = results.find(r => r.error);
                                      
                                      if (failed) {
                                        console.error('Error updating collection items:', failed.error);
                                        alert('Failed to update some collections. Please try again.');
                                        return;
                                      }
                                    }

                                    // Now delete from watchlist
                                    const { error } = await supabase
                                      .from('movies')
                                      .delete()
                                      .eq('id', item.id)
                                      .eq('user_id', user.id);

                                    if (error) {
                                      console.error('Error removing from watchlist:', error);
                                      alert('Failed to remove from watchlist.');
                                    } else {
                                      // Refresh the collection items
                                      await fetchCollectionItems();
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    alert('An error occurred.');
                                  }
                                }
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full shadow-md transition-colors z-10"
                              title="Remove from watchlist"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                          )}

                          {/* Upper Right: Add to Watchlist Button (+) - Only show if NOT in watchlist */}
                          {!isInWatchlist && tmdbUrl && (
                            <a
                              href={tmdbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors z-10"
                              title="View on TMDB"
                            >
                              <Plus className="h-4 w-4 text-slate-600 hover:text-purple-500" />
                            </a>
                          )}

                          {/* Lower Left: Remove from Collection Button (Trash) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Remove "${item.title}" from this collection?${!isInWatchlist ? '\n\nNote: This title is not in your watchlist.' : ''}`)) {
                                handleRemoveFromCollection(item.id);
                              }
                            }}
                            className="absolute bottom-2 left-2 p-1.5 bg-slate-800/80 hover:bg-slate-900 backdrop-blur-sm rounded-full shadow-md transition-colors z-10"
                            title="Remove from collection"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </button>

                          {/* Lower Right: Media Type Badge */}
                          <div className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                            {item.media_type === 'tv' ? 'TV' : 'Movie'}
                          </div>
                        </div>

                        {/* Item Info */}
                        <div className="p-3 bg-white">
                          <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-1">
                            {item.title}
                          </h4>
                          {item.year && (
                            <div className="flex items-center text-xs text-slate-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {item.year}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}