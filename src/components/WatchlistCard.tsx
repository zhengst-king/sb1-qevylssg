// src/components/WatchlistCard.tsx
import React, { useState } from 'react';
import { Star, Trash2, Calendar, MapPin, User, Users, Clock, Eye, MessageSquare, Award, DollarSign, Globe, Film, Tv } from 'lucide-react';
import { Movie } from '../lib/supabase';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { ReviewModal } from './ReviewModal';

interface WatchlistCardProps {
  movie: Movie;
  onUpdateStatus: (id: string, status: Movie['status']) => void;
  onUpdateRating: (id: string, rating: number | null) => void;
  onUpdateMovie: (id: string, updates: Partial<Movie>) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (movie: Movie) => void; // NEW: Add click handler for poster
}

export function WatchlistCard({ 
  movie, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie, 
  onDelete,
  onViewDetails // NEW: Accept the click handler
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

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove this movie from your watchlist?')) {
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

  // NEW: Handle poster click
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-slate-200">
      <div className="md:flex">
        {/* NEW: Make poster clickable with cursor pointer and hover effects */}
        <div 
          className="md:w-32 md:flex-shrink-0 cursor-pointer group relative" 
          onClick={handlePosterClick}
          title="Click to view movie details"
        >
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-48 md:h-full object-cover group-hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-full h-48 md:h-full bg-slate-200 flex items-center justify-center group-hover:bg-slate-300 transition-colors">
              <span className="text-slate-400 text-sm">No poster</span>
            </div>
          )}
          
          {/* NEW: Hover overlay to indicate clickability */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
        
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900">{movie.title}</h3>
                <div className="flex items-center space-x-1">
                  {movie.media_type === 'series' ? (
                    <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Tv className="h-3 w-3" />
                      <span>TV Series</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Film className="h-3 w-3" />
                      <span>Movie</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mb-3">
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
                
                {movie.status === 'Watched' && movie.date_watched && (
                  <div className="flex items-center space-x-1 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                    <Eye className="h-3 w-3" />
                    <span>Watched {formatDateWatched(movie.date_watched)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleDelete}
              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Remove from watchlist"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 mb-4">
            {movie.user_review && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">My Review</p>
                    <p className="text-sm text-blue-700">
                      {movie.user_review.length > 100 
                        ? `${movie.user_review.substring(0, 100)}...` 
                        : movie.user_review
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {movie.genre && (
              <div className="flex flex-wrap gap-1">
                {movie.genre.split(', ').map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {movie.runtime && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <Clock className="h-3 w-3" />
                <span>{movie.runtime} minutes</span>
              </div>
            )}
            
            {movie.country && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <MapPin className="h-3 w-3" />
                <span>{movie.country}</span>
              </div>
            )}
            
            {movie.director && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <User className="h-3 w-3" />
                <span><strong>Director:</strong> {movie.director}</span>
              </div>
            )}
            
            {movie.actors && (
              <div className="flex items-start space-x-1 text-sm text-slate-600">
                <Users className="h-3 w-3 mt-0.5" />
                <span><strong>Cast:</strong> {movie.actors}</span>
              </div>
            )}
            
            {movie.box_office && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <DollarSign className="h-3 w-3" />
                <span><strong>Box Office:</strong> ${movie.box_office.toLocaleString()}</span>
              </div>
            )}
            
            {movie.awards && (
              <div className="flex items-start space-x-1 text-sm text-slate-600">
                <Award className="h-3 w-3 mt-0.5" />
                <span><strong>Awards:</strong> {movie.awards}</span>
              </div>
            )}
            
            {movie.production && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <span><strong>Production:</strong> {movie.production}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={isUpdating}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{movie.user_review ? 'Edit Review' : 'Add Review'}</span>
              </button>
              
              <select
                value={movie.status}
                onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                disabled={isUpdating}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="To Watch">To Watch</option>
                <option value="Watching">Watching</option>
                <option value="Watched">Watched</option>
                <option value="To Watch Again">To Watch Again</option>
              </select>
              
              <select
                value={movie.user_rating || ''}
                onChange={(e) => handleRatingChange(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isUpdating}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">No rating</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}/10</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-600">Date watched:</label>
              <input
                type="date"
                value={movie.date_watched || ''}
                onChange={(e) => handleDateWatchedChange(e.target.value)}
                disabled={isUpdating}
                max={getTodayDateString()}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {dateWatchedError && (
              <p className="text-red-600 text-sm">{dateWatchedError}</p>
            )}
            </div>
          </div>
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