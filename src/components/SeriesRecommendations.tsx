// src/components/SeriesRecommendations.tsx
// Component to display TMDB recommendations and similar titles for TV series

import React, { useState, useEffect } from 'react';
import { ThumbsUp, Sparkles, ExternalLink, Star, Film, X, Tv } from 'lucide-react';
import { TMDBRecommendationsResponse } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import { Movie } from '../lib/supabase';
import { omdbEnrichmentService } from '../services/omdbEnrichmentService';
import { omdbApi } from '../lib/omdb';
import { useMovies } from '../hooks/useMovies';
import { buildSeriesFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder';

interface SeriesRecommendationsProps {
  recommendations?: TMDBRecommendationsResponse;
  similar?: TMDBRecommendationsResponse;
  className?: string;
  onSeriesDetailsClick?: (series: Movie) => void;
  onSeriesAddedToWatchlist?: () => void;
}

export function SeriesRecommendations({ 
  recommendations, 
  similar, 
  className = '',
  onSeriesDetailsClick,
  onSeriesAddedToWatchlist
}: SeriesRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'similar'>('recommendations');
  const [watchlistTitles, setWatchlistTitles] = useState<Set<number>>(new Set());

  // Check if we have any data to display
  const hasRecommendations = recommendations?.results && recommendations.results.length > 0;
  const hasSimilar = similar?.results && similar.results.length > 0;

  // Load watchlist titles on mount
  useEffect(() => {
    loadWatchlistTitles();
  }, []);

  const loadWatchlistTitles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('movies')
        .select('tmdb_id')
        .eq('user_id', user.id)
        .eq('media_type', 'series');

      if (data) {
        const tmdbIds = new Set<number>();
    
        for (const series of data) {
          if (series.tmdb_id) {
            tmdbIds.add(series.tmdb_id);
          }
        }
        
        setWatchlistTitles(tmdbIds);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
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
              <span>Similar Series</span>
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
            isInWatchlist={watchlistTitles.has(item.id)}
            onWatchlistUpdate={loadWatchlistTitles}
            onSeriesDetailsClick={onSeriesDetailsClick}
            onSeriesAddedToWatchlist={onSeriesAddedToWatchlist}
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
  item: any; // TMDBRecommendation type for TV
  isInWatchlist: boolean;
  onWatchlistUpdate: () => void;
  onSeriesDetailsClick?: (series: Movie) => void;
  onSeriesAddedToWatchlist?: () => void;
}

function RecommendationCard({ 
  item, 
  isInWatchlist, 
  onWatchlistUpdate, 
  onSeriesDetailsClick,
  onSeriesAddedToWatchlist
}: RecommendationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addMovie } = useMovies('series');

  const posterUrl = item.poster_path 
    ? tmdbService.getImageUrl(item.poster_path, 'w342')
    : null;
  
  const tmdbUrl = `https://www.themoviedb.org/tv/${item.id}`;
  const year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const title = item.name;

  // Handle adding/removing from watchlist
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
          .eq('media_type', 'series');

        if (error) throw error;
      } else {
        // ✅ REFACTORED - Use centralized builder
        console.log('[SeriesRecommendations] Adding series to watchlist:', title);
        
        // Get IMDb ID from TMDB
        const imdbId = await getIMDbIdFromTMDB(item.id, 'tv');
        
        // Fetch OMDb enrichment (if IMDb ID available)
        let omdbDetails = null;
        if (imdbId) {
          try {
            console.log('[SeriesRecommendations] Fetching OMDb data for:', title, imdbId);
            omdbDetails = await omdbApi.getMovieDetails(imdbId);
          } catch (omdbError) {
            console.error('[SeriesRecommendations] OMDb fetch failed:', omdbError);
            // Continue without OMDb data
          }
        }
        
        // ✅ USE CENTRALIZED BUILDER
        const seriesData = buildSeriesFromOMDb(
          {
            title: title,
            year: year ? parseInt(year.toString()) : undefined,
            imdb_id: imdbId || `tmdb_${item.id}`,
            tmdb_id: item.id, // ✅ Include TMDB ID
            poster_url: posterUrl || undefined,
            plot: item.overview,
            imdb_score: item.vote_average,
            status: 'To Watch'
          },
          omdbDetails
        );

        // ✅ USE HOOK FOR INSERT
        await addMovie(seriesData);

        console.log('[SeriesRecommendations] ✅ Series added with complete data');

        if (onSeriesAddedToWatchlist) {
          onSeriesAddedToWatchlist();
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
    if (isInWatchlist && onSeriesDetailsClick) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[SeriesRecommendations] Clicked watchlist title:', title);
      
      // Fetch the series from database to get full details
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[SeriesRecommendations] No user found');
          return;
        }

        console.log('[SeriesRecommendations] Fetching series:', { title, userId: user.id });

        const { data: series, error } = await supabase
          .from('movies')
          .select('*')
          .eq('user_id', user.id)
          .eq('title', title)
          .eq('media_type', 'series')
          .single();

        console.log('[SeriesRecommendations] Query result:', { series, error });

        if (error) {
          console.error('[SeriesRecommendations] Error fetching series:', error);
          return;
        }

        if (series) {
          console.log('[SeriesRecommendations] Opening series details modal for:', series.title);
          onSeriesDetailsClick(series);
        }
      } catch (error) {
        console.error('[SeriesRecommendations] Error in handleCardClick:', error);
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
                <Tv className="h-12 w-12 text-slate-400" />
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
              <Tv className="h-12 w-12 text-slate-400" />
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