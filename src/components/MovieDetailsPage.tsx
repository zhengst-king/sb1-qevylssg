// src/components/MovieDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin,
  User,
  Users,
  Award,
  DollarSign,
  Globe,
  ExternalLink,
  MessageSquare,
  Eye,
  Film,
  Heart,
  X,
  Package,
  Check
} from 'lucide-react';
import { Movie, supabase } from '../lib/supabase';
import { ReviewModal } from './ReviewModal';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { MovieCastSection } from './MovieCastSection';
import { MovieRecommendations } from './MovieRecommendations';
import { tmdbService, TMDBMovieDetails } from '../lib/tmdb';
import WatchProvidersDisplay from './WatchProvidersDisplay';
import { favoriteFranchisesService } from '../services/favoriteFranchisesService';
import { PersonDetailsModal } from './PersonDetailsModal';
import { useCustomCollections } from '../hooks/useCustomCollections';
import { customCollectionsService } from '../services/customCollectionsService';
import type { CustomCollection } from '../types/customCollections';
import { CustomCollectionDetailModal } from './CustomCollectionDetailModal';

interface MovieDetailsPageProps {
  movie: Movie;
  onBack: () => void;
  onUpdateStatus?: (id: string, status: Movie['status']) => void;
  onUpdateRating?: (id: string, rating: number | null) => void;
  onUpdateMovie?: (id: string, updates: Partial<Movie>) => void;
  onViewRecommendation?: (movie: Movie) => void;
  onMovieAddedToWatchlist?: () => void;
}

