// src/components/WatchlistCard.tsx
import React, { useState } from 'react';
import { Star, Trash2, Calendar, Film, ExternalLink, MessageSquare } from 'lucide-react';
import { Movie } from '../lib/supabase';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { ReviewModal } from './ReviewModal';

interface WatchlistCardProps {
  movie: Movie;
  onUpdateStatus: (id: string, status: Movie['status']) => void;
  onUpdateRating: (id: string, rating: number | null) => void;
  onUpdateMovie: (id: string, updates: Partial<Movie>) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (movie: Movie) => void;
}

export function WatchlistCard({ 
  movie, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie, 
  onDelete,
  onViewDetails
}: WatchlistCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateWatchedError, setDateWatchedError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

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

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to remove this movie from your watchlist?')) {
      onDelete(movie.id!);
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

  const handlePosterClick = () => {
    if (onViewDetails) {
      onViewDetails(movie);
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

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all duration-200">
        {/* Portrait Poster Container - 2/3 Aspect Ratio like TV Cards */}
        <div 
          className="aspect-[2/3] relative bg-slate-100 cursor-pointer"
          onClick={handlePosterClick}
          title="Click to view movie details"
        >
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={`${movie.title} poster`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Film className="h-8 w-8" />
            </div>
          )}

          {/* Top Row: Movie Badge */}
          <div className="absolute top-1.5 left-1.5">
            <div className="flex items-center space-x-1 bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-xs font-medium shadow-sm">
              <Film className="h-2.5 w-2.5" />
              <span>Movie</span>
            </div>
          </div>

          {/* Top Right: IMDb Link */}
          {movie.imdb_id && (
            <div className="absolute top-1.5 right-1.5">
              <a
                href={`https://www.imdb.com/title/${movie.imdb_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black font-medium p-1.5 rounded text-xs transition-colors duration-200 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Bottom Left: Status Badge */}
          <div className="absolute bottom-1.5 left-1.5">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium shadow-sm ${getStatusColor(movie.status)}`}>
              {movie.status}
            </span>
          </div>

          {/* Bottom Right: Delete Button */}
          <div className="absolute bottom-1.5 right-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
              title="Remove from watchlist"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-xs font-medium">
              View Details
            </div>
          </div>
        </div>

        {/* Content Below Poster - Clean like TV Cards */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
              {movie.title}
            </h3>
          </div>

          {/* Year and Rating Row */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            {/* Year */}
            {movie.year && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{movie.year}</span>
              </div>
            )}

            {/* IMDb Rating */}
            {movie.imdb_score && (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="font-medium">{movie.imdb_score.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSave={handleSaveReview}
          initialReview={movie.user_review || ''}
          movieTitle={movie.title}
        />
      )}
    </>
  );
}