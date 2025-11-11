// src/components/AddToLibraryModal.tsx - MODIFIED WITH SMART LINKING
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
  AlertTriangle,
  Sparkles,
  Volume2,
  Info,
  ExternalLink,
  ChevronRight,
  Check,
  ChevronDown,
  Edit2,
  Plus,
  Tv,
  Copy,
  CheckCircle
} from 'lucide-react';
import { omdbApi } from '../lib/omdb';
import { ItemStatusBadge } from './ItemStatusBadge';
import type { PhysicalMediaCollection, CollectionType, BlurayTechnicalSpecs } from '../lib/supabase';

// NEW: Import the smart linking service
interface BlurayEditionInfo {
  url: string;
  editionName?: string;
  format?: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  id?: string;
}

// NEW: Smart linking service (inline for now, move to separate file later)
class BlurayLinkService {
  private readonly BLURAY_BASE_URL = 'https://www.blu-ray.com';

  generateGoogleSearchLink(title: string, year?: number): string {
    const searchQuery = year 
      ? `site:blu-ray.com "${title}" ${year}`
      : `site:blu-ray.com "${title}"`;
    return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  }

  generateBluraySearchLink(title: string, year?: number): string {
    const searchQuery = year ? `${title} ${year}` : title;
    return `${this.BLURAY_BASE_URL}/search/?quicksearch=1&quicksearch_keyword=${encodeURIComponent(searchQuery)}&section=bluraymovies`;
  }

  parseBlurayUrl(url: string): BlurayEditionInfo | null {
    try {
      const movieMatch = url.match(/blu-ray\.com\/movies\/([^/]+)\/(\d+)/i);
      
      if (movieMatch) {
        const editionSlug = movieMatch[1];
        const id = movieMatch[2];
        
        return {
          url,
          editionName: this.parseEditionName(editionSlug),
          format: this.detectFormatFromSlug(editionSlug),
          id
        };
      }

      const shortMatch = url.match(/blu-ray\.com\/([^/]+)\/(\d+)/i);
      if (shortMatch) {
        const editionSlug = shortMatch[1];
        const id = shortMatch[2];
        
        return {
          url,
          editionName: this.parseEditionName(editionSlug),
          format: this.detectFormatFromSlug(editionSlug),
          id
        };
      }

      return null;
    } catch (error) {
      console.error('[BlurayLink] Error parsing URL:', error);
      return null;
    }
  }

  private detectFormatFromSlug(slug: string): 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray' | undefined {
    const lowerSlug = slug.toLowerCase();
    
    if (lowerSlug.includes('-4k-') || lowerSlug.includes('-uhd-')) return '4K UHD';
    if (lowerSlug.includes('-3d-blu-ray') || lowerSlug.includes('-3d-')) return '3D Blu-ray';
    if (lowerSlug.includes('-blu-ray')) return 'Blu-ray';
    if (lowerSlug.includes('-dvd')) return 'DVD';
    
    return 'Blu-ray';
  }

  private parseEditionName(slug: string): string {
    let name = slug.replace(/-/g, ' ');
    name = name.replace(/\s+(Blu ray|DVD|4K|UHD|3D)\s*$/i, '');
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ').trim();
  }

  isBlurayUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.blu-ray.com' || urlObj.hostname === 'blu-ray.com';
    } catch {
      return false;
    }
  }
}

