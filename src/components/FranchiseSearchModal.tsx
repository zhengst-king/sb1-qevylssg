// src/components/FranchiseSearchModal.tsx
import React, { useState } from 'react';
import { X, Search, Film, Heart } from 'lucide-react';
import { tmdbService, TMDBCollectionSearchResult } from '../lib/tmdb';

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

  if (!isOpen) return null;

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
    clearSearch();
  };

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Add Franchise</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Section */}
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

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
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
                    {collection.poster_path ? (
                      <img
                        src={tmdbService.getImageUrl(collection.poster_path, 'w342')}
                        alt={collection.name}
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 bg-slate-200 flex items-center justify-center">
                        <Film className="h-16 w-16 text-slate-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-2">
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
          )}
        </div>
      </div>
    </div>
  );
}