// src/components/EnhancedTVSeriesCard.tsx
// Simplified version matching My Discs layout style with only essential elements
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Trash2, 
  Calendar, 
  Tv,
  Play,
  ExternalLink
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';

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
  const [episodeStatus, setEpisodeStatus] = useState({
    cached: false,
    totalSeasons: 0,
    totalEpisodes: 0,
    isBeingFetched: false
  });

  // Check episode cache status
  useEffect(() => {
    const checkEpisodeStatus = async () => {
      if (!movie.imdb_id) return;
      
      try {
        const status = await serverSideEpisodeService.checkCacheStatus(movie.imdb_id);
        setEpisodeStatus(status);
      } catch (error) {
        console.error('Failed to check episode status:', error);
      }
    };

    checkEpisodeStatus();
  }, [movie.imdb_id]);

  const getStatusColor = (status: Movie['status']) => {
    switch (status) {
      case 'To Watch': return 'bg-blue-100 text-blue-800';
      case 'Watching': return 'bg-yellow-100 text-yellow-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'To Watch Again': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${movie.title}" from your watchlist?`)) {
      onDelete(movie.id!);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all duration-300">
      {/* Portrait Poster Container - 2/3 Aspect Ratio like My Discs */}
      <div className="aspect-[2/3] relative bg-slate-100">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Tv className="h-12 w-12" />
          </div>
        )}

        {/* Top Row: TV Series Badge */}
        <div className="absolute top-2 left-2">
          <div className="flex items-center space-x-1 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
            <Tv className="h-3 w-3" />
            <span>TV Series</span>
          </div>
        </div>

        {/* Top Right: IMDb Link */}
        {movie.imdb_id && (
          <div className="absolute top-2 right-2">
            <a
              href={`https://www.imdb.com/title/${movie.imdb_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-2 py-1 rounded text-xs transition-colors duration-200 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Bottom Overlay: Status Badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusColor(movie.status)}`}>
            {movie.status}
          </span>
        </div>

        {/* Episode Loading Indicator */}
        {episodeStatus.isBeingFetched && (
          <div className="absolute bottom-2 right-2">
            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse shadow-sm">
              Loading...
            </div>
          </div>
        )}
      </div>

      {/* Content Below Poster */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2">
            {movie.title}
          </h3>
        </div>

        {/* Year and Rating Row */}
        <div className="flex items-center justify-between text-sm">
          {/* Year */}
          {movie.year && (
            <div className="flex items-center space-x-1 text-slate-600">
              <Calendar className="h-3 w-3" />
              <span>{movie.year}</span>
            </div>
          )}

          {/* Rating */}
          {movie.imdb_score && (
            <div className="flex items-center space-x-1 text-slate-600">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="font-medium">{movie.imdb_score.toFixed(1)}</span>
              {movie.imdb_votes && (
                <span className="text-slate-400 text-xs">({movie.imdb_votes})</span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {/* Episodes Button */}
          <button
            onClick={() => onViewEpisodes(movie)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
            title={episodeStatus.cached ? 
              `View ${episodeStatus.totalEpisodes} episodes across ${episodeStatus.totalSeasons} seasons` : 
              'View episodes (will fetch if needed)'
            }
          >
            <Play className="h-4 w-4" />
            <span>Episodes</span>
            {episodeStatus.cached && episodeStatus.totalEpisodes > 0 && (
              <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {episodeStatus.totalEpisodes}
              </span>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200"
            title="Remove from watchlist"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}