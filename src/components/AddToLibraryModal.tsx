// src/components/AddToLibraryModal.tsx - FIXED VERSION WITH ALWAYS-VISIBLE STEP 2 AND PROMINENT SPECS
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
  RefreshCw,
  ChevronUp
} from 'lucide-react';
import { omdbApi } from '../lib/omdb';
import { blurayApi } from '../lib/blurayApi';
import { ItemStatusBadge } from './ItemStatusBadge';
import type { PhysicalMediaCollection, CollectionType, BlurayTechnicalSpecs } from '../lib/supabase';
import { blurayLinkService } from '../services/blurayLinkService';
import type { BlurayEditionInfo } from '../services/blurayLinkService';

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
  
  // NEW: blu-ray.com linking state
  const [blurayUrl, setBlurayUrl] = useState('');
  const [parsedEdition, setParsedEdition] = useState<BlurayEditionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  
  // NEW: Technical specs state
  const [technicalSpecs, setTechnicalSpecs] = useState<BlurayTechnicalSpecs | null>(null);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(true);
  
  // NEW: Step 2 collapsed state
  const [step2Collapsed, setStep2Collapsed] = useState(false);
  
  // Selected edition for adding
  const [editionToAdd, setEditionToAdd] = useState<SelectedEdition | null>(null);
  const [loadingEditionSpecs, setLoadingEditionSpecs] = useState(false);
  
  // Form visibility
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // NEW: Format and edition name state (moved from inline to allow pre-filling)
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

  // NEW: Parse blu-ray.com URL and fetch technical specs
  useEffect(() => {
    if (blurayUrl) {
      const parsed = blurayLinkService.parseBlurayUrl(blurayUrl);
      
      if (parsed) {
        setParsedEdition(parsed);
        
        // Auto-fill form
        if (parsed.format) setFormat(parsed.format);
        if (parsed.editionName) setEditionName(parsed.editionName);
        
        // Automatically fetch technical specs
        fetchTechnicalSpecs(blurayUrl);
        
        // Auto-advance to details form and collapse Step 2
        setTimeout(() => {
          setShowDetailsForm(true);
          setStep2Collapsed(true);
        }, 800);
      }
    }
  }, [blurayUrl]);

  // NEW: Fetch technical specs from blu-ray.com
  const fetchTechnicalSpecs = async (url: string) => {
    try {
      setLoadingSpecs(true);
      setSpecsError(null);
      console.log('[AddToLibrary] Fetching technical specs from:', url);
      
      const specs = await blurayApi.scrapeDiscDetails(url);
      
      if (specs) {
        setTechnicalSpecs(specs);
        console.log('[AddToLibrary] Technical specs loaded:', specs);
      } else {
        setSpecsError('No technical specifications found on this page.');
      }
    } catch (error) {
      console.error('[AddToLibrary] Error fetching technical specs:', error);
      setSpecsError('Failed to load technical specifications. You can still add the item.');
    } finally {
      setLoadingSpecs(false);
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
      setTechnicalSpecs(null);
      setSpecsError(null);
      setShowDetailsForm(false);
      setStep2Collapsed(false);
      
    } catch (error) {
      console.error('[AddToLibrary] Error fetching movie details:', error);
      alert('Failed to load movie details. Please try again.');
    }
  };

  // Clear selected edition and go back to editions
  const handleClearEdition = () => {
    setEditionToAdd(null);
    setShowDetailsForm(false);
    setSelectedEditions(new Set());
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

  // NEW: Retry fetching specs
  const handleRetrySpecs = () => {
    if (blurayUrl) {
      fetchTechnicalSpecs(blurayUrl);
    }
  };

  // NEW: Edit Step 2 (expand and go back)
  const handleEditStep2 = () => {
    setStep2Collapsed(false);
    setShowDetailsForm(false);
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
        // NEW: Store blu-ray.com URL, edition name, and technical specs
        edition_name: editionName || undefined,
        bluray_com_url: parsedEdition?.url || undefined,
        technical_specs: technicalSpecs || undefined
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
    // NEW: Reset blu-ray.com linking state
    setBlurayUrl('');
    setParsedEdition(null);
    setFormat('Blu-ray');
    setEditionName('');
    setTechnicalSpecs(null);
    setSpecsError(null);
    setStep2Collapsed(false);
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
              {selectedMovie && !showDetailsForm && 'Find your edition on blu-ray.com'}
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

                            {/* Upper Left: Rating Badge (if available) */}
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
                              <Plus className="h-4 w-4 text-slate-600 hover:text-purple-500" />
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
              <div className={`bg-purple-50 rounded-lg border border-purple-200 overflow-hidden animate-fadeIn ${
                step2Collapsed ? 'cursor-pointer hover:bg-purple-100' : ''
              }`}>
                {/* Header - Always visible, collapsible when in Step 3 */}
                <div 
                  className={`flex items-center justify-between p-4 ${step2Collapsed ? '' : 'border-b border-purple-200'}`}
                  onClick={step2Collapsed ? () => setStep2Collapsed(false) : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {parsedEdition ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Disc className="w-5 h-5 text-purple-600" />
                      )}
                      <h3 className="text-lg font-semibold text-slate-900">
                        Step 2: Find Your Edition
                      </h3>
                    </div>
                    {parsedEdition && (
                      <span className="text-sm text-green-600 font-medium">
                        {parsedEdition.format} - {parsedEdition.editionName}
                      </span>
                    )}
                  </div>
                  {step2Collapsed && (
                    <button className="text-purple-600 hover:text-purple-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Content - Hidden when collapsed */}
                {!step2Collapsed && (
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
                                Find your exact disc on blu-ray.com to auto-fill format, edition name, and technical specifications.
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

                    {/* Technical Specs Loading/Display */}
                    {loadingSpecs && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <p className="text-xs text-blue-900">Loading technical specifications...</p>
                        </div>
                      </div>
                    )}

                    {specsError && !loadingSpecs && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-900">{specsError}</p>
                          </div>
                          <button
                            onClick={handleRetrySpecs}
                            className="flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-900"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Skip Option */}
                    {!parsedEdition && (
                      <div className="border-t border-slate-200 pt-3">
                        <button
                          onClick={() => {
                            setShowDetailsForm(true);
                            setStep2Collapsed(true);
                          }}
                          className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1"
                        >
                          Skip and enter details manually
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                  {/* Technical Specs Display - Prominent at top of form */}
                  {technicalSpecs && (
                    <div className="bg-white border-2 border-green-500 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setShowSpecs(!showSpecs)}
                        className="w-full flex items-center justify-between p-4 hover:bg-green-50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-900">
                            Technical Specifications Loaded
                          </span>
                        </div>
                        {showSpecs ? (
                          <ChevronUp className="w-4 h-4 text-green-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-green-700" />
                        )}
                      </button>
                      
                      {showSpecs && (
                        <div className="p-4 bg-white border-t border-green-200 space-y-4 text-sm">
                          {/* Video Specs */}
                          {(technicalSpecs.video_codec || technicalSpecs.video_resolution || technicalSpecs.aspect_ratio || technicalSpecs.hdr_format) && (
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-blue-600" />
                                Video
                              </h5>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {technicalSpecs.video_codec && (
                                  <div>
                                    <span className="text-slate-600">Codec:</span>{' '}
                                    <span className="font-medium text-slate-900">{technicalSpecs.video_codec}</span>
                                  </div>
                                )}
                                {technicalSpecs.video_resolution && (
                                  <div>
                                    <span className="text-slate-600">Resolution:</span>{' '}
                                    <span className="font-medium text-slate-900">{technicalSpecs.video_resolution}</span>
                                  </div>
                                )}
                                {technicalSpecs.aspect_ratio && (
                                  <div>
                                    <span className="text-slate-600">Aspect ratio:</span>{' '}
                                    <span className="font-medium text-slate-900">{technicalSpecs.aspect_ratio}</span>
                                  </div>
                                )}
                                {technicalSpecs.hdr_format && (
                                  <div>
                                    <span className="text-slate-600">HDR:</span>{' '}
                                    <span className="font-medium text-slate-900">
                                      {Array.isArray(technicalSpecs.hdr_format) 
                                        ? technicalSpecs.hdr_format.join(', ') 
                                        : technicalSpecs.hdr_format}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Audio Specs */}
                          {(technicalSpecs.audio_codecs?.length > 0 || technicalSpecs.audio_channels?.length > 0) && (
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-green-600" />
                                Audio
                              </h5>
                              <div className="space-y-1 text-xs">
                                {technicalSpecs.audio_codecs?.map((codec, index) => {
                                  const channel = technicalSpecs.audio_channels?.[index];
                                  const language = technicalSpecs.audio_languages?.[index];
                                  return (
                                    <div key={index} className="text-slate-700">
                                      • {codec}
                                      {channel && ` (${channel})`}
                                      {language && ` - ${language}`}
                                    </div>
                                  );
                                })}
                                {technicalSpecs.audio_codecs?.length > 3 && (
                                  <div className="text-slate-500 italic">
                                    + {technicalSpecs.audio_codecs.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Subtitles */}
                          {technicalSpecs.subtitles && technicalSpecs.subtitles.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2">Subtitles</h5>
                              <div className="text-xs text-slate-700">
                                {technicalSpecs.subtitles.join(', ')}
                              </div>
                            </div>
                          )}

                          {/* Disc Info */}
                          {(technicalSpecs.disc_format || technicalSpecs.region_codes) && (
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Disc className="w-4 h-4 text-purple-600" />
                                Disc
                              </h5>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {technicalSpecs.disc_format && (
                                  <div>
                                    <span className="text-slate-600">Format:</span>{' '}
                                    <span className="font-medium text-slate-900">{technicalSpecs.disc_format}</span>
                                  </div>
                                )}
                                {technicalSpecs.region_codes && (
                                  <div>
                                    <span className="text-slate-600">Region:</span>{' '}
                                    <span className="font-medium text-slate-900">
                                      {Array.isArray(technicalSpecs.region_codes) 
                                        ? technicalSpecs.region_codes.join(', ') 
                                        : technicalSpecs.region_codes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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