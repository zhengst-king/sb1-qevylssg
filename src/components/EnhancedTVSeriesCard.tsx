// src/components/EnhancedTVSeriesCard.tsx
// Enhanced TV series card with all the new features
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Trash2, 
  Calendar, 
  User, 
  Users, 
  Clock, 
  Eye, 
  MessageSquare, 
  Award, 
  Film, 
  Tv,
  Play,
  ExternalLink,
  Wifi,
  Monitor,
  Download
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { backgroundEpisodeService } from '../services/backgroundEpisodeService';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { ReviewModal } from './ReviewModal';

interface EnhancedTVSeriesCardProps {
  movie: Movie;
  onUpdateStatus: (id: string, status: Movie['status']) => void;
  onUpdateRating: (id: string, rating: number | null) => void;
  onUpdateMovie: (id: string, updates: Partial<Movie>) => void;
  onDelete: (id: string) => void;
  onViewEpisodes: (movie: Movie) => void;
}

export function EnhancedTVSeriesCard({ 
  movie, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie, 
  onDelete, 
  onViewEpisodes 
}: EnhancedTVSeriesCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateWatchedError, setDateWatchedError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [episodeStatus, setEpisodeStatus] = useState({
    cached: false,
    totalSeasons: 0,
    totalEpisodes: 0,
    isBeingFetched: false
  });

  // Check episode cache status
  useEffect(() => {
    if (movie.imdb_id) {
      const status = backgroundEpisodeService.getSeriesStatus(movie.imdb_id);
      setEpisodeStatus(status);

      // Add to background fetch queue if not cached
      if (!status.cached && !status.isBeingFetched) {
        backgroundEpisodeService.addSeriesToQueue(movie.imdb_id, movie.title, 'medium');
      }

      // Set up interval to check status updates
      const interval = setInterval(() => {
        const updatedStatus = backgroundEpisodeService.getSeriesStatus(movie.imdb_id!);
        setEpisodeStatus(updatedStatus);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [movie.imdb_id, movie.title]);

  const handleStatusChange = async (status: Movie['status']) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(movie.id!, status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRatingChange = async (rating: number | null) => {
    setIsUpdating(true);
    try {
      await onUpdateRating(movie.id!, rating);
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
    setIsUpdating(true);
    try {
      await onUpdateMovie(movie.id!, { date_watched: dateString || null });
    } catch (err) {
      setDateWatchedError('Failed to update watch date');
      console.error('Failed to update watch date:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to remove "${movie.title}" from your collection?`)) {
      await onDelete(movie.id!);
    }
  };

  const handleSaveReview = async (review: string) => {
    setIsUpdating(true);
    try {
      await onUpdateMovie(movie.id!, { user_review: review });
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

  const parseCreators = (director: string | null): string[] => {
    if (!director || director === 'N/A') return [];
    return director.split(',').map(name => name.trim()).slice(0, 3); // Limit to first 3
  };

  const parseStreaming = (plot: string | null): string[] => {
    // This is a simplified approach - in reality, you'd need a dedicated streaming API
    // For now, we'll extract streaming mentions from plot or other fields
    if (!plot) return [];
    
    const streamingServices = [];
    const plotLower = plot.toLowerCase();
    
    if (plotLower.includes('netflix')) streamingServices.push('Netflix');
    if (plotLower.includes('hbo') || plotLower.includes('max')) streamingServices.push('HBO Max');
    if (plotLower.includes('hulu')) streamingServices.push('Hulu');
    if (plotLower.includes('amazon') || plotLower.includes('prime')) streamingServices.push('Prime Video');
    if (plotLower.includes('disney')) streamingServices.push('Disney+');
    if (plotLower.includes('apple tv')) streamingServices.push('Apple TV+');
    if (plotLower.includes('paramount')) streamingServices.push('Paramount+');
    
    return streamingServices;
  };

  const creators = parseCreators(movie.director);
  const streamingServices = parseStreaming(movie.plot);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
        {/* Delete Button - Top Left Corner */}
        <button
          onClick={handleDelete}
          className="absolute top-4 left-4 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 z-10 group"
          title="Delete from collection"
        >
          <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>

        {/* Episodes Button - Top Right Corner */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => onViewEpisodes(movie)}
            className="inline-flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl group"
            title={episodeStatus.cached ? `Browse ${episodeStatus.totalEpisodes} episodes` : 'Browse Episodes'}
          >
            <Play className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>Episodes</span>
            {episodeStatus.cached && (
              <span className="bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full text-xs">
                {episodeStatus.totalEpisodes}
              </span>
            )}
          </button>
          
          {/* Episode Cache Status Indicator */}
          {episodeStatus.isBeingFetched && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
              Loading...
            </div>
          )}
        </div>

        <div className="md:flex">
          {/* Poster Section */}
          <div className="md:w-32 md:flex-shrink-0">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-48 md:h-full object-cover"
              />
            ) : (
              <div className="w-full h-48 md:h-full bg-slate-200 flex items-center justify-center">
                <Tv className="h-12 w-12 text-slate-400" />
              </div>
            )}
          </div>
          
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 pr-20"> {/* Add padding to avoid button overlap */}
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">{movie.title}</h3>
                  <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                    <Tv className="h-3 w-3" />
                    <span>TV Series</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 mb-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(movie.status)}`}>
                    {movie.status}
                  </span>
                  
                  {movie.year && (
                    <div className="flex items-center space-x-1 text-sm text-slate-600">
                      <Calendar className="h-3 w-3" />
                      <span>{movie.year}</span>
                    </div>
                  )}
                  
                  {movie.imdb_score && (
                    <div className="flex items-center space-x-1 text-sm text-slate-600">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{movie.imdb_score.toFixed(1)}</span>
                      {movie.imdb_votes && (
                        <span className="text-slate-400">({movie.imdb_votes} votes)</span>
                      )}
                    </div>
                  )}
                  
                  {movie.metascore && (
                    <div className="flex items-center space-x-1 text-sm text-slate-600">
                      <Award className="h-3 w-3 text-green-500" />
                      <span>{movie.metascore} Metascore</span>
                    </div>
                  )}
                </div>

                {/* Creators Info */}
                {creators.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-start space-x-2">
                      <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-slate-700">Creators: </span>
                        <span className="text-sm text-slate-600">{creators.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Streaming Info */}
                {streamingServices.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-start space-x-2">
                      <Monitor className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-slate-700">Available on: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {streamingServices.map(service => (
                            <span key={service} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Episode Cache Status */}
                {episodeStatus.cached && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                      <Download className="h-3 w-3" />
                      <span>{episodeStatus.totalSeasons} seasons, {episodeStatus.totalEpisodes} episodes cached</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Genre Pills */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {movie.genres.slice(0, 4).map(genre => (
                  <span key={genre} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                    {genre}
                  </span>
                ))}
                {movie.genres.length > 4 && (
                  <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs">
                    +{movie.genres.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Plot */}
            {movie.plot && (
              <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                {movie.plot}
              </p>
            )}

            {/* User Rating */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-slate-700">Your Rating:</span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange(movie.user_rating === rating ? null : rating)}
                      disabled={isUpdating}
                      className="group disabled:opacity-50"
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          movie.user_rating && rating <= movie.user_rating
                            ? 'text-yellow-500 fill-current'
                            : 'text-slate-300 group-hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {movie.user_rating && (
                  <button
                    onClick={() => handleRatingChange(null)}
                    disabled={isUpdating}
                    className="ml-2 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Watch Date */}
            {movie.status === 'Watched' && (
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-green-600" />
                  <label className="text-sm font-medium text-slate-700">Date Watched:</label>
                  <input
                    type="date"
                    value={movie.date_watched || ''}
                    onChange={(e) => handleDateWatchedChange(e.target.value)}
                    max={getTodayDateString()}
                    disabled={isUpdating}
                    className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
                {dateWatchedError && (
                  <p className="text-red-600 text-xs mt-1">{dateWatchedError}</p>
                )}
                {movie.date_watched && (
                  <p className="text-xs text-slate-500 mt-1">
                    Watched {formatDateWatched(movie.date_watched)}
                  </p>
                )}
              </div>
            )}

            {/* User Review */}
            {movie.user_review && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">My Review</p>
                    <p className="text-sm text-blue-700 mt-1">{movie.user_review}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mb-4">
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={isUpdating}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{movie.user_review ? 'Edit Review' : 'Add Review'}</span>
              </button>

              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>IMDb</span>
                </a>
              )}
            </div>

            {/* Status Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['To Watch', 'Watching', 'Watched', 'To Watch Again'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 ${
                    movie.status === status
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Metadata Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                {movie.created_at && (
                  <span title={formatExactTimestamp(movie.created_at)}>
                    Added {formatRelativeTime(movie.created_at)}
                  </span>
                )}
                {movie.updated_at && movie.updated_at !== movie.created_at && (
                  <span title={formatExactTimestamp(movie.updated_at)}>
                    Updated {formatRelativeTime(movie.updated_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {episodeStatus.isBeingFetched && (
                  <span className="text-green-600 animate-pulse">Fetching episodes...</span>
                )}
                {movie.media_type && (
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {movie.media_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          movieTitle={movie.title}
          initialReview={movie.user_review || ''}
          onSave={handleSaveReview}
        />
      )}
    </>
  );
}