import React, { useState } from 'react';
import { X, Search, Calendar, DollarSign, MapPin, Star } from 'lucide-react';
import { omdbApi } from '../lib/omdb';
import type { PhysicalMediaCollection } from '../lib/supabase';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export function AddToCollectionModal({ isOpen, onClose, onAdd }: AddToCollectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [format, setFormat] = useState<'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('Blu-ray');
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'>('New');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const results = await omdbApi.searchMovies(searchQuery);
      setSearchResults(results.Search || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleMovieSelect = async (movie: any) => {
    try {
      const details = await omdbApi.getMovieDetails(movie.imdbID);
      setSelectedMovie(details);
      setSearchResults([]);
    } catch (error) {
      console.error('Error fetching movie details:', error);
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedMovie) return;

    try {
      setAdding(true);
      
      const collectionItem: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
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
      };

      await onAdd(collectionItem);
      handleClose();
    } catch (error: any) {
      console.error('Error adding to collection:', error);
      alert('Failed to add to collection: ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMovie(null);
    setFormat('Blu-ray');
    setCondition('New');
    setPurchaseDate('');
    setPurchasePrice('');
    setPurchaseLocation('');
    setPersonalRating('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Add to Collection</h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Movie Search */}
          {!selectedMovie && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search for a movie or TV show..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((movie) => (
                    <div
                      key={movie.imdbID}
                      onClick={() => handleMovieSelect(movie)}
                      className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {movie.Poster !== 'N/A' && (
                        <img
                          src={movie.Poster}
                          alt={movie.Title}
                          className="w-12 h-18 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{movie.Title}</h4>
                        <p className="text-sm text-slate-500">{movie.Year} • {movie.Type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Movie & Collection Details */}
          {selectedMovie && (
            <div className="space-y-6">
              {/* Selected Movie Display */}
              <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                {selectedMovie.Poster !== 'N/A' && (
                  <img
                    src={selectedMovie.Poster}
                    alt={selectedMovie.Title}
                    className="w-16 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{selectedMovie.Title}</h3>
                  <p className="text-slate-600">{selectedMovie.Year}</p>
                  <p className="text-sm text-slate-500 mt-1">{selectedMovie.Genre}</p>
                  <button
                    onClick={() => setSelectedMovie(null)}
                    className="text-blue-600 text-sm mt-2 hover:text-blue-700"
                  >
                    Change movie
                  </button>
                </div>
              </div>

              {/* Collection Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Format *
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DVD">DVD</option>
                    <option value="Blu-ray">Blu-ray</option>
                    <option value="4K UHD">4K UHD</option>
                    <option value="3D Blu-ray">3D Blu-ray</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Condition *
                  </label>
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Purchase Date
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
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Purchase Location
                  </label>
                  <input
                    type="text"
                    placeholder="Store, website, etc."
                    value={purchaseLocation}
                    onChange={(e) => setPurchaseLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
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
                  onClick={handleAddToCollection}
                  disabled={adding}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {adding ? 'Adding...' : 'Add to Collection'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}