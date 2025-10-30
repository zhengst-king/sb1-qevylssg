// src/components/CustomCollectionDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Package, Calendar, Star, Film, Tv } from 'lucide-react';
import { customCollectionsService } from '../services/customCollectionsService';
import { Movie } from '../lib/supabase';
import { tmdbService } from '../lib/tmdb';
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

  useEffect(() => {
    if (isOpen && collection) {
      fetchCollectionItems();
    }
  }, [isOpen, collection.id]);

  const fetchCollectionItems = async () => {
    setLoading(true);
    try {
      const fetchedItems = await customCollectionsService.getItemsInCollection(collection.id);
      setItems(fetchedItems);
      
      // Update collection poster with newest item's poster
      if (fetchedItems.length > 0 && onUpdatePoster) {
        const newestItem = fetchedItems[0]; // Already sorted by added_at desc
        if (newestItem.poster_url) {
          onUpdatePoster(collection.id, newestItem.poster_url);
        }
      }
    } catch (error) {
      console.error('Error fetching collection items:', error);
    } finally {
      setLoading(false);
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
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="group relative cursor-pointer"
                    >
                      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                        {/* Poster */}
                        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
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

                          {/* Media Type Badge */}
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/75 backdrop-blur-sm">
                            <span className="text-white text-xs font-semibold uppercase">
                              {item.media_type === 'tv' ? 'TV' : 'Movie'}
                            </span>
                          </div>

                          {/* Rating Badge */}
                          {item.imdb_score && item.imdb_score > 0 && (
                            <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-white text-xs font-semibold">
                                  {item.imdb_score.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="p-3">
                          <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}