// src/components/AddToLibraryModal.tsx - SIMPLIFIED VERSION WITHOUT TECH SPECS SCRAPING
import React, { useState, useEffect } from 'react';
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
  Sparkles,
  ExternalLink,
  ChevronRight,
  Check,
  Plus,
  Copy
} from 'lucide-react';
import { omdbApi } from '../lib/omdb';
import { supabase } from '../lib/supabase';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';
import { blurayLinkService } from '../services/blurayLinkService';
import type { BlurayEditionInfo } from '../services/blurayLinkService';

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
  
  // blu-ray.com linking state
  const [blurayUrl, setBlurayUrl] = useState('');
  const [parsedEdition, setParsedEdition] = useState<BlurayEditionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form visibility
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Format and edition name state
  const [format, setFormat] = useState<'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('Blu-ray');
  const [editionName, setEditionName] = useState('');

  // Form state
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'>('New');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionType, setCollectionType] = useState<CollectionType>(defaultCollectionType);

  // Add state for extracted data
  const [extractedSpecs, setExtractedSpecs] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [specsCollapsed, setSpecsCollapsed] = useState(true);
  const [ratingsCollapsed, setRatingsCollapsed] = useState(true);

  // Handle Esc key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen]);

  // Parse blu-ray.com URL (no specs fetching)
  useEffect(() => {
    if (blurayUrl) {
      const parsed = blurayLinkService.parseBlurayUrl(blurayUrl);
      
      if (parsed) {
        setParsedEdition(parsed);
        if (parsed.format) setFormat(parsed.format);
        if (parsed.editionName) setEditionName(parsed.editionName);
        
        // Fetch and extract specs
        fetchAndExtractSpecs(blurayUrl);
        
        // Auto-advance to details form (but keep Step 2 visible)
        setShowDetailsForm(true);
      }
    }
  }, [blurayUrl]);

  // New function to fetch specs
  const fetchAndExtractSpecs = async (url: string) => {
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-bluray-page', {
        body: { url }
      });
    
      if (error) throw error;
    
      setExtractedSpecs(data);
      console.log('[AddToLibrary] Extracted specs:', data);
    } catch (error) {
      console.error('[AddToLibrary] Failed to extract specs:', error);
    } finally {
      setExtracting(false);
    }
  };

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

  // STEP 2: Select Movie
  const handleMovieSelect = async (movie: any) => {
    try {
      console.log('[AddToLibrary] Selected movie:', movie.Title);
      
      // Get full movie details from OMDb
      const details = await omdbApi.getMovieDetails(movie.imdbID);
      setSelectedMovie(details);
      
      // Clear previous blu-ray URL and form
      setBlurayUrl('');
      setParsedEdition(null);
      setShowDetailsForm(false);
      
    } catch (error) {
      console.error('[AddToLibrary] Error fetching movie details:', error);
      alert('Failed to load movie details. Please try again.');
    }
  };

  // Handle search link opening
  const handleOpenSearch = (type: 'google' | 'bluray') => {
    if (!selectedMovie) return;
    
    const movieTitle = selectedMovie.Title;
    const movieYear = parseInt(selectedMovie.Year);
    
    const url = type === 'google' 
      ? blurayLinkService.generateGoogleSearchLink(movieTitle, movieYear)
      : blurayLinkService.generateBluraySearchLink(movieTitle, movieYear);
    
    window.open(url, '_blank');
  };

  // Handle copy search text
  const handleCopySearchText = () => {
    if (!selectedMovie) return;
    
    const searchText = `${selectedMovie.Title} ${selectedMovie.Year}`;
    navigator.clipboard.writeText(searchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add to library
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
        collection_type: collectionType,
        edition_name: editionName || undefined,
        bluray_com_url: parsedEdition?.url || undefined
        // Technical specs will be scraped in background and shown in detail modal
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
    setShowDetailsForm(false);
    setPurchaseDate('');
    setPurchasePrice('');
    setPurchaseLocation('');
    setCondition('New');
    setPersonalRating('');
    setNotes('');
    setCollectionType(defaultCollectionType);
    setBlurayUrl('');
    setParsedEdition(null);
    setFormat('Blu-ray');
    setEditionName('');
    setExtractedSpecs(null);
    setExtracting(false);
    setSpecsCollapsed(true);
    setRatingsCollapsed(true);
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
      {/* Backdrop - Click to close */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Add to Library</h2>
            <p className="text-sm text-slate-600 mt-1">
              {!selectedMovie && 'Search for a movie or TV show'}
              {selectedMovie && !showDetailsForm && 'Find your edition on blu-ray.com (optional)'}
              {selectedMovie && showDetailsForm && 'Enter purchase details'}
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
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                <Search className="h-5 w-5 mr-2 text-blue-600" />
                Step 1: Search Movie or TV Show
              </h3>

              {/* Search Bar - ALWAYS VISIBLE */}
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

              {/* Movie Search Results - ALWAYS VISIBLE IF THERE ARE RESULTS */}
              {movieSearchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm text-slate-600 mb-2">
                    Found {movieSearchResults.length} results:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[500px] overflow-y-auto">
                    {movieSearchResults.map((movie) => {
                      const isSelected = selectedMovie?.imdbID === movie.imdbID;
                      const tmdbUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(movie.Title)}`;
                      
                      return (
                        <div
                          key={movie.imdbID}
                          className={`group relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all ${
                            isSelected ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          {/* Poster - Clickable to view on TMDB */}
                          <div 
                            className="aspect-[2/3] bg-slate-200 relative overflow-hidden cursor-pointer"
                            onClick={() => window.open(tmdbUrl, '_blank')}
                          >
                            {movie.Poster && movie.Poster !== 'N/A' ? (
                              <img
                                src={movie.Poster}
                                alt={movie.Title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {movie.Type === 'series' ? (
                                  <Monitor className="h-12 w-12 text-slate-400" />
                                ) : (
                                  <FileVideo className="h-12 w-12 text-slate-400" />
                                )}
                              </div>
                            )}

                            {/* Upper Left: Rating Badge */}
                            {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                  <span className="text-white text-xs font-semibold">
                                    {parseFloat(movie.imdbRating).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Upper Right: View on TMDB Button */}
                            <a
                              href={tmdbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors z-10"
                              title="View on TMDB"
                            >
                              <Plus className="h-4 w-4 text-slate-600" />
                            </a>

                            {/* Lower Right: Media Type Badge */}
                            <div className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                              {movie.Type === 'series' ? 'TV' : 'Movie'}
                            </div>
                          </div>

                          {/* Item Info */}
                          <div className="p-3 bg-white">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 flex-1">
                                {movie.Title}
                              </h4>
                              {/* Add Disc Icon */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovieSelect(movie);
                                }}
                                className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
                                  isSelected 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600'
                                }`}
                                title="Add to library"
                              >
                                <Disc className="h-4 w-4" />
                              </button>
                            </div>
                            {movie.Year && (
                              <div className="flex items-center text-xs text-slate-500 mt-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                {movie.Year}
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

            {/* SECTION 2: Find Edition on blu-ray.com - ALWAYS VISIBLE WHEN MOVIE SELECTED */}
            {selectedMovie && (
              <div className="bg-purple-50 rounded-lg border border-purple-200 overflow-hidden animate-fadeIn">
                {/* Header - Always visible, no collapse */}
                <div className="flex items-center justify-between p-4 border-b border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {parsedEdition ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Disc className="w-5 h-5 text-purple-600" />
                      )}
                      <h3 className="text-lg font-semibold text-slate-900">
                        Step 2: Find Your Edition (Optional)
                      </h3>
                    </div>
                    {parsedEdition && (
                      <span className="text-sm text-green-600 font-medium">
                        {parsedEdition.format} - {parsedEdition.editionName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content - Always visible */}
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedMovie.Poster && selectedMovie.Poster !== 'N/A' && (
                      <img 
                        src={selectedMovie.Poster} 
                        alt={selectedMovie.Title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 mb-2">
                        {selectedMovie.Title} ({selectedMovie.Year})
                      </p>
                      <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-700">
                              Find your exact disc on blu-ray.com to auto-fill format and edition name. Technical specifications will be loaded in the background after adding to library.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Options */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenSearch('google')}
                        className="flex items-center gap-2 p-2 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 hover:border-blue-500"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-medium text-slate-900 text-xs">Search Google</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleOpenSearch('bluray')}
                        className="flex items-center gap-2 p-2 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 hover:border-blue-500"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-medium text-slate-900 text-xs">Search blu-ray.com</div>
                        </div>
                      </button>
                    </div>

                    {/* Copy Search Text */}
                    <div className="bg-slate-100 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600 font-medium">Search text:</span>
                        <button
                          onClick={handleCopySearchText}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <code className="text-slate-900 font-mono text-xs">
                        {selectedMovie.Title} {selectedMovie.Year}
                      </code>
                    </div>
                  </div>

                  {/* Paste URL Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Paste edition URL from blu-ray.com:
                    </label>
                    <input
                      type="text"
                      value={blurayUrl}
                      onChange={(e) => setBlurayUrl(e.target.value)}
                      placeholder="https://www.blu-ray.com/movies/Iron-Man-4K-Blu-ray/225134/"
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    />
                    
                    {parsedEdition && (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <Check className="w-4 h-4" />
                        Edition detected: {parsedEdition.format} - {parsedEdition.editionName}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500">
                      After finding your edition, copy the URL from your browser address bar and paste it here.
                    </p>
                  </div>

                  {/* Skip Option */}
                  <div className="border-t border-slate-200 pt-3">
                    <button
                      onClick={() => setShowDetailsForm(true)}
                      className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1"
                    >
                      Skip and enter details manually
                      <ChevronRight className="w-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Library Details Form - SHOWS WHEN DETAILS FORM SHOWN */}
            {showDetailsForm && selectedMovie && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 animate-fadeIn">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-green-600" />
                  Step 3: Enter Library Details
                </h3>

                <div className="space-y-6">
                  {/* Item Status Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Item Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {collectionTypeOptions.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setCollectionType(type.id as CollectionType)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${collectionType === type.id ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                          >
                            <IconComponent className="h-4 w-4" />
                            <span>{type.label.replace('Add to Library', 'Owned').replace('Add to ', '').replace('Mark for Sale', 'For Sale')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Format and Edition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Format *
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="DVD">DVD</option>
                        <option value="Blu-ray">Blu-ray</option>
                        <option value="4K UHD">4K UHD</option>
                        <option value="3D Blu-ray">3D Blu-ray</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Edition Name
                      </label>
                      <input
                        type="text"
                        value={editionName}
                        onChange={(e) => setEditionName(e.target.value)}
                        placeholder="e.g., Steelbook, Collector's Edition"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tech Specs Section - Collapsible */}
                  {extractedSpecs && (
                    <div className="border border-blue-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSpecsCollapsed(!specsCollapsed)}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition"
                      >
                        <div className="flex items-center gap-2">
                          <FileVideo className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-slate-900">Technical Specifications</span>
                          {extracting && <span className="text-xs text-slate-500">(extracting...)</span>}
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${specsCollapsed ? '' : 'rotate-90'}`} />
                      </button>
                      
                      {!specsCollapsed && (
                        <div className="p-4 bg-white space-y-3 text-sm">
                          {extractedSpecs.video_codec && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Video Codec:</span>
                              <span className="font-medium">{extractedSpecs.video_codec}</span>
                            </div>
                          )}
                          {extractedSpecs.video_resolution && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Resolution:</span>
                              <span className="font-medium">{extractedSpecs.video_resolution}</span>
                            </div>
                          )}
                          {extractedSpecs.hdr_format && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">HDR:</span>
                              <span className="font-medium">{extractedSpecs.hdr_format.join(', ')}</span>
                            </div>
                          )}
                          {extractedSpecs.aspect_ratio && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Aspect Ratio:</span>
                              <span className="font-medium">{extractedSpecs.aspect_ratio}</span>
                            </div>
                          )}
                          {extractedSpecs.original_aspect_ratio && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Original Aspect Ratio:</span>
                              <span className="font-medium">{extractedSpecs.original_aspect_ratio}</span>
                            </div>
                          )}
                          {extractedSpecs.audio_tracks && extractedSpecs.audio_tracks.length > 0 && (
                            <div>
                              <span className="text-slate-600 block mb-1">Audio:</span>
                              <div className="space-y-1 ml-4">
                                {extractedSpecs.audio_tracks.map((track: string, i: number) => (
                                  <div key={i} className="text-slate-700">{track}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          {extractedSpecs.subtitles && extractedSpecs.subtitles.length > 0 && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Subtitles:</span>
                              <span className="font-medium">{extractedSpecs.subtitles.join(', ')}</span>
                            </div>
                          )}
                          {extractedSpecs.discs && extractedSpecs.discs.length > 0 && (
                            <div>
                              <span className="text-slate-600 block mb-1">Discs:</span>
                              <div className="space-y-1 ml-4">
                                {extractedSpecs.discs.map((disc: string, i: number) => (
                                  <div key={i} className="text-slate-700">{disc}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          {extractedSpecs.digital_copy_included !== undefined && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Digital Copy:</span>
                              <span className={`font-medium ${extractedSpecs.digital_copy_included ? 'text-green-600' : 'text-slate-400'}`}>
                                {extractedSpecs.digital_copy_included ? 'Yes' : 'No'}
                              </span>
                            </div>
                          )}
                          {extractedSpecs.packaging && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Packaging:</span>
                              <span className="font-medium">{extractedSpecs.packaging}</span>
                            </div>
                          )}
                          {extractedSpecs.playback_info && (
                            <div className="flex">
                              <span className="text-slate-600 w-40">Playback:</span>
                              <span className="font-medium">{extractedSpecs.playback_info}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Blu-ray.com Ratings Section - Collapsible */}
                  {extractedSpecs && (                    
                    <div className="border border-purple-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setRatingsCollapsed(!ratingsCollapsed)}
                        className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-slate-900">Blu-ray.com User Ratings</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${ratingsCollapsed ? '' : 'rotate-90'}`} />
                      </button>
                      
                      {!ratingsCollapsed && (
                        <div className="p-4 bg-white space-y-3">
                          {/* Video 4K */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">Video 4K</span>
                            <div className="flex items-center gap-2">
                              {extractedSpecs.bluray_video_4k_rating ? (
                                <>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= extractedSpecs.bluray_video_4k_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="font-semibold text-slate-900">{extractedSpecs.bluray_video_4k_rating}/5</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Not rated</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Video 2K */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">Video 2K</span>
                            <div className="flex items-center gap-2">
                              {extractedSpecs.bluray_video_2k_rating ? (
                                <>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= extractedSpecs.bluray_video_2k_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="font-semibold text-slate-900">{extractedSpecs.bluray_video_2k_rating}/5</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Not rated</span>
                              )}
                            </div>
                          </div>
                          
                          {/* 3D */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">3D</span>
                            <div className="flex items-center gap-2">
                              {extractedSpecs.bluray_3d_rating ? (
                                <>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= extractedSpecs.bluray_3d_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="font-semibold text-slate-900">{extractedSpecs.bluray_3d_rating}/5</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Not rated</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Audio */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">Audio</span>
                            <div className="flex items-center gap-2">
                              {extractedSpecs.bluray_audio_rating ? (
                                <>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= extractedSpecs.bluray_audio_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="font-semibold text-slate-900">{extractedSpecs.bluray_audio_rating}/5</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Not rated</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Extras */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">Special Features</span>
                            <div className="flex items-center gap-2">
                              {extractedSpecs.bluray_extras_rating ? (
                                <>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= extractedSpecs.bluray_extras_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="font-semibold text-slate-900">{extractedSpecs.bluray_extras_rating}/5</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Not rated</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Overall */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-slate-900 font-semibold">Overall</span>
                            <div className="flex items-center gap-2">
                              {extractedSpecs.bluray_overall_rating ? (
                                <>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-5 h-5 ${star <= extractedSpecs.bluray_overall_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="font-bold text-slate-900 text-lg">{extractedSpecs.bluray_overall_rating}/5</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Not rated</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Condition */}
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