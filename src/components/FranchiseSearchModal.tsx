// src/components/FranchiseSearchModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Search, Layers, Heart, Plus, Check } from 'lucide-react';
import { tmdbService, TMDBCollectionSearchResult } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import { useCustomCollections } from '../hooks/useCustomCollections';
import type { CustomCollection } from '../types/customCollections';

interface FranchiseSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFranchiseAdded: (collection: TMDBCollectionSearchResult) => void;
  favoriteIds: Set<number>;
}

export function FranchiseSearchModal({ 
  isOpen, 
  onClose, 
  onFranchiseAdded,
  favoriteIds 
}: FranchiseSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBCollectionSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [viewingCollection, setViewingCollection] = useState<TMDBCollectionSearchResult | null>(null);
  const [collectionTitles, setCollectionTitles] = useState<any[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);

  // Custom Collections state
  const { collections: customCollections } = useCustomCollections();
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollections, setAddingToCollections] = useState(false);

  if (!isOpen) return null;

  // Add Esc key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showCollectionSelector) {
          setShowCollectionSelector(false);
        } else if (viewingCollection) {
          setViewingCollection(null);
          setCollectionTitles([]);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, showCollectionSelector, viewingCollection]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await tmdbService.searchCollections(searchQuery);
      setSearchResults(results?.results || []);
    } catch (error) {
      console.error('Error searching collections:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddFranchise = (collection: TMDBCollectionSearchResult) => {
    onFranchiseAdded(collection);
  };

  const handleViewCollection = async (collection: TMDBCollectionSearchResult) => {
    setViewingCollection(collection);
    setLoadingTitles(true);
    
    try {
      const details = await tmdbService.getCollectionDetails(collection.id);
      setCollectionTitles(details?.parts || []);
    } catch (error) {
      console.error('Error loading collection details:', error);
    } finally {
      setLoadingTitles(false);
    }
  };

  const handleBackToSearch = () => {
    setViewingCollection(null);
    setCollectionTitles([]);
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
    if (selectedCollections.size === 0 || collectionTitles.length === 0) return;

    setAddingToCollections(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to add items to collections');
        return;
      }

      // Extract TMDB IDs from collection titles
      const tmdbIds = collectionTitles.map(title => title.id);
      
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

      // Separate existing and new titles
      const existingTmdbIds = new Set(existingMovies?.map(m => m.tmdb_id) || []);
      const titlesToAdd = collectionTitles.filter(title => !existingTmdbIds.has(title.id));

      // Add new titles to watchlist first
      const newMovieIds: string[] = [];
      if (titlesToAdd.length > 0) {
        const moviesToInsert = titlesToAdd.map(title => ({
          user_id: user.id,
          tmdb_id: title.id,
          title: title.title || title.name,
          media_type: 'movie',
          status: 'To Watch',
          poster_url: title.poster_path ? tmdbService.getImageUrl(title.poster_path, 'w500') : null,
          year: title.release_date ? parseInt(title.release_date.split('-')[0]) : null,
        }));

        const { data: insertedMovies, error: insertError } = await supabase
          .from('movies')
          .insert(moviesToInsert)
          .select('id, tmdb_id');

        if (insertError) {
          console.error('Error adding movies to watchlist:', insertError);
          alert('Failed to add some titles to your watchlist. Please try again.');
          return;
        }

        newMovieIds.push(...(insertedMovies?.map(m => m.id) || []));
      }

      // Combine existing and new movie IDs
      const allMovieIds = [
        ...(existingMovies?.map(m => m.id) || []),
        ...newMovieIds
      ];

      // Prepare bulk insert data for all selected collections
      const insertData: Array<{ collection_item_id: string; custom_collection_id: string }> = [];
      
      for (const collectionId of selectedCollections) {
        for (const movieId of allMovieIds) {
          insertData.push({
            collection_item_id: movieId,
            custom_collection_id: collectionId
          });
        }
      }

      // Insert all associations (with conflict handling to avoid duplicates)
      const { error: insertError } = await supabase
        .from('collection_items_custom_collections')
        .upsert(insertData, { 
          onConflict: 'collection_item_id,custom_collection_id',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('Error adding items to collections:', insertError);
        alert('Failed to add items to collections. Please try again.');
        return;
      }

      // Success feedback
      const collectionsText = selectedCollections.size === 1 ? 'collection' : 'collections';
      const totalTitles = collectionTitles.length;
      const addedToWatchlist = titlesToAdd.length;
      
      let message = `Successfully added ${totalTitles} ${totalTitles === 1 ? 'title' : 'titles'} to ${selectedCollections.size} ${collectionsText}!`;
      
      if (addedToWatchlist > 0) {
        message += `\n\n${addedToWatchlist} ${addedToWatchlist === 1 ? 'title was' : 'titles were'} also added to your watchlist.`;
      }
      
      alert(message);
      
      setShowCollectionSelector(false);
      setSelectedCollections(new Set());
    } catch (error) {
      console.error('Error adding titles:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setAddingToCollections(false);
    }
  };

  const handleClose = () => {
    clearSearch();
    setViewingCollection(null);
    setCollectionTitles([]);
    setShowCollectionSelector(false);
    setSelectedCollections(new Set());
    onClose();
  };

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (showCollectionSelector) {
        setShowCollectionSelector(false);
      } else {
        handleClose();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Layers className="h-6 w-6 text-purple-600" />
            {viewingCollection ? (
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{viewingCollection.name}</h2>
                <p className="text-sm text-slate-500">{collectionTitles.length} titles</p>
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-slate-900">Add Franchise</h2>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {viewingCollection && collectionTitles.length > 0 && (
              <button
                onClick={() => setShowCollectionSelector(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Titles to Collection</span>
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Search Section - Only show when not viewing a collection */}
        {!viewingCollection && (
          <div className="p-6 border-b border-slate-200">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search for movie collections (e.g., Marvel, Star Wars, Harry Potter)..."
                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                <Search className="h-5 w-5" />
                <span>{searching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Back button when viewing collection */}
        {viewingCollection && (
          <div className="px-6 pt-4">
            <button
              onClick={handleBackToSearch}
              className="text-purple-600 hover:text-purple-700 flex items-center space-x-2 text-sm font-medium"
            >
              <span>← Back to search</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewingCollection ? (
            // Collection Titles View
            loadingTitles ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading collection titles...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {collectionTitles.map((title) => (
                  <div
                    key={title.id}
                    className="group relative bg-slate-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {title.poster_path ? (
                      <img
                        src={tmdbService.getImageUrl(title.poster_path, 'w342')}
                        alt={title.title || title.name}
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 bg-slate-200 flex items-center justify-center">
                        <Layers className="h-16 w-16 text-slate-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2">
                        {title.title || title.name}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Search Results View
            searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchQuery ? 'No franchises found. Try a different search.' : 'Search for a franchise to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map((collection) => {
                  const isAlreadyAdded = favoriteIds.has(collection.id);
                  
                  return (
                    <div
                      key={collection.id}
                      className="group relative bg-slate-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleViewCollection(collection)}
                      >
                        {collection.poster_path ? (
                          <img
                            src={tmdbService.getImageUrl(collection.poster_path, 'w342')}
                            alt={collection.name}
                            className="w-full h-64 object-cover"
                          />
                        ) : (
                          <div className="w-full h-64 bg-slate-200 flex items-center justify-center">
                            <Layers className="h-16 w-16 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 
                          className="font-semibold text-slate-900 text-sm line-clamp-2 mb-2 cursor-pointer hover:text-purple-600"
                          onClick={() => handleViewCollection(collection)}
                        >
                          {collection.name}
                        </h4>
                        <button
                          onClick={() => handleAddFranchise(collection)}
                          disabled={isAlreadyAdded}
                          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                            isAlreadyAdded
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isAlreadyAdded ? 'fill-current' : ''}`} />
                          <span>{isAlreadyAdded ? 'Already Added' : 'Add to Favorites'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
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
            {/* Popup Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Select Collections</h3>
              <button
                onClick={() => setShowCollectionSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Collections List */}
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

            {/* Popup Footer */}
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
    </div>
  );
}