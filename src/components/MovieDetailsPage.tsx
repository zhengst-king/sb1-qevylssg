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
  Film
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { ReviewModal } from './ReviewModal';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { MovieCastSection } from './MovieCastSection';

interface MovieDetailsPageProps {
  movie: Movie;
  onBack: () => void;
  onUpdateStatus?: (id: string, status: Movie['status']) => void;
  onUpdateRating?: (id: string, rating: number | null) => void;
  onUpdateMovie?: (id: string, updates: Partial<Movie>) => void;
}

export function MovieDetailsPage({ 
  movie, 
  onBack, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie
}: MovieDetailsPageProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateWatchedError, setDateWatchedError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Local state for immediate UI updates
  const [localRating, setLocalRating] = useState<number | null>(movie.user_rating || null);
  const [localStatus, setLocalStatus] = useState<Movie['status']>(movie.status);
  const [localReview, setLocalReview] = useState<string | null>(movie.user_review || null);
  const [localDateWatched, setLocalDateWatched] = useState<string | null>(movie.date_watched || null);

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
      default: return 'bg-gray-100 text-gray-800';
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
            </div>

            {/* Plot Text */}
            {movie.plot && (
              <div>
                <p className="text-slate-700 leading-relaxed text-sm">{movie.plot}</p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ ADD THIS SECTION HERE - Cast & Crew Section */}
        <div className="max-w-6xl mx-auto px-6 pb-4">
          <MovieCastSection imdbId={movie.imdb_id} />
        </div>

        {/* User Actions Section - Separate Card */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Status */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                <select
                  value={localStatus}
                  onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                  disabled={isUpdating}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="To Watch">To Watch</option>
                  <option value="Watching">Watching</option>
                  <option value="Watched">Watched</option>
                  <option value="To Watch Again">To Watch Again</option>
                </select>
                {movie.status_updated_at && (
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(movie.status_updated_at)}
                  </span>
                )}
              </div>

              {/* My Rating */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-700">My Rating:</span>
                <select
                  value={localRating || ''}
                  onChange={(e) => handleRatingChange(e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={isUpdating}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              {/* Add Review Button */}
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={isUpdating}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{localReview ? 'Edit Review' : 'Add Review'}</span>
              </button>

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
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {dateWatchedError && (
                    <span className="text-xs text-red-600">{dateWatchedError}</span>
                  )}
                </div>
              )}
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
          <MovieCastSection imdbId={movie.imdb_id} />
        </div>
        
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
    </div>
  );
}