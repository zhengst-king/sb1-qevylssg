// src/components/MovieRecommendations.tsx
// Component to display TMDB movie recommendations and similar titles

import React, { useState } from 'react';
import { ThumbsUp, Sparkles, ExternalLink, Star, Film, Plus, X } from 'lucide-react';
import { TMDBMovieRecommendationsResponse } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';

interface MovieRecommendationsProps {
  recommendations?: TMDBMovieRecommendationsResponse;
  similar?: TMDBMovieRecommendationsResponse;
  className?: string;
  onMovieDetailsClick?: (movie: Movie) => void; // Add this prop
}

export function MovieRecommendations({ 
  recommendations, 
  similar, 
  className = '',
  onMovieDetailsClick // Add this
}: MovieRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'similar'>('recommendations');

  // Check if we have any data to display
  const hasRecommendations = recommendations?.results && recommendations.results.length > 0;
  const hasSimilar = similar?.results && similar.results.length > 0;

  if (!hasRecommendations && !hasSimilar) {
    return null;
  }

  // Default to similar if no recommendations
  const currentTab = !hasRecommendations ? 'similar' : activeTab;
  const currentData = currentTab === 'recommendations' ? recommendations : similar;
  const displayItems = currentData?.results?.slice(0, 12) || [];

  return (
    <div className={`bg-slate-50 p-4 rounded-lg ${className}`}>
      {/* Section Header with Tabs */}
      <div className="mb-4">
        <div className="flex items-center space-x-4 border-b border-slate-200">
          {hasRecommendations && (
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center space-x-2 pb-2 px-3 transition-colors relative ${
                currentTab === 'recommendations'
                  ? 'text-purple-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Recommended</span>
              {currentTab === 'recommendations' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
              )}
            </button>
          )}
          
          {hasSimilar && (
            <button
              onClick={() => setActiveTab('similar')}
              className={`flex items-center space-x-2 pb-2 px-3 transition-colors relative ${
                currentTab === 'similar'
                  ? 'text-purple-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Similar Movies</span>
              {currentTab === 'similar' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Grid of Recommendations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayItems.map((item) => (
          <RecommendationCard 
            key={item.id} 
            item={item}
            onMovieDetailsClick={onMovieDetailsClick} // Pass it down
          />
        ))}
      </div>

      {/* TMDB Attribution */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Recommendations from TMDB</span>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 hover:text-slate-600 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>TMDB</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ==================== ENHANCED RECOMMENDATION CARD ====================

interface RecommendationCardProps {
  item: any; // TMDBMovieRecommendation type
  onMovieDetailsClick?: (movie: Movie) => void;
}

function RecommendationCard({ item, onMovieDetailsClick }: RecommendationCardProps) {
  const { movies, addMovie, isMovieInWatchlist } = useMovies('movie');
  const [isAdding, setIsAdding] = useState(false);

  const posterUrl = item.poster_path 
    ? tmdbService.getImageUrl(item.poster_path, 'w342')
    : null;
  
  const tmdbUrl = `https://www.themoviedb.org/movie/${item.id}`;
  const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  // Get IMDb ID from external_ids if available
  const imdbId = item.external_ids?.imdb_id;
  
  // Check if movie is in watchlist
  const inWatchlist = imdbId ? isMovieInWatchlist(imdbId) : false;
  const movieInWatchlist = inWatchlist ? movies.find(m => m.imdb_id === imdbId) : null;

  // Handle adding to watchlist
  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inWatchlist || isAdding) return;

    setIsAdding(true);
    try {
      // Fetch full movie details to get IMDb ID if we don't have it
      const fullDetails = await tmdbService.getMovieDetailsFull(item.id);
      
      const newMovie: Partial<Movie> = {
        title: item.title,
        year: year ? parseInt(year.toString()) : undefined,
        genre: item.genre_ids ? undefined : undefined, // Will be fetched by backend
        poster_url: posterUrl || undefined,
        imdb_score: item.vote_average,
        imdb_id: fullDetails?.external_ids?.imdb_id || undefined,
        status: 'To Watch',
        plot: item.overview,
        media_type: 'movie'
      };

      await addMovie(newMovie);
    } catch (error) {
      console.error('Error adding movie to watchlist:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Handle card click - navigate to details if in watchlist, otherwise open TMDB
  const handleCardClick = (e: React.MouseEvent) => {
    if (inWatchlist && movieInWatchlist && onMovieDetailsClick) {
      e.preventDefault();
      onMovieDetailsClick(movieInWatchlist);
    }
    // Otherwise, let the <a> tag handle navigation to TMDB
  };

  return (
    
      href={inWatchlist ? undefined : tmdbUrl}
      target={inWatchlist ? undefined : "_blank"}
      rel={inWatchlist ? undefined : "noopener noreferrer"}
      onClick={handleCardClick}
      className="group block cursor-pointer"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Poster Image */}
        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="h-12 w-12 text-slate-400" />
            </div>
          )}

          {/* Rating Badge */}
          {rating && (
            <div className="absolute top-2 left-2 bg-black/75 text-white text-xs font-bold px-2 py-1 rounded flex items-center space-x-1 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{rating}</span>
            </div>
          )}

          {/* Watchlist Button */}
          <button
            onClick={handleToggleWatchlist}
            disabled={isAdding || inWatchlist}
            className={`absolute bottom-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all ${
              inWatchlist 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/90 hover:bg-white'
            }`}
            title={inWatchlist ? 'In your watchlist' : 'Add to watchlist'}
          >
            {isAdding ? (
              <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X
                className={`h-4 w-4 transition-all ${
                  inWatchlist 
                    ? 'text-white rotate-0' 
                    : 'text-slate-700 rotate-45'
                }`}
              />
            )}
          </button>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
            {item.title}
          </h3>
          {year && (
            <p className="text-xs text-slate-500">{year}</p>
          )}
        </div>
      </div>
    </a>
  );
}