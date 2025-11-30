// src/components/AddToWatchlistButton.tsx
// Reusable watchlist toggle button component
// Used across: Recommendations, Collections, Person Details, Search Results

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { watchlistService } from '../services/watchlistService';
import { Movie } from '../lib/supabase';

export interface AddToWatchlistButtonProps {
  // TMDB data
  tmdbId: number;
  title: string;
  mediaType: 'movie' | 'tv';
  
  // Optional enrichment data
  year?: number;
  posterPath?: string | null;
  overview?: string;
  voteAverage?: number;
  releaseDate?: string;
  firstAirDate?: string;
  
  // UI customization
  variant?: 'icon-only' | 'with-text' | 'card-overlay';
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  
  // State management
  isInWatchlist?: boolean; // Optional override for initial state
  
  // Callbacks
  onSuccess?: (added: boolean, movie: Movie | null) => void;
  onError?: (error: Error) => void;
  onWatchlistChange?: () => void; // Triggered on any add/remove
}

export function AddToWatchlistButton({
  tmdbId,
  title,
  mediaType,
  year,
  posterPath,
  overview,
  voteAverage,
  releaseDate,
  firstAirDate,
  variant = 'card-overlay',
  className = '',
  iconSize = 'md',
  isInWatchlist: initialIsInWatchlist,
  onSuccess,
  onError,
  onWatchlistChange
}: AddToWatchlistButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(initialIsInWatchlist ?? false);

  // Check watchlist status on mount if not provided
  useEffect(() => {
    if (initialIsInWatchlist === undefined) {
      checkWatchlistStatus();
    }
  }, [tmdbId, mediaType]);

  // Update state when prop changes
  useEffect(() => {
    if (initialIsInWatchlist !== undefined) {
      setIsInWatchlist(initialIsInWatchlist);
    }
  }, [initialIsInWatchlist]);

  const checkWatchlistStatus = async () => {
    try {
      const inWatchlist = await watchlistService.checkIfInWatchlistByTmdb(
        tmdbId,
        mediaType === 'tv' ? 'series' : 'movie'
      );
      setIsInWatchlist(inWatchlist);
    } catch (error) {
      console.error('[AddToWatchlistButton] Error checking watchlist:', error);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAdding) return;
    
    setIsAdding(true);
    
    try {
      const result = await watchlistService.toggleWatchlistByTmdb({
        tmdbId,
        title,
        mediaType,
        year,
        posterPath,
        overview,
        voteAverage,
        releaseDate,
        firstAirDate,
        status: 'To Watch'
      });

      // Update local state
      setIsInWatchlist(result.added);

      // Call success callback
      if (onSuccess) {
        onSuccess(result.added, result.movie);
      }

      // Call general change callback
      if (onWatchlistChange) {
        onWatchlistChange();
      }

      console.log(
        '[AddToWatchlistButton]',
        result.added ? 'Added to watchlist:' : 'Removed from watchlist:',
        title
      );

    } catch (error) {
      console.error('[AddToWatchlistButton] Toggle failed:', error);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to update watchlist'));
      } else {
        alert(`Failed to update watchlist. Please try again.`);
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Icon size classes
  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Variant-specific rendering
  if (variant === 'with-text') {
    return (
      <button
        onClick={handleToggle}
        disabled={isAdding}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isInWatchlist
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } ${isAdding ? 'opacity-75 cursor-not-allowed' : ''} ${className}`}
      >
        {isAdding ? (
          <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${iconSizeClasses[iconSize]}`} />
        ) : isInWatchlist ? (
          <X className={iconSizeClasses[iconSize]} />
        ) : (
          <Plus className={iconSizeClasses[iconSize]} />
        )}
        <span>
          {isAdding ? 'Updating...' : isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </span>
      </button>
    );
  }

  // icon-only and card-overlay variants
  return (
    <button
      onClick={handleToggle}
      disabled={isAdding}
      className={`p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all ${
        isInWatchlist
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-white/90 hover:bg-white'
      } ${isAdding ? 'opacity-75 cursor-not-allowed' : ''} ${className}`}
      title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {isAdding ? (
        <div className={`border-2 ${isInWatchlist ? 'border-white' : 'border-slate-400'} border-t-transparent rounded-full animate-spin ${iconSizeClasses[iconSize]}`} />
      ) : isInWatchlist ? (
        <X className={`${iconSizeClasses[iconSize]} text-white`} />
      ) : (
        <X className={`${iconSizeClasses[iconSize]} text-slate-600 hover:text-purple-500 rotate-45 transition-all`} />
      )}
    </button>
  );
}