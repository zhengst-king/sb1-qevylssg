// src/components/AddToLibraryModal.tsx - SINGLE PAGE WITH EXPANDING SECTIONS
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
  AlertTriangle,
  Sparkles,
  Volume2,
  Info,
  ExternalLink,
  ChevronRight,
  Check,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { omdbApi } from '../lib/omdb';
import { blurayApi } from '../lib/blurayApi';
import { ItemStatusBadge } from './ItemStatusBadge';
import type { PhysicalMediaCollection, CollectionType, BlurayTechnicalSpecs } from '../lib/supabase';

interface BlurayEdition {
  url: string;
  title: string;
  year: number;
  format: string;
  edition?: string;
  studio?: string;
  releaseDate?: string;
  isDigital?: boolean;
}

interface SelectedEdition extends BlurayEdition {
  specs?: BlurayTechnicalSpecs;
}

interface AddToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PhysicalMediaCollection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  defaultCollectionType?: CollectionType;
}

export function AddToLibraryModal({ isOpen, onClose, onAdd, defaultCollectionType = 'owned' }: AddToLibraryModalProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [movieSearchResults, setMovieSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Selected movie state
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  
  // Physical editions state
  const [physicalEditions, setPhysicalEditions] = useState<BlurayEdition[]>([]);
  const [selectedEditions, setSelectedEditions] = useState<Set<string>>(new Set());
  const [loadingEditions, setLoadingEditions] = useState(false);
  
  // Selected edition for adding
  const [editionToAdd, setEditionToAdd] = useState<SelectedEdition | null>(null);
  const [loadingEditionSpecs, setLoadingEditionSpecs] = useState(false);
  
  // Form visibility
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'>('New');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionType, setCollectionType] = useState<CollectionType>(defaultCollectionType);

  if (!isOpen) return null;

  // STEP 1: Search for Movie/TV Show
  const handleMovieSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      console.log('[AddToLibrary] Searching for movie/TV:', searchQuery);
      
      const results = await omdbApi.searchMovies(searchQuery);
      setMovieSearchResults(results.Search || []);
      
      if (!results.Search || results.Search.length === 0) {
        alert('No movies or TV shows found. Try different search terms.');
      }
    } catch (error) {
      console.error('[AddToLibrary] Movie search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching) {
      handleMovieSearch();
    }
  };

  // STEP 2: Select Movie and Load Physical Editions
  const handleMovieSelect = async (movie: any) => {
    try {
      setLoadingEditions(true);
      console.log('[AddToLibrary] Selected movie:', movie.Title);
      
      // Get full movie details from OMDb
      const details = await omdbApi.getMovieDetails(movie.imdbID);
      setSelectedMovie(details);
      
      // Search blu-ray.com for all available physical editions
      console.log('[AddToLibrary] Searching blu-ray.com for editions...');
      const editions = await blurayApi.searchBlurayDotCom(movie.Title, parseInt(movie.Year));
      
      setPhysicalEditions(editions || []);
      
      // Clear previous selections
      setSelectedEditions(new Set());
      setEditionToAdd(null);
      setShowDetailsForm(false);
      
    } catch (error) {
      console.error('[AddToLibrary] Error fetching editions:', error);
      alert('Failed to load physical media editions. Please try again.');
    } finally {
      setLoadingEditions(false);
    }
  };

  // Clear selected movie and go back to search
  const handleClearMovie = () => {
    setSelectedMovie(null);
    setPhysicalEditions([]);
    setSelectedEditions(new Set());
    setEditionToAdd(null);
    setShowDetailsForm(false);
  };

  // Toggle edition selection
  const toggleEditionSelection = (editionUrl: string) => {
    const newSelection = new Set(selectedEditions);
    if (newSelection.has(editionUrl)) {
      newSelection.delete(editionUrl);
    } else {
      newSelection.add(editionUrl);
    }
    setSelectedEditions(newSelection);
  };

  // Load specs and show details form
  const handleProceedWithEditions = async () => {
    if (selectedEditions.size === 0) {
      alert('Please select at least one physical media edition to add.');
      return;
    }

    // For now, we'll process the first selected edition
    const firstSelectedUrl = Array.from(selectedEditions)[0];
    const edition = physicalEditions.find(e => e.url === firstSelectedUrl);
    
    if (!edition) return;

    try {
      setLoadingEditionSpecs(true);
      console.log('[AddToLibrary] Loading specs for selected edition...');
      
      // Load technical specs for the edition
      const specs = await blurayApi.scrapeDiscDetails(edition.url);
      
      setEditionToAdd({
        ...edition,
        specs: specs || undefined
      });
      
      setShowDetailsForm(true);
    } catch (error) {
      console.error('[AddToLibrary] Error loading edition specs:', error);
      alert('Failed to load edition details. Please try again.');
    } finally {
      setLoadingEditionSpecs(false);
    }
  };

  // Clear selected edition and go back to editions
  const handleClearEdition = () => {
    setEditionToAdd(null);
    setShowDetailsForm(false);
    setSelectedEditions(new Set());
  };

  // Add to library
  const handleAddToLibrary = async () => {
    if (!selectedMovie) return;

    try {
      setAdding(true);
      
      // Determine format from edition or default to Blu-ray
      let format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray' = 'Blu-ray';
      if (editionToAdd?.format) {
        if (editionToAdd.format.includes('4K') || editionToAdd.format.includes('UHD')) {
          format = '4K UHD';
        } else if (editionToAdd.format.includes('DVD')) {
          format = 'DVD';
        } else if (editionToAdd.format.includes('3D')) {
          format = '3D Blu-ray';
        }
      }
      
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
    setSearchQuery('');
    setMovieSearchResults([]);
    setSelectedMovie(null);
    setPhysicalEditions([]);
    setSelectedEditions(new Set());
    setEditionToAdd(null);
    setShowDetailsForm(false);
    setPurchaseDate('');
    setPurchasePrice('');
    setPurchaseLocation('');
    setCondition('New');
    setPersonalRating('');
    setNotes('');
    setCollectionType(defaultCollectionType);
  };

  const getFormatIcon = (format: string) => {
    if (format.includes('4K') || format.includes('UHD')) return Monitor;
    if (format.includes('DVD')) return FileVideo;
    if (format.includes('3D')) return Package;
    return Disc;
  };

  const getFormatBadgeColor = (format: string) => {
    if (format.includes('4K') || format.includes('UHD')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (format.includes('DVD')) return 'bg-red-100 text-red-800 border-red-200';
    if (format.includes('3D')) return 'bg-green-100 text-green-800 border-green-200';
    if (format.includes('Digital') || format.includes('Movies Anywhere')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
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
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Add to Library</h2>
            <p className="text-sm text-slate-600 mt-1">
              {!selectedMovie && 'Search for a movie or TV show'}
              {selectedMovie && !editionToAdd && 'Select physical media editions'}
              {selectedMovie && editionToAdd && 'Enter purchase details'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            
            {/* SECTION 1: Movie/TV Search - ALWAYS VISIBLE */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <Search className="h-5 w-5 mr-2 text-blue-600" />
                  Step 1: Search Movie or TV Show
                </h3>
                {selectedMovie && (
                  <button
                    onClick={handleClearMovie}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Change Movie
                  </button>
                )}
              </div>

              {/* Search Bar */}
              {!selectedMovie && (
                <>
                  <div className="flex space-x-2 mb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Search by title (e.g., 'The Equalizer', 'Inception')"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleMovieSearch}
                      disabled={searching || !searchQuery.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Search className="h-4 w-4" />
                      <span>{searching ? 'Searching...' : 'Search'}</span>
                    </button>
                  </div>

                  {/* Movie Search Results */}
                  {movieSearchResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm text-slate-600 mb-2">
                        Found {movieSearchResults.length} results - click to select:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                        {movieSearchResults.map((movie) => (
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
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <span>{movie.Year}</span>
                                <span>•</span>
                                <span className="capitalize">{movie.Type}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Selected Movie Display */}
              {selectedMovie && (
                <div className="flex items-start space-x-4 bg-white rounded-lg p-3 border border-slate-300">
                  {selectedMovie.Poster && selectedMovie.Poster !== 'N/A' ? (
                    <img
                      src={selectedMovie.Poster}
                      alt={selectedMovie.Title}
                      className="w-16 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-slate-300 rounded-lg flex items-center justify-center">
                      <Package className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">{selectedMovie.Title}</h3>
                    <p className="text-slate-600">{selectedMovie.Year} • {selectedMovie.Rated}</p>
                    {selectedMovie.Genre && selectedMovie.Genre !== 'N/A' && (
                      <p className="text-sm text-slate-500 mt-1">{selectedMovie.Genre}</p>
                    )}
                  </div>
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              )}
            </div>

            {/* SECTION 2: Physical Media Editions - SHOWS WHEN MOVIE SELECTED */}
            {selectedMovie && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                    <Disc className="h-5 w-5 mr-2 text-blue-600" />
                    Step 2: Select Physical Editions ({physicalEditions.length})
                  </h3>
                  {editionToAdd && (
                    <button
                      onClick={handleClearEdition}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Change Edition
                    </button>
                  )}
                </div>

                {loadingEditions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading physical media editions...</p>
                    </div>
                  </div>
                ) : editionToAdd ? (
                  // Show selected edition
                  <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-300">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Disc className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 mb-2">{editionToAdd.title}</h4>
                        <div className="space-y-1 text-sm">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getFormatBadgeColor(editionToAdd.format)}`}>
                            {editionToAdd.format}
                          </span>
                          {editionToAdd.edition && (
                            <div className="text-slate-700 mt-2">
                              <span className="font-medium">Edition:</span> {editionToAdd.edition}
                            </div>
                          )}
                          {editionToAdd.specs && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <div className="text-xs font-semibold text-blue-900 mb-1">Technical Specs</div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {editionToAdd.specs.video_resolution && (
                                  <div>{editionToAdd.specs.video_resolution}</div>
                                )}
                                {editionToAdd.specs.hdr_format && (
                                  <div>{editionToAdd.specs.hdr_format}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    </div>
                  </div>
                ) : (
                  // Show edition selection
                  <>
                    <p className="text-sm text-slate-600 mb-4">
                      Select one or more editions to add to your library. You can add multiple formats of the same title.
                    </p>

                    {physicalEditions.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
                        <Info className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600 mb-2">No physical editions found on blu-ray.com</p>
                        <p className="text-sm text-slate-500">You can still add this title manually</p>
                        <button
                          onClick={() => {
                            setEditionToAdd({
                              url: '',
                              title: selectedMovie.Title,
                              year: parseInt(selectedMovie.Year),
                              format: 'Blu-ray'
                            });
                            setShowDetailsForm(true);
                          }}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Continue Without Edition
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                          {physicalEditions.map((edition, index) => {
                            const isSelected = selectedEditions.has(edition.url);
                            const FormatIcon = getFormatIcon(edition.format);
                            
                            return (
                              <div
                                key={index}
                                onClick={() => toggleEditionSelection(edition.url)}
                                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600' : 'bg-slate-200'
                                  }`}>
                                    {isSelected ? (
                                      <Check className="h-5 w-5 text-white" />
                                    ) : (
                                      <FormatIcon className="h-5 w-5 text-slate-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-900">{edition.title}</h4>
                                    <div className="flex items-center flex-wrap gap-2 mt-1">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getFormatBadgeColor(edition.format)}`}>
                                        {edition.format}
                                      </span>
                                      {edition.edition && (
                                        <span className="text-xs text-slate-600 italic">{edition.edition}</span>
                                      )}
                                      {edition.studio && (
                                        <span className="text-xs text-slate-500">• {edition.studio}</span>
                                      )}
                                      {edition.releaseDate && (
                                        <span className="text-xs text-slate-500">• {edition.releaseDate}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <a
                                  href={edition.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-3 text-slate-400 hover:text-blue-600"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={handleProceedWithEditions}
                          disabled={selectedEditions.size === 0 || loadingEditionSpecs}
                          className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {loadingEditionSpecs ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Loading specs...</span>
                            </>
                          ) : (
                            <>
                              <span>Continue with {selectedEditions.size} Edition{selectedEditions.size !== 1 ? 's' : ''}</span>
                              <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* SECTION 3: Library Details Form - SHOWS WHEN EDITION SELECTED */}
            {showDetailsForm && editionToAdd && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-fadeIn">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Step 3: Enter Library Details
                </h3>

                <div className="space-y-6">
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
                              <ItemStatusBadge 
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
                  </div>

                  {/* Physical Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Add to Library Button */}
                  <button
                    onClick={handleAddToLibrary}
                    disabled={adding}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    {adding ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Adding to Library...</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-5 w-5" />
                        <span>Add to Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add fadeIn animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}