// src/components/FranchisePage.tsx
import React, { useState, useEffect } from 'react';
import { Film, Heart, Plus, Folder } from 'lucide-react';
import { CustomCollectionsModal } from './CustomCollectionsModal';
import { FranchiseSearchModal } from './FranchiseSearchModal';
import { tmdbService, TMDBCollectionSearchResult } from '../lib/tmdb';
import { favoriteFranchisesService, FavoriteFranchise } from '../services/favoriteFranchisesService';
import { CollectionDetailModal } from './CollectionDetailModal';
import { MovieDetailsPage } from './MovieDetailsPage';
import { Movie } from '../lib/supabase';

export function FranchisePage() {
  const [favorites, setFavorites] = useState<FavoriteFranchise[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCustomCollectionsModal, setShowCustomCollectionsModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showMovieDetailsModal, setShowMovieDetailsModal] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  // Add Esc key handler for closing Collection Detail Modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedCollection) {
        setSelectedCollection(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [selectedCollection]);

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
    // This will be handled by the MovieDetailsPage component
    console.log('Update status:', id, status);
  };

  const handleUpdateRating = async (id: string, rating: number | null) => {
    // This will be handled by the MovieDetailsPage component
    console.log('Update rating:', id, rating);
  };

  const handleUpdateMovie = async (id: string, updates: Partial<Movie>) => {
    // This will be handled by the MovieDetailsPage component
    console.log('Update movie:', id, updates);
  };

  const handleDeleteMovie = async (id: string) => {
    // This will be handled by the MovieDetailsPage component
    console.log('Delete movie:', id);
    setShowMovieDetailsModal(false);
    setSelectedMovie(null);
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
                <span>Collections</span>
              </button>

              {/* Add Franchise Button */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Franchise</span>
              </button>
            </div>
          </div>
          <p className="text-slate-600">
            Track and explore your favorite movie collections and franchises
          </p>
        </div>

        {/* Favorites Section */}
        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-center">
              <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No favorite franchises yet</p>
              <p className="text-sm text-slate-500">
                Click "Add Franchise" above to search for and add your favorite movie collections
              </p>
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
      </div>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <CollectionDetailModal
          isOpen={!!selectedCollection}
          onClose={() => setSelectedCollection(null)}
          collectionId={selectedCollection.id}
          collectionName={selectedCollection.name}
          onMovieDetailsClick={handleMovieDetailsClick}
        />
      )}

      {/* Franchise Search Modal */}
      {showSearchModal && (
        <FranchiseSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onFranchiseAdded={handleFranchiseAdded}
        />
      )}

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
        onClose={() => setShowCustomCollectionsModal(false)}
      />
    </div>
  );
}