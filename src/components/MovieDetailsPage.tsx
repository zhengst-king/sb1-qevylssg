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
  Eye
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { ReviewModal } from './ReviewModal';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';

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
      <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Movies</span>
          </button>
          
          {/* Movie Title and Info */}
          <div className="flex items-center space-x-3">
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
            
            {movie.genre && (
              <div className="flex flex-wrap gap-1">
                {movie.genre.split(', ').slice(0, 3).map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {movie.updated_at && (
            <span className="text-sm text-slate-500" title={formatExactTimestamp(movie.updated_at)}>
              Updated {formatRelativeTime(movie.updated_at)}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {movie.runtime && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-slate-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Runtime</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{movie.runtime} min</div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600 mb-1">Status</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(localStatus)}`}>
                {localStatus}
              </div>
            </div>

            {movie.metascore && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-600 mb-1">
                  <Award className="h-4 w-4" />
                  <span className="text-sm font-medium">Metascore</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{movie.metascore}</div>
              </div>
            )}
          </div>

          {/* Additional Metadata Row */}
          {(movie.awards || movie.country || movie.actors || movie.language) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {movie.awards && (
                <div className="flex items-start space-x-2 text-slate-600">
                  <Award className="h-4 w-4 mt-0.5" />
                  <div>
                    <span className="font-medium">Awards:</span> {movie.awards}
                  </div>
                </div>
              )}

              {movie.actors && (
                <div className="flex items-start space-x-2 text-slate-600">
                  <Users className="h-4 w-4 mt-0.5" />
                  <div>
                    <span className="font-medium">Stars:</span> {movie.actors}
                  </div>
                </div>
              )}

              {movie.country && (
                <div className="flex items-center space-x-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Country:</span> {movie.country}
                  </div>
                </div>
              )}

              {movie.language && (
                <div className="flex items-center space-x-2 text-slate-600">
                  <MessageSquare className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Language:</span> {movie.language}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plot Section */}
          {movie.plot && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Plot</h3>
              <p className="text-slate-700 leading-relaxed">{movie.plot}</p>
            </div>
          )}

          {/* Movie Information Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Movie Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {movie.genre && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Genres</h3>
                    <p className="text-slate-600">{movie.genre}</p>
                  </div>
                )}

                {movie.director && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Director</h3>
                    <div className="flex items-center space-x-2 text-slate-600">
                      <User className="h-4 w-4" />
                      <span>{movie.director}</span>
                    </div>
                  </div>
                )}

                {movie.writer && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Writer</h3>
                    <div className="flex items-center space-x-2 text-slate-600">
                      <User className="h-4 w-4" />
                      <span>{movie.writer}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {movie.released && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Release Date</h3>
                    <p className="text-slate-600">{movie.released}</p>
                  </div>
                )}

                {movie.imdb_url && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">External Links</h3>
                    <a
                      href={movie.imdb_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View on IMDb</span>
                    </a>
                  </div>
                )}

                {movie.box_office && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Box Office</h3>
                    <div className="flex items-center space-x-2 text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <span>${movie.box_office.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {movie.production && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Production</h3>
                    <p className="text-slate-600">{movie.production}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* My Tracking Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">My Tracking</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Status Control */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={localStatus}
                  onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="To Watch">To Watch</option>
                  <option value="Watching">Watching</option>
                  <option value="Watched">Watched</option>
                  <option value="To Watch Again">To Watch Again</option>
                </select>
              </div>

              {/* Rating Control */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">My Rating</label>
                <select
                  value={localRating || ''}
                  onChange={(e) => handleRatingChange(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="">No rating</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}/10</option>
                  ))}
                </select>
              </div>

              {/* Date Watched Control */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Watched</label>
                <input
                  type="date"
                  value={localDateWatched || ''}
                  onChange={(e) => handleDateWatchedChange(e.target.value)}
                  disabled={isUpdating}
                  max={getTodayDateString()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                {dateWatchedError && (
                  <p className="text-red-600 text-sm mt-1">{dateWatchedError}</p>
                )}
              </div>
            </div>

            {/* Review Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">My Review</label>
                <button
                  onClick={() => setShowReviewModal(true)}
                  disabled={isUpdating}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{localReview ? 'Edit Review' : 'Add Review'}</span>
                </button>
              </div>
              
              {localReview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 leading-relaxed">{localReview}</p>
                </div>
              )}
            </div>
          </div>
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