// src/components/FranchisePage.tsx
import React, { useState, useEffect } from 'react';
import { Film, Heart, Search, X, Trash2 } from 'lucide-react';
import { tmdbService, TMDBCollectionSearchResult } from '../lib/tmdb';
import { favoriteFranchisesService, FavoriteFranchise } from '../services/favoriteFranchisesService';
import { CollectionDetailModal } from './CollectionDetailModal';
import { Plus } from 'lucide-react';
import { MovieSearchModal } from './MovieSearchModal';

export function FranchisePage() {
  const [favorites, setFavorites] = useState<FavoriteFranchise[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadFavorites();
  }, []);

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
    const collectionId = 'tmdb_collection_id' in collection ? collection.tmdb_collection_id : collection.id;
    setSelectedCollection({
      id: collectionId,
      name: collection.name
    });
  };

  const handleAddFranchise = () => {
    setShowSearchModal(true);
  };

  const handleFranchiseAdded = () => {
    refetch();
    setShowSearchModal(false);
  };

  if (loading) {
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Film className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-900">My Franchises</h1>
          </div>
          <p className="text-slate-600">
            Track and explore your favorite movie collections and franchises
          </p>
        </div>

        {/* Action Buttons Section */}
        <div className="mb-8">
          <div className="flex items-center justify-end space-x-3">
            {/* Add Franchise Button */}
            <button
              onClick={handleAddFranchise}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Franchise</span>
            </button>
          </div>
        </div>

        {/* Favorites Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            My Favorite Franchises ({favorites.length})
          </h2>

          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No favorite franchises yet</p>
              <p className="text-sm text-slate-500">
                Search for collections above and add them to your favorites
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {favorites.map((franchise) => (
                <div
                  key={franchise.id}
                  className="group relative bg-slate-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
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
                    <div className="p-3">
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2">
                        {franchise.collection_name}
                      </h4>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(franchise);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors backdrop-blur-sm"
                    title="Remove from favorites"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <CollectionDetailModal
          isOpen={!!selectedCollection}
          onClose={() => setSelectedCollection(null)}
          collectionId={selectedCollection.id}
          collectionName={selectedCollection.name}
        />
      )}

      {/* Search Modal for adding franchises */}
      {showSearchModal && (
        <MovieSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onMovieAdded={handleFranchiseAdded}
        />
      )}
    </div>
  );
}