export function MovieDetailsPage({ 
  movie, 
  onBack, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie,
  onViewRecommendation,
  onMovieAddedToWatchlist
}: MovieDetailsPageProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateWatchedError, setDateWatchedError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isFranchiseFavorite, setIsFranchiseFavorite] = useState(false);
  const [togglingFranchiseFavorite, setTogglingFranchiseFavorite] = useState(false);

  // Local state for immediate UI updates
  const [localRating, setLocalRating] = useState<number | null>(movie.user_rating || null);
  const [localStatus, setLocalStatus] = useState<Movie['status']>(movie.status);
  const [localReview, setLocalReview] = useState<string | null>(movie.user_review || null);
  const [localDateWatched, setLocalDateWatched] = useState<string | null>(movie.date_watched || null);
  const [tmdbData, setTmdbData] = useState<TMDBMovieDetails | null>(null);

  const [showPersonDetailsModal, setShowPersonDetailsModal] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string>('');
  const [selectedPersonType, setSelectedPersonType] = useState<'cast' | 'crew'>('cast');

  // Custom Collections state
  const { collections: customCollections } = useCustomCollections();
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollections, setAddingToCollections] = useState(false);

  const [movieCollections, setMovieCollections] = useState<CustomCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionToView, setSelectedCollectionToView] = useState<CustomCollection | null>(null);

  const handleRecommendationClick = (clickedMovie: Movie) => {
    if (onViewRecommendation) {
      onViewRecommendation(clickedMovie);
    }
  };

  const handleOpenPersonDetails = (tmdbPersonId: number, personName: string, personType: 'cast' | 'crew') => {
    setSelectedPersonId(tmdbPersonId);
    setSelectedPersonName(personName);
    setSelectedPersonType(personType);
    setShowPersonDetailsModal(true);
  };

  const handleOpenSeriesDetails = (series: Movie) => {
    console.log('[MovieDetailsPage] Series clicked from PersonDetailsModal:', series.title);
    // MovieDetailsPage doesn't have episodes modal, so we'll show a helpful message
    alert(`"${series.title}" is a TV series. Please view it from your TV Watchlist to see episodes.`);
  };

  // Update local state when movie prop changes
  useEffect(() => {
    setLocalRating(movie.user_rating || null);
    setLocalStatus(movie.status);
    setLocalReview(movie.user_review || null);
    setLocalDateWatched(movie.date_watched || null);
  }, [movie.user_rating, movie.status, movie.user_review, movie.date_watched]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onBack]);

  // Fetch TMDB data for recommendations
  useEffect(() => {
    const fetchTMDBData = async () => {
      if (movie.imdb_id) {
        try {
          const data = await tmdbService.getMovieByImdbId(movie.imdb_id);
          setTmdbData(data);
        } catch (error) {
          console.error('Error fetching TMDB movie data:', error);
        }
      }
    };

    fetchTMDBData();
  }, [movie.imdb_id, movie.id]);

  // Check if franchise is favorited
  useEffect(() => {
    const checkFranchiseFavorite = async () => {
      if (tmdbData?.belongs_to_collection) {
        const isFav = await favoriteFranchisesService.isFavorite(
          tmdbData.belongs_to_collection.id
        );
        setIsFranchiseFavorite(isFav);
      }
    };
    checkFranchiseFavorite();
  }, [tmdbData?.belongs_to_collection?.id]);

  // Fetch collections that contain this movie
  useEffect(() => {
    const fetchMovieCollections = async () => {
      if (!movie.id) return;
      
      setLoadingCollections(true);
      try {
        const collections = await customCollectionsService.getCollectionsForItem(movie.id);
        setMovieCollections(collections);
      } catch (error) {
        console.error('Error fetching movie collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchMovieCollections();
  }, [movie.id]);

  const handleStatusChange = async (status: Movie['status']) => {
    setLocalStatus(status);
    setIsUpdating(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(movie.id!, status);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRatingChange = async (rating: number | null) => {
    setLocalRating(rating);
    setIsUpdating(true);
    try {
      if (onUpdateRating) {
        await onUpdateRating(movie.id!, rating);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDateWatchedChange = async (dateString: string) => {
    if (dateString && !isValidWatchDate(dateString)) {
      setDateWatchedError('Date cannot be in the future');
      return;
    }
    
    setDateWatchedError(null);
    setLocalDateWatched(dateString || null);
    setIsUpdating(true);
    try {
      if (onUpdateMovie) {
        await onUpdateMovie(movie.id!, { date_watched: dateString || null });
      }
    } catch (err) {
      setDateWatchedError('Failed to update watch date');
      console.error('Failed to update watch date:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveReview = async (review: string) => {
    setLocalReview(review);
    setIsUpdating(true);
    try {
      if (onUpdateMovie) {
        await onUpdateMovie(movie.id!, { user_review: review });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: Movie['status']) => {
    switch (status) {
      case 'To Watch': return 'bg-blue-100 text-blue-800';
      case 'Watching': return 'bg-yellow-100 text-yellow-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'To Watch Again': return 'bg-purple-100 text-purple-800';
      case 'Upcoming': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggleFranchiseFavorite = async () => {
    if (!tmdbData?.belongs_to_collection || togglingFranchiseFavorite) return;

    setTogglingFranchiseFavorite(true);
    try {
      if (isFranchiseFavorite) {
        const success = await favoriteFranchisesService.removeFavorite(
          tmdbData.belongs_to_collection.id
        );
        if (success) {
          setIsFranchiseFavorite(false);
        }
      } else {
        const added = await favoriteFranchisesService.addFavorite({
          tmdb_collection_id: tmdbData.belongs_to_collection.id,
          collection_name: tmdbData.belongs_to_collection.name,
          poster_path: tmdbData.belongs_to_collection.poster_path || undefined,
          backdrop_path: tmdbData.belongs_to_collection.backdrop_path || undefined
        });
        if (added) {
          setIsFranchiseFavorite(true);
        }
      }
    } catch (error) {
      console.error('Error toggling franchise favorite:', error);
    } finally {
      setTogglingFranchiseFavorite(false);
    }
  };

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId);
      } else {
        newSet.add(collectionId);
      }
      return newSet;
    });
  };

  const handleAddToCollections = async () => {
    if (selectedCollections.size === 0) return;

    setAddingToCollections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add movie to each selected collection
      for (const collectionId of selectedCollections) {
        if (movie.id) {
          await customCollectionsService.addItemToCollection(movie.id, collectionId);
        }
      }

      // Refresh the collections list
      const updatedCollections = await customCollectionsService.getCollectionsForItem(movie.id!);
      setMovieCollections(updatedCollections);

      alert(`Added "${movie.title}" to ${selectedCollections.size} collection(s)!`);
      setShowCollectionSelector(false);
      setSelectedCollections(new Set());
    } catch (error) {
      console.error('Error adding to collections:', error);
      alert('Failed to add to collections. Please try again.');
    } finally {
      setAddingToCollections(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Movies</span>
              </button>

              <div className="flex items-center space-x-3">
                <Film className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h1 className="text-2xl font-bold text-slate-900">{movie.title}</h1>
                    
                    {movie.year && (
                      <div className="flex items-center space-x-1 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>{movie.year}</span>
                      </div>
                    )}
                    
                    {movie.rated && (
                      <div className="flex items-center space-x-1 text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        <span>Rated {movie.rated}</span>
                      </div>
                    )}
                    
                    {movie.genre && movie.genre !== 'N/A' && (
                      <div className="flex flex-wrap gap-1">
                        {movie.genre.split(',').slice(0, 3).map((genre, index) => {
                          const trimmedGenre = genre.trim();
                          return trimmedGenre && (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {trimmedGenre}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side can be used for additional controls if needed */}
            <div className="flex items-center space-x-3">
              {movie.updated_at && (
                <span className="text-sm text-slate-500" title={formatExactTimestamp(movie.updated_at)}>
                  Updated {formatRelativeTime(movie.updated_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-6xl mx-auto p-6 space-y-4">
          {/* Details Section - White Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {/* Flat Metadata Grid - TV Episode Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {movie.runtime && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <Clock className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Runtime:</span> {movie.runtime} min
                  </div>
                </div>
              )}

              {movie.actors && (
                <div className="flex items-start space-x-2 text-slate-600 text-sm">
                  <Users className="h-4 w-4 mt-0.5" />
                  <div>
                    <span className="font-medium">Stars:</span> {movie.actors}
                  </div>
                </div>
              )}

              {movie.country && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <MapPin className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Country:</span> {movie.country}
                  </div>
                </div>
              )}

              {movie.language && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <Globe className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Language:</span> {movie.language}
                  </div>
                </div>
              )}

              {movie.awards && (
                <div className="flex items-start space-x-2 text-slate-600 text-sm">
                  <Award className="h-4 w-4 mt-0.5" />
                  <div>
                    <span className="font-medium">Awards:</span> {movie.awards}
                  </div>
                </div>
              )}

              {movie.director && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <User className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Director:</span> {movie.director}
                  </div>
                </div>
              )}

              {movie.writer && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <User className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Writer:</span> {movie.writer}
                  </div>
                </div>
              )}

              {movie.released && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Release Date:</span> {movie.released}
                  </div>
                </div>
              )}

              {movie.box_office && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Box Office:</span> ${movie.box_office.toLocaleString()}
                  </div>
                </div>
              )}

              {movie.production && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <Film className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Production:</span> {movie.production}
                  </div>
                </div>
              )}
              {tmdbData?.belongs_to_collection && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <Film className="h-4 w-4" />
                  <div className="flex items-center space-x-2">
                    <span>
                      <span className="font-medium">Franchise:</span> {tmdbData.belongs_to_collection.name}
                    </span>
                    <button
                      onClick={handleToggleFranchiseFavorite}
                      disabled={togglingFranchiseFavorite}
                      className={`flex-shrink-0 transition-colors disabled:opacity-50 ${
                        isFranchiseFavorite
                          ? 'text-purple-600 hover:text-purple-700'
                          : 'text-slate-400 hover:text-purple-600'
                      }`}
                      title={isFranchiseFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {togglingFranchiseFavorite ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      ) : (
                        <Heart className={`h-4 w-4 ${isFranchiseFavorite ? 'fill-current' : ''}`} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {movie.website && (
                <div className="flex items-center space-x-2 text-slate-600 text-sm">
                  <Globe className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Website:</span>{' '}
                    <a
                      href={movie.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Visit
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Plot Text */}
            {movie.plot && (
              <div>
                <p className="text-slate-700 leading-relaxed text-sm">{movie.plot}</p>
              </div>
            )}
          </div>
        </div>

        {/* User Actions Section - Separate Card */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {/* Row 1: Rating, Status, Date Watched, Edit Review */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              
              {/* My Rating */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-700">My Rating:</span>
                <select
                  value={localRating || ''}
                  onChange={(e) => handleRatingChange(e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={isUpdating}
                  className="border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    fontSize: '12px',
                    height: '28px',
                    padding: '2px 8px',
                    minWidth: '90px',
                    maxWidth: '110px'
                  }}
                >
                  <option value="">No rating</option>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}/10
                    </option>
                  ))}
                </select>
                {movie.rating_updated_at && (
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(movie.rating_updated_at)}
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                <select
                  value={localStatus}
                  onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                  disabled={isUpdating}
                  className="border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    fontSize: '12px',
                    height: '28px',
                    padding: '2px 8px',
                    minWidth: '120px',
                    maxWidth: '140px'
                  }}
                >
                  <option value="To Watch">To Watch</option>
                  <option value="Watching">Watching</option>
                  <option value="Watched">Watched</option>
                  <option value="To Watch Again">To Watch Again</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
                {movie.status_updated_at && (
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(movie.status_updated_at)}
                  </span>
                )}
              </div>

              {/* Date Watched */}
              {(localStatus === 'Watched' || localStatus === 'To Watch Again') && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-700">Date Watched:</span>
                  <input
                    type="date"
                    value={localDateWatched || ''}
                    onChange={(e) => handleDateWatchedChange(e.target.value)}
                    disabled={isUpdating}
                    max={getTodayDateString()}
                    className="border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ 
                      fontSize: '4px',
                      height: '20px',
                      padding: '1px 6px',
                      minWidth: '130px',
                      maxWidth: '150px'
                    }}
                  />
                  {dateWatchedError && (
                    <span className="text-xs text-red-600">{dateWatchedError}</span>
                  )}
                </div>
              )}

              {/* Edit Review Button */}
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={isUpdating}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                style={{ 
                  fontSize: '12px', 
                  height: '28px',
                  padding: '0 12px'
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{localReview ? 'Edit Review' : 'Add Review'}</span>
              </button>
            </div>

            {/* Row 2: Add to Collection + Collection Badges */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Add to Collection Button */}
              <button
                onClick={() => setShowCollectionSelector(true)}
                disabled={isUpdating}
                className="inline-flex items-center space-x-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                style={{ 
                  fontSize: '12px', 
                  height: '28px',
                  padding: '0 12px'
                }}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Add to Collection</span>
              </button>

              {/* Collection Badges */}
              {loadingCollections ? (
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span>Loading collections...</span>
                </div>
              ) : movieCollections.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">In collections:</span>
                  {movieCollections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => setSelectedCollectionToView(collection)}
                      className="group relative inline-flex items-center space-x-2 px-3 py-1 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: collection.color }}
                      />
                      <span className="text-slate-700 group-hover:text-purple-700">
                        {collection.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Remove "${movie.title}" from "${collection.name}"?`)) {
                            handleRemoveFromCollection(collection.id);
                          }
                        }}
                        className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove from collection"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Review Display */}
            {localReview && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-900 text-sm leading-relaxed">{localReview}</p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ ADD THE MOVIE CAST SECTION HERE - BELOW User Actions Section */}
        <div className="max-w-6xl mx-auto px-6 pb-4">
          <MovieCastSection 
            imdbId={movie.imdb_id} 
            onOpenPersonDetails={handleOpenPersonDetails}
          />
        </div>

        {/* ✅ NEW: MOVIE RECOMMENDATIONS SECTION */}
        {tmdbData && (
          <div className="max-w-6xl mx-auto px-6 pb-6">
            <MovieRecommendations 
              recommendations={tmdbData.recommendations}
              similar={tmdbData.similar}
              onMovieDetailsClick={handleRecommendationClick}
              onMovieAddedToWatchlist={onMovieAddedToWatchlist}
            />
          </div>
        )}

        {/* ✅ NEW: WATCH PROVIDERS SECTION - ADD THIS ENTIRE BLOCK */}
        {tmdbData && tmdbData['watch/providers'] && (
          <div className="max-w-6xl mx-auto px-6 pb-6">
            <WatchProvidersDisplay 
              watchProviders={tmdbData['watch/providers']}
              title={movie.title}
            />
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSave={handleSaveReview}
          initialReview={localReview || ''}
          movieTitle={movie.title}
        />
      )}

      {/* Person Details Modal */}
      {showPersonDetailsModal && selectedPersonId && (
        <div className="fixed inset-0 z-[60]"> 
          <PersonDetailsModal
            tmdbPersonId={selectedPersonId}
            personName={selectedPersonName}
            personType={selectedPersonType}
            onClose={() => {
              setShowPersonDetailsModal(false);
              setSelectedPersonId(null);
            }}
            onOpenMovieDetails={handleRecommendationClick}
            onOpenSeriesDetails={handleOpenSeriesDetails} // ✅ ADD THIS LINE
          />
        </div>
      )}

      {/* Collection Selector Popup */}
      {showCollectionSelector && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCollectionSelector(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add to Collections</h3>
              <button
                onClick={() => setShowCollectionSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {customCollections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-2">No custom collections yet</p>
                  <p className="text-sm text-slate-500">
                    Create a custom collection first to add titles
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customCollections.map((collection) => (
                    <label
                      key={collection.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollections.has(collection.id)}
                        onChange={() => handleToggleCollection(collection.id)}
                        className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: collection.color }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {collection.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{collection.name}</p>
                        {collection.description && (
                          <p className="text-xs text-slate-500 truncate">{collection.description}</p>
                        )}
                      </div>
                      {selectedCollections.has(collection.id) && (
                        <Check className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCollectionSelector(false);
                  setSelectedCollections(new Set());
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCollections}
                disabled={selectedCollections.size === 0 || addingToCollections}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {addingToCollections ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Add to {selectedCollections.size} Collection(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Collection Detail Modal */}
      {selectedCollectionToView && (
        <CustomCollectionDetailModal
          isOpen={!!selectedCollectionToView}
          onClose={() => setSelectedCollectionToView(null)}
          collection={selectedCollectionToView}
          onMovieClick={handleRecommendationClick}
          onUpdatePoster={(collectionId, posterUrl) => {
            // Update the poster URL in the local state if needed
            console.log('Poster updated for collection:', collectionId, posterUrl);
          }}
        />
      )}
    </div>
  );
}