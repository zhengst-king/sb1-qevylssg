// src/components/AddToLibraryModal.tsx - RENAMED FROM AddToCollectionModal
import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Star, 
  Package,
  Disc,
  Monitor,
  FileVideo,
  Heart,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { omdbApi } from '../lib/omdb';
import { CollectionStatusBadge } from './CollectionStatusBadge';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';

interface AddToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  defaultCollectionType?: CollectionType;
}

export function AddToLibraryModal({ isOpen, onClose, onAdd, defaultCollectionType = 'owned' }: AddToLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Enhanced form state with collection type
  const [format, setFormat] = useState<'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('Blu-ray');
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'>('New');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionType, setCollectionType] = useState<CollectionType>(defaultCollectionType);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const results = await omdbApi.searchMovies(searchQuery);
      setSearchResults(results.Search || []);
    } catch (error) {
      console.error('[AddToLibrary] Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching) {
      handleSearch();
    }
  };

  const handleMovieSelect = async (movie: any) => {
    try {
      const details = await omdbApi.getMovieDetails(movie.imdbID);
      setSelectedMovie(details);
      setSearchResults([]);
    } catch (error) {
      console.error('[AddToLibrary] Error fetching movie details:', error);
    }
  };

  const handleAddToLibrary = async () => {
    if (!selectedMovie) return;

    try {
      setAdding(true);
      
      const libraryItem: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        imdb_id: selectedMovie.imdbID,
        title: selectedMovie.Title,
        year: parseInt(selectedMovie.Year) || undefined,
        genre: selectedMovie.Genre !== 'N/A' ? selectedMovie.Genre : undefined,
        director: selectedMovie.Director !== 'N/A' ? selectedMovie.Director : undefined,
        poster_url: selectedMovie.Poster !== 'N/A' ? selectedMovie.Poster : undefined,
        format,
        condition,
        purchase_date: purchaseDate || undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchase_location: purchaseLocation || undefined,
        personal_rating: personalRating ? parseInt(personalRating) : undefined,
        notes: notes || undefined,
        collection_type: collectionType
      };

      await onAdd(libraryItem);
      handleClose();
    } catch (error) {
      console.error('[AddToLibrary] Failed to add to library:', error);
      alert('Failed to add item to library. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedMovie(null);
    setSearchQuery('');
    setSearchResults([]);
    setFormat('Blu-ray');
    setPurchaseDate('');
    setPurchasePrice('');
    setPurchaseLocation('');
    setCondition('New');
    setPersonalRating('');
    setNotes('');
    setCollectionType(defaultCollectionType);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'DVD': return FileVideo;
      case 'Blu-ray': return Disc;
      case '4K UHD': return Monitor;
      case '3D Blu-ray': return Package;
      default: return Disc;
    }
  };

  const collectionTypeOptions = [
    { 
      id: 'owned', 
      label: 'Add to Library', 
      description: 'I own this item',
      icon: Package,
      color: 'blue' as const
    },
    { 
      id: 'wishlist', 
      label: 'Add to Wishlist', 
      description: 'I want to buy this',
      icon: Heart,
      color: 'red' as const
    },
    { 
      id: 'for_sale', 
      label: 'Mark for Sale', 
      description: 'I\'m selling this item',
      icon: DollarSign,
      color: 'green' as const
    },
    { 
      id: 'loaned_out', 
      label: 'Loaned Out', 
      description: 'Someone borrowed this',
      icon: UserCheck,
      color: 'orange' as const
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Add to Library</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Movie Search Section */}
          {!selectedMovie && (
            <div className="p-6 border-b border-slate-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Search for Movie</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search by title (e.g., The Matrix)"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Search className="h-4 w-4" />
                    <span>{searching ? 'Searching...' : 'Search'}</span>
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {searchResults.map((movie) => (
                    <div
                      key={movie.imdbID}
                      onClick={() => handleMovieSelect(movie)}
                      className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      {movie.Poster && movie.Poster !== 'N/A' ? (
                        <img
                          src={movie.Poster}
                          alt={movie.Title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-slate-200 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{movie.Title}</h4>
                        <p className="text-sm text-slate-600">{movie.Year}</p>
                        <p className="text-xs text-slate-500">{movie.Type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Movie and Form */}
          {selectedMovie && (
            <div className="p-6 space-y-6">
              {/* Selected Movie Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  {selectedMovie.Poster && selectedMovie.Poster !== 'N/A' ? (
                    <img
                      src={selectedMovie.Poster}
                      alt={selectedMovie.Title}
                      className="w-20 h-28 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-slate-300 rounded-lg flex items-center justify-center">
                      <Package className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">{selectedMovie.Title}</h3>
                    <p className="text-slate-600">{selectedMovie.Year} • {selectedMovie.Genre}</p>
                    {selectedMovie.Director && selectedMovie.Director !== 'N/A' && (
                      <p className="text-sm text-slate-500">Directed by {selectedMovie.Director}</p>
                    )}
                    <button
                      onClick={() => setSelectedMovie(null)}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      ← Choose different movie
                    </button>
                  </div>
                </div>
              </div>

              {/* Item Status Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <Package className="inline h-4 w-4 mr-2" />
                  Item Status
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {collectionTypeOptions.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setCollectionType(type.id as CollectionType)}
                        className={`
                          p-4 rounded-lg border-2 text-left transition-all duration-200
                          ${collectionType === type.id
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" />
                            <span className="font-medium text-sm">{type.label}</span>
                          </div>
                          <CollectionStatusBadge 
                            type={type.id as CollectionType} 
                            size="sm" 
                            showLabel={false} 
                          />
                        </div>
                        <p className="text-xs text-slate-600">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
                
                {/* Item Status Specific Tips */}
                {collectionType === 'wishlist' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 flex items-center">
                      <Heart className="h-4 w-4 mr-2" />
                      <span><strong>Wishlist Tip:</strong> Items in your wishlist won't count toward library value calculations.</span>
                    </p>
                  </div>
                )}
                
                {collectionType === 'for_sale' && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span><strong>Selling Tip:</strong> Consider setting your asking price in the purchase price field below.</span>
                    </p>
                  </div>
                )}
                
                {collectionType === 'loaned_out' && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700 flex items-center">
                      <UserCheck className="h-4 w-4 mr-2" />
                      <span><strong>Loan Tip:</strong> Use the "Purchase Location" field to note who borrowed this item.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Physical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Disc className="inline h-4 w-4 mr-1" />
                    Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DVD', 'Blu-ray', '4K UHD', '3D Blu-ray'] as const).map((formatOption) => {
                      const IconComponent = getFormatIcon(formatOption);
                      return (
                        <button
                          key={formatOption}
                          type="button"
                          onClick={() => setFormat(formatOption)}
                          className={`
                            flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors
                            ${format === formatOption
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                            }
                          `}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm font-medium">{formatOption}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>

              {/* Purchase Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    {collectionType === 'wishlist' ? 'Target Date' : 'Purchase Date'}
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    {collectionType === 'for_sale' 
                      ? 'Asking Price' 
                      : collectionType === 'wishlist' 
                      ? 'Target Price' 
                      : 'Purchase Price'
                    }
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    {collectionType === 'loaned_out' 
                      ? 'Loaned To' 
                      : collectionType === 'for_sale' 
                      ? 'Selling Platform' 
                      : 'Purchase Location'
                    }
                  </label>
                  <input
                    type="text"
                    value={purchaseLocation}
                    onChange={(e) => setPurchaseLocation(e.target.value)}
                    placeholder={
                      collectionType === 'loaned_out' 
                        ? 'Friend\'s name' 
                        : collectionType === 'for_sale' 
                        ? 'eBay, Facebook, etc.' 
                        : 'Best Buy, Amazon, etc.'
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Star className="inline h-4 w-4 mr-1" />
                    Personal Rating
                  </label>
                  <select
                    value={personalRating}
                    onChange={(e) => setPersonalRating(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No rating</option>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => (
                      <option key={rating} value={rating}>{rating}/10</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special edition details, condition notes, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToLibrary}
                  disabled={adding}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {adding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      <span>
                        {collectionType === 'owned' && 'Add to Library'}
                        {collectionType === 'wishlist' && 'Add to Wishlist'}
                        {collectionType === 'for_sale' && 'Mark for Sale'}
                        {collectionType === 'loaned_out' && 'Mark as Loaned'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}