const blurayLinkService = new BlurayLinkService();

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
  
  // NEW: blu-ray.com linking state
  const [blurayUrl, setBlurayUrl] = useState('');
  const [parsedEdition, setParsedEdition] = useState<BlurayEditionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form visibility
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [format, setFormat] = useState<'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('Blu-ray');
  const [editionName, setEditionName] = useState('');
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'>('New');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionType, setCollectionType] = useState<CollectionType>(defaultCollectionType);

  // NEW: Parse blu-ray.com URL when user pastes it
  useEffect(() => {
    if (blurayUrl) {
      const parsed = blurayLinkService.parseBlurayUrl(blurayUrl);
      
      if (parsed) {
        setParsedEdition(parsed);
        
        // Auto-fill form
        if (parsed.format) setFormat(parsed.format);
        if (parsed.editionName) setEditionName(parsed.editionName);
        
        // Auto-advance to details form
        setTimeout(() => setShowDetailsForm(true), 500);
      }
    }
  }, [blurayUrl]);

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

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset all state
    setSearchQuery('');
    setMovieSearchResults([]);
    setSelectedMovie(null);
    setBlurayUrl('');
    setParsedEdition(null);
    setShowDetailsForm(false);
    setFormat('Blu-ray');
    setEditionName('');
    setCondition('New');
    setPurchaseDate('');
    setPurchasePrice('');
    setPurchaseLocation('');
    setPersonalRating('');
    setNotes('');
    setCollectionType(defaultCollectionType);
    onClose();
  };

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

  // STEP 2: Select Movie (now just loads details, no scraping)
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

  // NEW: Handle search link opening
  const handleOpenSearch = (type: 'google' | 'bluray') => {
    if (!selectedMovie) return;
    
    const movieTitle = selectedMovie.Title;
    const movieYear = parseInt(selectedMovie.Year);
    
    const url = type === 'google' 
      ? blurayLinkService.generateGoogleSearchLink(movieTitle, movieYear)
      : blurayLinkService.generateBluraySearchLink(movieTitle, movieYear);
    
    window.open(url, '_blank');
  };

  // NEW: Handle copy search text
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
        // NEW: Store blu-ray.com URL and edition name if provided
        edition_name: editionName || undefined,
        bluray_com_url: parsedEdition?.url || undefined
      };

      await onAdd(libraryItem);
      handleClose();
    } catch (error) {
      console.error('[AddToLibrary] Error adding to library:', error);
      alert('Failed to add to library. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const collectionTypeOptions = [
    { id: 'owned', label: 'Owned', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'loaned_out', label: 'Loaned Out', icon: UserCheck },
    { id: 'for_sale', label: 'For Sale', icon: DollarSign }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Add to My Library</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* SECTION 1: Movie/TV Search */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Search className="h-5 w-5 mr-2 text-blue-600" />
                Step 1: Search for Movie or TV Show
              </h3>

              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search by title..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleMovieSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    {searching ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Search Results */}
                {movieSearchResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                    {movieSearchResults.map((movie) => (
                      <button
                        key={movie.imdbID}
                        onClick={() => handleMovieSelect(movie)}
                        className="text-left hover:bg-blue-100 rounded-lg p-2 transition-colors border-2 border-transparent hover:border-blue-500"
                      >
                        {movie.Poster && movie.Poster !== 'N/A' ? (
                          <img
                            src={movie.Poster}
                            alt={movie.Title}
                            className="w-full h-40 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-40 bg-slate-200 rounded mb-2 flex items-center justify-center">
                            <FileVideo className="h-12 w-12 text-slate-400" />
                          </div>
                        )}
                        <p className="font-medium text-sm text-slate-900 line-clamp-2">{movie.Title}</p>
                        <p className="text-xs text-slate-500">{movie.Year}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Find Edition on blu-ray.com (NEW) */}
            {selectedMovie && !showDetailsForm && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 animate-fadeIn">
                <div className="flex items-start gap-4 mb-4">
                  {selectedMovie.Poster && selectedMovie.Poster !== 'N/A' && (
                    <img 
                      src={selectedMovie.Poster} 
                      alt={selectedMovie.Title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      Step 2: Find Your Edition
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selectedMovie.Title} ({selectedMovie.Year})
                    </p>
                  </div>
                </div>

                <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">
                        Why find your edition on blu-ray.com?
                      </h4>
                      <p className="text-sm text-slate-700">
                        blu-ray.com has detailed specs for every edition (Steelbooks, 4K, Collector's Editions, etc.). 
                        Find your exact disc and paste the URL below to auto-fill the format and edition name.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search Options */}
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleOpenSearch('google')}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 rounded-lg transition border-2 border-slate-200 hover:border-blue-500"
                    >
                      <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-slate-900 text-sm">Search Google</div>
                        <div className="text-xs text-slate-500">Most reliable</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenSearch('bluray')}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 rounded-lg transition border-2 border-slate-200 hover:border-blue-500"
                    >
                      <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-slate-900 text-sm">Search blu-ray.com</div>
                        <div className="text-xs text-slate-500">Direct search</div>
                      </div>
                    </button>
                  </div>

                  {/* Copy Search Text */}
                  <div className="bg-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600 font-medium">Search text:</span>
                      <button
                        onClick={handleCopySearchText}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
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
                    <code className="text-slate-900 font-mono text-sm">
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
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  
                  {parsedEdition && (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Edition detected: {parsedEdition.format} - {parsedEdition.editionName}
                    </div>
                  )}
                  
                  <p className="text-xs text-slate-500">
                    After finding your edition, copy the URL from your browser address bar and paste it here.
                  </p>
                </div>

                {/* Skip Option */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <button
                    onClick={() => setShowDetailsForm(true)}
                    className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1"
                  >
                    Skip and enter details manually
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 3: Library Details Form */}
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
                            className={`
                              flex items-center space-x-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
                              ${collectionType === type.id
                                ? 'border-blue-500 bg-blue-50 text-blue-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }
                            `}
                          >
                            <IconComponent className="h-4 w-4" />
                            <span>{type.label}</span>
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

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Condition *</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="New">New</option>
                      <option value="Like New">Like New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  {/* Purchase Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="0.00"
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
                        value={purchaseLocation}
                        onChange={(e) => setPurchaseLocation(e.target.value)}
                        placeholder="Best Buy, Amazon, etc."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDetailsForm(false)}
                      className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAddToLibrary}
                      disabled={adding}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
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