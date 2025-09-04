import React, { useState } from 'react';
import { Plus, X, Undo, Star, Calendar, Film, Tv, ExternalLink } from 'lucide-react';
import { DynamicRecommendation } from '../ai/DynamicRecommendationEngine';

interface RecommendationCardProps {
  recommendation: DynamicRecommendation;
  onAddToWatchlist: (recommendation: DynamicRecommendation) => Promise<void>;
  onNotInterested: (recommendation: DynamicRecommendation) => Promise<void>;
  onUndo: (recommendation: DynamicRecommendation) => Promise<void>;
}

export function RecommendationCard({ 
  recommendation, 
  onAddToWatchlist, 
  onNotInterested, 
  onUndo 
}: RecommendationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const handleAddToWatchlist = async () => {
    setIsAdding(true);
    try {
      await onAddToWatchlist(recommendation);
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleNotInterested = async () => {
    setIsRemoving(true);
    try {
      await onNotInterested(recommendation);
      setShowUndo(true);
      
      // Hide undo button after 5 seconds
      setTimeout(() => {
        setShowUndo(false);
      }, 5000);
    } catch (error) {
      console.error('Failed to mark as not interested:', error);
      setIsRemoving(false);
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await onUndo(recommendation);
      setShowUndo(false);
      setIsRemoving(false);
    } catch (error) {
      console.error('Failed to undo:', error);
    } finally {
      setIsUndoing(false);
    }
  };

  const imdbUrl = recommendation.imdbUrl || `https://www.imdb.com/title/${recommendation.imdbID}/`;

  if (isRemoving && !showUndo) {
    return null; // Hide the card
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 min-w-[280px] max-w-[280px] relative ${
      showUndo ? 'opacity-50' : ''
    }`}>
      {/* Undo Toast */}
      {showUndo && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white rounded-lg p-4 shadow-xl">
            <p className="text-sm text-slate-700 mb-3">Marked as not interested</p>
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Undo className="h-4 w-4" />
              <span>{isUndoing ? 'Undoing...' : 'Undo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Poster */}
      <div className="relative">
        {recommendation.poster && recommendation.poster !== 'N/A' ? (
          <img
            src={recommendation.poster}
            alt={recommendation.title}
            className="w-full h-64 object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback placeholder */}
        <div className={`w-full h-64 bg-slate-200 flex items-center justify-center ${
          recommendation.poster && recommendation.poster !== 'N/A' ? 'hidden' : ''
        }`}>
          {recommendation.type === 'series' ? (
            <Tv className="h-12 w-12 text-slate-400" />
          ) : (
            <Film className="h-12 w-12 text-slate-400" />
          )}
        </div>
        
        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            recommendation.type === 'series' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {recommendation.type === 'series' ? (
              <Tv className="h-3 w-3" />
            ) : (
              <Film className="h-3 w-3" />
            )}
            <span>{recommendation.type === 'series' ? 'TV Series' : 'Movie'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-tight">
          {recommendation.title}
        </h3>
        
        <div className="flex items-center space-x-3 mb-3 text-sm text-slate-600">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{recommendation.year}</span>
          </div>
          
          {recommendation.imdbRating && recommendation.imdbRating !== 'N/A' && (
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>{recommendation.imdbRating}</span>
            </div>
          )}
        </div>

        {recommendation.genre && recommendation.genre !== 'N/A' && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recommendation.genre.split(', ').slice(0, 2).map((genre, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
          {recommendation.reason}
        </p>
        
        {/* ML Confidence Score */}
        {recommendation.confidence > 0.6 && (
          <div className="flex items-center space-x-1 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              recommendation.confidence > 0.8 ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            <span className={`text-xs font-medium ${
              recommendation.confidence > 0.8 ? 'text-green-600' : 'text-blue-600'
            }`}>
              {recommendation.confidence > 0.8 ? 'High confidence' : 'Good match'}
            </span>
          </div>
        )}

        {/* IMDb Link */}
        <a
          href={imdbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 mb-3 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          <span>View on IMDb</span>
        </a>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleAddToWatchlist}
            disabled={isAdding || showUndo}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            <span>{isAdding ? 'Adding...' : 'Add'}</span>
          </button>
          
          <button
            onClick={handleNotInterested}
            disabled={isRemoving || showUndo}
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            title="Not interested"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}