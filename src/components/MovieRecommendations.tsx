// src/components/MovieRecommendations.tsx
// REFACTORED VERSION - Uses centralized buildMovieFromOMDb utility

import React, { useState, useEffect } from 'react';
import { Film, Star, X, Plus, Check, ExternalLink, ThumbsUp, Sparkles } from 'lucide-react';
import { tmdbService, TMDBMovieRecommendation } from '../lib/tmdb';
import { supabase, Movie } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';
import { useMovies } from '../hooks/useMovies';
import { buildMovieFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder';

interface MovieRecommendationsProps {
  movieId: number;
  onMovieDetailsClick?: (movie: Movie) => void;
  onMovieAddedToWatchlist?: () => void;
}

export function MovieRecommendations({ movieId, onMovieDetailsClick, onMovieAddedToWatchlist }: MovieRecommendationsProps) {
  const [recommendedItems, setRecommendedItems] = useState<TMDBMovieRecommendation[]>([]);
  const [similarItems, setSimilarItems] = useState<TMDBMovieRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlistTitles, setWatchlistTitles] = useState<Set<number>>(new Set());
  const [currentTab, setCurrentTab] = useState<'recommended' | 'similar'>('recommended');

  // Fetch recommendations and similar movies
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        const [recommended, similar] = await Promise.all([
          tmdbService.getMovieRecommendations(movieId),
          tmdbService.getSimilarMovies(movieId)
        ]);
        
        setRecommendedItems(recommended || []);
        setSimilarItems(similar || []);
      } catch (error) {
        console.error('Error loading movie recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [movieId]);

  // Load watchlist titles
  useEffect(() => {
    loadWatchlistTitles();
  }, []);

  const loadWatchlistTitles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: movies } = await supabase
        .from('movies')
        .select('title')
        .eq('user_id', user.id)
        .eq('media_type', 'movie');

      if (movies) {
        const titles = new Set(movies.map(m => m.title));
        setWatchlistTitles(titles as any);
      }
    } catch (error) {
      console.error('Error loading watchlist titles:', error);
    }
  };

  const displayItems = currentTab === 'recommended' ? recommendedItems : similarItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No {currentTab === 'recommended' ? 'recommendations' : 'similar movies'} available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setCurrentTab('recommended')}
            className={`relative pb-3 px-1 flex items-center space-x-2 transition-colors ${
              currentTab === 'recommended'
                ? 'text-purple-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Recommended</span>
            {currentTab === 'recommended' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
          
          {similarItems.length > 0 && (
            <button
              onClick={() => setCurrentTab('similar')}
              className={`relative pb-3 px-1 flex items-center space-x-2 transition-colors ${
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
            isInWatchlist={watchlistTitles.has(item.id)}
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
  item: TMDBMovieRecommendation;
  isInWatchlist: boolean;
  onWatchlistUpdate: () => void;
  onMovieDetailsClick?: (movie: Movie) => void;
  onMovieAddedToWatchlist?: () => void;
}

function RecommendationCard({ 
  item, 
  isInWatchlist, 
  onWatchlistUpdate, 
  onMovieDetailsClick, 
  onMovieAddedToWatchlist 
}: RecommendationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addMovie } = useMovies('movie'); // ✅ USE HOOK

  const posterUrl = item.poster_path 
    ? tmdbService.getImageUrl(item.poster_path, 'w342')
    : null;
  
  const tmdbUrl = `https://www.themoviedb.org/movie/${item.id}`;
  const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const title = item.title;

  // ✅ REFACTORED: Use centralized utility
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
        
        console.log('[MovieRecommendations] Removed from watchlist:', title);
      } else {
        // ✅ NEW PATTERN: Get IMDb ID and fetch OMDb data
        console.log('[MovieRecommendations] Adding to watchlist:', title);
        
        const imdbId = await getIMDbIdFromTMDB(item.id, 'movie');
        
        // Fetch OMDb enrichment (if IMDb ID available)
        let omdbDetails = null;
        if (imdbId) {
          try {
            omdbDetails = await omdbApi.getMovieDetails(imdbId);
            console.log('[MovieRecommendations] OMDb data fetched successfully');
          } catch (omdbError) {
            console.warn('[MovieRecommendations] OMDb fetch failed, continuing with TMDB data only');
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
            media_type: 'movie'
          },
          omdbDetails
        );
        
        // ✅ USE HOOK FOR INSERT
        await addMovie(movieData);
        
        console.log('[MovieRecommendations] Added to watchlist successfully:', title);
        
        if (onMovieAddedToWatchlist) {
          onMovieAddedToWatchlist();
        }
      }
      
      onWatchlistUpdate();
    } catch (error) {
      console.error('[MovieRecommendations] Error toggling watchlist:', error);
      alert('Failed to update watchlist. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    if (isInWatchlist && onMovieDetailsClick) {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: movie, error } = await supabase
          .from('movies')
          .select('*')
          .eq('user_id', user.id)
          .eq('title', title)
          .eq('media_type', 'movie')
          .single();

        if (error) {
          console.error('[MovieRecommendations] Error fetching movie:', error);
          return;
        }

        if (movie) {
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
      <div onClick={handleCardClick} className="group relative block cursor-pointer">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
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

            <button
              onClick={handleToggleWatchlist}
              disabled={isAdding}
              className="absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all bg-red-500 hover:bg-red-600"
              title="Remove from watchlist"
            >
              {isAdding ? (
                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <X className="h-4 w-4 transition-all text-white" />
              )}
            </button>

            {rating && parseFloat(rating) > 0 && (
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-white text-xs font-semibold">{rating}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3">
            <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">{title}</h3>
            {year && <p className="text-xs text-slate-500">{year}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Not in watchlist - use regular link
  return (
    <a href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="group relative block">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
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

          <button
            onClick={handleToggleWatchlist}
            disabled={isAdding}
            className="absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all bg-white/90 hover:bg-white"
            title="Add to watchlist"
          >
            {isAdding ? (
              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {rating && parseFloat(rating) > 0 && (
            <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-white text-xs font-semibold">{rating}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">{title}</h3>
          {year && <p className="text-xs text-slate-500">{year}</p>}
        </div>
      </div>
    </a>
  );
}