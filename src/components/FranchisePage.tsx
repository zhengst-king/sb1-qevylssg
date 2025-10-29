// src/components/FranchisePage.tsx - WITH TABS FOR TMDB & CUSTOM COLLECTIONS
import React, { useState, useEffect } from 'react';
import { Film, Heart, Plus, Folder, Package } from 'lucide-react';
import { CustomCollectionsModal } from './CustomCollectionsModal';
import { FranchiseSearchModal } from './FranchiseSearchModal';
import { tmdbService, TMDBCollectionSearchResult } from '../lib/tmdb';
import { favoriteFranchisesService, FavoriteFranchise } from '../services/favoriteFranchisesService';
import { CollectionDetailModal } from './CollectionDetailModal';
import { MovieDetailsPage } from './MovieDetailsPage';
import { Movie } from '../lib/supabase';
import { useCustomCollections } from '../hooks/useCustomCollections';
import type { CustomCollection } from '../types/customCollections';

type CollectionTab = 'tmdb' | 'custom';

export function FranchisePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<CollectionTab>('tmdb');
  
  // TMDB Collections state
  const [favorites, setFavorites] = useState<FavoriteFranchise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<{
    id: number;
    name: string;
  } | null>(null);
  
  // Custom Collections state
  const { collections: customCollections, loading: customCollectionsLoading, refetch: refetchCustomCollections } = useCustomCollections();
  const [selectedCustomCollection, setSelectedCustomCollection] = useState<CustomCollection | null>(null);
  
  // Modal states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCustomCollectionsModal, setShowCustomCollectionsModal] = useState(false);
  const [showMovieDetailsModal, setShowMovieDetailsModal] = useState(false);
  
  // Other state
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  // Add Esc key handler for closing Collection Detail Modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedCollection) {
        setSelectedCollection(null);
      }
      if (event.key === 'Escape' && selectedCustomCollection) {
        setSelectedCustomCollection(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [selectedCollection, selectedCustomCollection]);

  const loadFavorites = async () => {
    setLoading(true);
    const data = await favoriteFranchisesService.getAllFavorites();
    setFavorites(data);
    setFavoriteIds(new Set(data.map(f => f.tmdb_collection_id)));
    setLoading(false);
  };

  const handleToggleFavorite = async (collection: TMDBCollectionSearchResult | FavoriteFranchise) => {
    const collectionId = 'tmdb_collection_id' in collection ? collection.tmdb_collection_id : collection.id;
    const isFavorite = favoriteIds.has(collectionId);

    if (isFavorite) {
      const success = await favoriteFranchisesService.removeFavorite(collectionId);
      if (success) {
        setFavorites(prev => prev.filter(f => f.tmdb_collection_id !== collectionId));
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(collectionId);
          return newSet;
        });
      }
    } else {
      const added = await favoriteFranchisesService.addFavorite({
        tmdb_collection_id: collectionId,
        collection_name: collection.name,
        poster_path: collection.poster_path || undefined,
        backdrop_path: collection.backdrop_path || undefined
      });

      if (added) {
        setFavorites(prev => [added, ...prev]);
        setFavoriteIds(prev => new Set([...prev, collectionId]));
      }
    }
  };

  const handleCollectionClick = (collection: TMDBCollectionSearchResult | FavoriteFranchise) => {
    const collectionId = 'tmdb_collection_id' in collection ? 
      collection.tmdb_collection_id : collection.id;
    setSelectedCollection({
      id: collectionId,
      name: collection.name
    });
  };

  const handleCustomCollectionClick = (collection: CustomCollection) => {
    setSelectedCustomCollection(collection);
  };

  const handleFranchiseAdded = async (collection: TMDBCollectionSearchResult) => {
    await handleToggleFavorite(collection);
  };

  const handleMovieDetailsClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowMovieDetailsModal(true);
  };

  const handleCloseMovieDetails = () => {
    setShowMovieDetailsModal(false);
    setSelectedMovie(null);
  };

  const handleUpdateStatus = async (id: string, status: Movie['status']) => {
    console.log('Update status:', id, status);
  };

  const handleUpdateRating = async (id: string, rating: number | null) => {
    console.log('Update rating:', id, rating);
  };

  const handleUpdateMovie = async (id: string, updates: Partial<Movie>) => {
    console.log('Update movie:', id, updates);
  };

  const handleDeleteMovie = async (id: string) => {
    console.log('Delete movie:', id);
    setShowMovieDetailsModal(false);
    setSelectedMovie(null);
  };

  const handleCustomCollectionsModalClose = () => {
    setShowCustomCollectionsModal(false);
    refetchCustomCollections(); // Refresh custom collections when modal closes
  };

  // Determine loading state based on active tab
  const isLoading = activeTab === 'tmdb' ? loading : customCollectionsLoading;

  if (loading && activeTab === 'tmdb') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Film className="h-12 w-12 text-purple-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading your franchises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-3">
              <Film className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-slate-900">My Franchises</h1>
            </div>
  
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Collections Button */}
              <button
                onClick={() => setShowCustomCollectionsModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
              >
                <Folder className="h-4 w-4" />
                <span>Manage Collections</span>
              </button>

              {/* Add Franchise Button - Only show on TMDB tab */}
              {activeTab === 'tmdb' && (
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Franchise</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-600">
            {activeTab === 'tmdb' 
              ? 'Track and explore your favorite TMDB movie collections and franchises'
              : 'Organize movies and TV shows into your own custom collections'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('tmdb')}
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'tmdb'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Film className="h-4 w-4" />
                <span>TMDB Collections</span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                  {favorites.length}
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'custom'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Custom Collections</span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                  {customCollections.length}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* TMDB Collections Tab Content */}
        {activeTab === 'tmdb' && (
          <>
            {favorites.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No TMDB collections yet</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Click "Add Franchise" above to search for and add movie collections from TMDB
                  </p>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Your First Franchise</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {favorites.map((franchise) => (
                  <div
                    key={franchise.id}
                    className="group relative rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div onClick={() => handleCollectionClick(franchise)}>
                      {franchise.poster_path ? (
                        <img
                          src={tmdbService.getImageUrl(franchise.poster_path, 'w342')}
                          alt={franchise.collection_name}
                          className="w-full h-64 object-cover"
                        />
                      ) : (
                        <div className="w-full h-64 bg-slate-200 flex items-center justify-center">
                          <Film className="h-16 w-16 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <h4 className="font-semibold text-white text-sm line-clamp-2">
                          {franchise.collection_name}
                        </h4>
                      </div>
                    </div>

                    {/* Top Right: TMDB Link */}
                    <a
                      href={`https://www.themoviedb.org/collection/${franchise.tmdb_collection_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-medium p-1.5 rounded text-xs transition-colors duration-200 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                      title="View on TMDB"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.2819 9.8211a.9961.9961 0 0 0-.9069-.5593H19.67V4.0434c0-.3978-.2486-.7559-.6223-.8956a.9983.9983 0 0 0-1.0281.2642L11.8131 9.617a1.0006 1.0006 0 0 0 0 1.4142l6.2135 6.2135a.9996.9996 0 0 0 1.0281.2642c.3737-.1397.6223-.4978.6223-.8956v-5.2184h1.7051a.9984.9984 0 0 0 .9069-.5593c.2368-.4729.2368-1.0407 0-1.5136z"/>
                      </svg>
                    </a>

                    {/* Bottom Right: Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(franchise);
                      }}
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors backdrop-blur-sm shadow-sm"
                      title="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Custom Collections Tab Content */}
        {activeTab === 'custom' && (
          <>
            {customCollectionsLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading custom collections...</p>
                </div>
              </div>
            ) : customCollections.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No custom collections yet</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Create your own collections to organize movies and TV shows your way
                  </p>
                  <button
                    onClick={() => setShowCustomCollectionsModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Your First Collection</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {customCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="group relative rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white border border-slate-200"
                    onClick={() => handleCustomCollectionClick(collection)}
                  >
                    {/* Generic Poster Background */}
                    <div 
                      className="w-full h-64 flex items-center justify-center relative"
                      style={{ backgroundColor: `${collection.color}15` }}
                    >
                      {/* Icon */}
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: collection.color }}
                      >
                        <Package className="h-10 w-10 text-white" />
                      </div>
                      
                      {/* Item Count Badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md">
                        <span className="text-xs font-medium text-white">
                          {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Favorite Star */}
                      {collection.is_favorite && (
                        <div className="absolute top-2 right-2 p-1.5 bg-yellow-500 rounded-full">
                          <Heart className="h-3 w-3 text-white fill-current" />
                        </div>
                      )}
                    </div>

                    {/* Collection Name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <h4 className="font-semibold text-white text-sm line-clamp-2">
                        {collection.name}
                      </h4>
                      {collection.description && (
                        <p className="text-xs text-slate-300 line-clamp-1 mt-1">
                          {collection.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Collection Detail Modal - For TMDB Collections */}
      {selectedCollection && (
        <CollectionDetailModal
          isOpen={!!selectedCollection}
          onClose={() => setSelectedCollection(null)}
          collectionId={selectedCollection.id}
          collectionName={selectedCollection.name}
          onMovieDetailsClick={handleMovieDetailsClick}
        />
      )}

      {/* Custom Collection Detail Modal - TODO: Create this component */}
      {selectedCustomCollection && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setSelectedCustomCollection(null)}
          />
          <div className="fixed inset-4 md:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">{selectedCustomCollection.name}</h2>
              {selectedCustomCollection.description && (
                <p className="text-slate-600 mt-1">{selectedCustomCollection.description}</p>
              )}
              <p className="text-sm text-slate-500 mt-2">
                {selectedCustomCollection.item_count} {selectedCustomCollection.item_count === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Custom Collection Detail View</p>
                <p className="text-sm text-slate-500">
                  This will show all titles in "{selectedCustomCollection.name}"
                </p>
                <p className="text-xs text-slate-400 mt-4">
                  Coming in Item 3 implementation
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCustomCollection(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Franchise Search Modal */}
      <FranchiseSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onFranchiseAdded={handleFranchiseAdded}
      />

      {/* Movie Details Modal */}
      {showMovieDetailsModal && selectedMovie && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={handleCloseMovieDetails}
          />
          <div className="fixed inset-4 md:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <MovieDetailsPage 
              movie={selectedMovie} 
              onBack={handleCloseMovieDetails}
              onUpdateStatus={handleUpdateStatus}
              onUpdateRating={handleUpdateRating}
              onUpdateMovie={handleUpdateMovie}
              onDelete={handleDeleteMovie}
              onViewRecommendation={(movie) => setSelectedMovie(movie)}
              onMovieAddedToWatchlist={undefined}
            />
          </div>
        </div>
      )}

      {/* Custom Collections Modal */}
      <CustomCollectionsModal
        isOpen={showCustomCollectionsModal}
        onClose={handleCustomCollectionsModalClose}
      />
    </div>
  );
}