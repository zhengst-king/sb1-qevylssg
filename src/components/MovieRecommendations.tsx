// src/components/MovieRecommendations.tsx
// Component to display TMDB movie recommendations and similar titles

import React, { useState } from 'react';
import { ThumbsUp, Sparkles, ExternalLink, Star, Film } from 'lucide-react';
import { TMDBMovieRecommendationsResponse } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';

interface MovieRecommendationsProps {
  recommendations?: TMDBMovieRecommendationsResponse;
  similar?: TMDBMovieRecommendationsResponse;
  className?: string;
}

export function MovieRecommendations({ 
  recommendations, 
  similar, 
  className = '' 
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
          <RecommendationCard key={item.id} item={item} />
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
}

function RecommendationCard({ item }: RecommendationCardProps) {
  const posterUrl = item.poster_path 
    ? tmdbService.getImageUrl(item.poster_path, 'w342')
    : null;
  
  const tmdbUrl = `https://www.themoviedb.org/movie/${item.id}`;
  const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  return (
    <a
      href={tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
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
            <div className="flex items-center justify-center h-full text-slate-400">
              <Film className="h-12 w-12" />
            </div>
          )}
          
          {/* Rating Badge */}
          {rating && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs text-white font-medium">{rating}</span>
            </div>
          )}
        </div>

        {/* Movie Info */}
        <div className="p-2">
          <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1 group-hover:text-purple-600 transition-colors">
            {item.title}
          </h4>
          {year && (
            <p className="text-xs text-slate-500">{year}</p>
          )}
        </div>
      </div>
    </a>
  );
}