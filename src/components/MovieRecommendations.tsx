// src/components/MovieRecommendations.tsx
// CORRECT VERSION - Keeps original watchlist logic + applies refactoring

import React, { useState, useEffect } from 'react';
import { ThumbsUp, Sparkles, ExternalLink, Star, Film, X } from 'lucide-react';
import { TMDBMovieRecommendationsResponse } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import { Movie } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';
import { useMovies } from '../hooks/useMovies'; // ✅ ADD
import { buildMovieFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder'; // ✅ ADD

interface MovieRecommendationsProps {
  recommendations?: TMDBMovieRecommendationsResponse;
  similar?: TMDBMovieRecommendationsResponse;
  className?: string;
  onMovieDetailsClick?: (movie: Movie) => void;
  onMovieAddedToWatchlist?: () => void;
}

export function MovieRecommendations({ 
  recommendations, 
  similar, 
  className = '',
  onMovieDetailsClick,
  onMovieAddedToWatchlist
}: MovieRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'similar'>('recommendations');
  const [watchlistTitles, setWatchlistTitles] = useState<Set<number>>(new Set()); // ✅ KEEP Set<number>

  // Check if we have any data to display
  const hasRecommendations = recommendations?.results && recommendations.results.length > 0;
  const hasSimilar = similar?.results && similar.results.length > 0;

  // Load watchlist titles on mount
  useEffect(() => {
    loadWatchlistTitles();
  }, []);
  
  // ✅ KEEP ORIGINAL LOGIC - This works correctly
  const loadWatchlistTitles = () => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('movies')
          .select('tmdb_id')
          .eq('user_id', user.id)
          .eq('media_type', 'movie');

        if (data) {
          const tmdbIds = new Set<number>();
        
          for (const movie of data) {
            if (movie.tmdb_id) {
              tmdbIds.add(movie.tmdb_id);
            }
          }
        
          setWatchlistTitles(tmdbIds);
        }
      } catch (error) {
        console.error('Error loading watchlist:', error);
      }
    })();
  };

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
            isInWatchlist={watchlistTitles.has(item.id)} // ✅ KEEP ORIGINAL - Check by TMDB ID
            onWatchlistUpdate={loadWatchlistTitles}
            onMovieDetailsClick={onMovieDetailsClick}
            onMovieAddedToWatchlist={onMovieAddedToWatchlist}
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

// ==================== RECOMMENDATION CARD ====================

interface RecommendationCardProps {
  item: any; // TMDBMovieRecommendation type
  isInWatchlist: boolean;
  onWatchlistUpdate: () => void;
  onMovieDetailsClick?: (movie: Movie) => void;
  onMovieAddedToWatchlist?: () => void;
}

function RecommendationCard({ item, isInWatchlist, onWatchlistUpdate, onMovieDetailsClick, onMovieAddedToWatchlist }: RecommendationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addMovie } = useMovies('movie');

  const posterUrl = item.poster_path 
    ? tmdbService.getImageUrl(item.poster_path, 'w342')
    : null;
  
  const tmdbUrl = `https://www.themoviedb.org/movie/${item.id}`;
  const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const title = item.title;

  // ✅ REFACTORED - Use centralized utility
  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAdding) return;
    
    setIsAdding(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to add titles to your watchlist.');
        return;
      }

      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from('movies')
          .delete()
          .eq('user_id', user.id)
          .eq('title', title)
          .eq('media_type', 'movie');

        if (error) throw error;
      } else {
        // ✅ REFACTORED - Use centralized builder
        console.log('[MovieRecommendations] Adding to watchlist:', title);
        
        // Get IMDb ID from TMDB
        const imdbId = await getIMDbIdFromTMDB(item.id, 'movie');
        
        // Fetch OMDb enrichment (if IMDb ID available)
        let omdbDetails = null;
        if (imdbId) {
          try {
            console.log('[MovieRecommendations] Fetching OMDb data for:', title, imdbId);
            omdbDetails = await omdbApi.getMovieDetails(imdbId);
          } catch (omdbError) {
            console.error('[MovieRecommendations] OMDb fetch failed:', omdbError);
            // Continue without OMDb data
          }
        }
        
        // ✅ USE CENTRALIZED BUILDER
        const movieData = buildMovieFromOMDb(
          {
            title: title,
            year: year || undefined,
            imdb_id: imdbId || `tmdb_${item.id}`,
            poster_url: posterUrl || undefined,
            plot: item.overview,
            imdb_score: item.vote_average,
            media_type: 'movie',
            status: 'To Watch'
          },
          omdbDetails
        );

        // ✅ USE HOOK FOR INSERT
        await addMovie(movieData);

        onWatchlistUpdate();
        if (onMovieAddedToWatchlist) {
          onMovieAddedToWatchlist();
        }

        console.log('[MovieRecommendations] ✅ Movie added with complete data');

        if (onMovieAddedToWatchlist) {
          onMovieAddedToWatchlist();
        }
      }
      
      // Refresh watchlist
      onWatchlistUpdate();
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      alert('Failed to update watchlist. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    if (isInWatchlist && onMovieDetailsClick) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[MovieRecommendations] Clicked watchlist title:', title);
      
      // Fetch the movie from database to get full details
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[MovieRecommendations] No user found');
          return;
        }

        console.log('[MovieRecommendations] Fetching movie:', { title, userId: user.id });

        const { data: movie, error } = await supabase
          .from('movies')
          .select('*')
          .eq('user_id', user.id)
          .eq('title', title)
          .eq('media_type', 'movie')
          .single();

        console.log('[MovieRecommendations] Query result:', { movie, error });

        if (error) {
          console.error('[MovieRecommendations] Error fetching movie:', error);
          return;
        }

        if (movie) {
          console.log('[MovieRecommendations] Opening movie details modal for:', movie.title);
          onMovieDetailsClick(movie);
        }
      } catch (error) {
        console.error('[MovieRecommendations] Error in handleCardClick:', error);
      }
    }
  };

  // If in watchlist, use div with onClick; otherwise use link
  if (isInWatchlist) {
    return (
      <div
        onClick={handleCardClick}
        className="group relative block cursor-pointer"
      >
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
          {/* Poster Image */}
          <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="h-12 w-12 text-slate-400" />
              </div>
            )}

            {/* Watchlist Button */}
            <button
              onClick={handleToggleWatchlist}
              disabled={isAdding}
              className="absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all bg-red-500 hover:bg-red-600"
              title="Remove from watchlist"
            >
              {isAdding ? (
                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <X className="h-4 w-4 transition-all text-white rotate-0" />
              )}
            </button>

            {/* Rating Badge */}
            {rating && parseFloat(rating) > 0 && (
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-white text-xs font-semibold">{rating}</span>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
              {title}
            </h3>
            {year && (
              <p className="text-xs text-slate-500">{year}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not in watchlist - use regular link
  return (
    <a
      href={tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Poster Image */}
        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="h-12 w-12 text-slate-400" />
            </div>
          )}

          {/* Watchlist Button */}
          <button
            onClick={handleToggleWatchlist}
            disabled={isAdding}
            className="absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all bg-white/90 hover:bg-white"
            title="Add to watchlist"
          >
            {isAdding ? (
              <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="h-4 w-4 transition-all text-slate-600 hover:text-purple-500 rotate-45" />
            )}
          </button>

          {/* Rating Badge */}
          {rating && parseFloat(rating) > 0 && (
            <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-white text-xs font-semibold">{rating}</span>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
            {title}
          </h3>
          {year && (
            <p className="text-xs text-slate-500">{year}</p>
          )}
        </div>
      </div>
    </a>
  );
}