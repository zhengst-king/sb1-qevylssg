// src/components/EpisodesBrowserPage.tsx
// Real OMDb API integration with episode discovery service
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Tv, 
  Play, 
  Clock, 
  Calendar, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Search,
  Loader,
  Info
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { useEpisodeBrowser, useEpisodeDiscovery } from '../hooks/useEpisodeDiscovery';
import { EpisodeData } from '../services/episodeDiscoveryService';

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

export function EpisodesBrowserPage({ series, onBack }: EpisodesBrowserPageProps) {
  // Use the real episode discovery hooks
  const {
    currentSeason,
    currentEpisodes,
    progress,
    isCurrentSeasonLoading,
    nextSeason,
    prevSeason,
    jumpToSeason,
    loadSeason,
    hasNextSeason,
    hasPrevSeason,
    totalSeasons,
    episodesInSeason
  } = useEpisodeBrowser(series.imdb_id);

  const {
    discoverSeries,
    getDiscoveryProgress,
    cacheStats,
    loading: serviceLoading,
    error: serviceError
  } = useEpisodeDiscovery();

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Auto-refresh progress periodically
  useEffect(() => {
    if (series.imdb_id) {
      const interval = setInterval(() => {
        getDiscoveryProgress(series.imdb_id);
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [series.imdb_id, getDiscoveryProgress]);

  const handleDiscoverSeries = async () => {
    if (!series.imdb_id) return;
    
    try {
      const result = await discoverSeries(series.imdb_id);
      if (result.queued) {
        alert(`Discovery queued! This will require approximately ${result.estimatedCalls} API calls and will process in the background.`);
      }
    } catch (error) {
      console.error('Failed to discover series:', error);
    }
  };

  const handleRefreshSeason = async () => {
    if (!series.imdb_id) return;
    
    await loadSeason(currentSeason, false);
    setLastRefresh(new Date());
  };

  const handleEpisodeClick = (episode: EpisodeData) => {
    console.log('Clicked episode:', episode);
    // Could add functionality here like:
    // - Mark as watched
    // - Add to watch queue  
    // - Open episode details
    // - External links to streaming services
  };

  const formatAirDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatRuntime = (minutes: number | undefined) => {
    if (!minutes) return 'Unknown';
    return `${minutes}min`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Tv className="h-6 w-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">{series.title}</h1>
              </div>
              <p className="text-slate-600">
                Browse episodes • Season {currentSeason}
              </p>
            </div>
          </div>

          {/* Season Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={prevSeason}
              disabled={!hasPrevSeason}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <select
              value={currentSeason}
              onChange={(e) => jumpToSeason(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {Array.from({ length: totalSeasons || 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Season {i + 1} {episodesInSeason(i + 1) > 0 && `(${episodesInSeason(i + 1)} episodes)`}
                </option>
              ))}
            </select>
            
            <button
              onClick={nextSeason}
              disabled={!hasNextSeason}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefreshSeason}
              disabled={isCurrentSeasonLoading}
              className="p-2 text-slate-400 hover:text-purple-600 disabled:animate-spin transition-colors"
              title="Refresh season episodes"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Discovery Progress */}
        {progress && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-blue-900">Episode Discovery Progress</h3>
              <span className="text-sm text-blue-600">
                {progress.episodes_discovered} of {progress.total_episodes} episodes
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.discovery_percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-blue-600">
              <span>{progress.discovery_percentage.toFixed(1)}% complete</span>
              <span>{progress.estimated_remaining_calls} API calls remaining</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isCurrentSeasonLoading && currentEpisodes.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading episodes from OMDb API...</p>
              <p className="text-xs text-slate-500 mt-1">
                This may take a moment for the first load
              </p>
            </div>
          </div>
        )}

        {/* Service Error State */}
        {serviceError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Unable to load episodes</h3>
                <p className="text-red-600 mt-1">{serviceError}</p>
                <div className="flex space-x-3 mt-3">
                  <button
                    onClick={handleRefreshSeason}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry</span>
                  </button>
                  <button
                    onClick={handleDiscoverSeries}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span>Discover All Episodes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Episodes Grid */}
        {!isCurrentSeasonLoading && !serviceError && currentEpisodes.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Season {currentSeason} Episodes
              </h2>
              <p className="text-slate-600">
                {currentEpisodes.length} episode{currentEpisodes.length !== 1 ? 's' : ''} available
                {lastRefresh && (
                  <span className="ml-2 text-xs text-slate-500">
                    • Last updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentEpisodes.map((episode) => (
                <div
                  key={`${episode.season_number}-${episode.episode_number}`}
                  onClick={() => handleEpisodeClick(episode)}
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                >
                  {/* Episode Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                        {episode.title || `Episode ${episode.episode_number}`}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        S{episode.season_number}E{episode.episode_number.toString().padStart(2, '0')}
                      </p>
                    </div>
                    
                    {episode.imdb_rating && (
                      <div className="flex items-center space-x-1 text-sm text-amber-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{episode.imdb_rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Episode Plot */}
                  {episode.plot && (
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                      {episode.plot}
                    </p>
                  )}

                  {/* Episode Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-3">
                      {episode.air_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatAirDate(episode.air_date)}</span>
                        </div>
                      )}
                      
                      {episode.runtime_minutes && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRuntime(episode.runtime_minutes)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-3 w-3" />
                      <span>View</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Episodes State */}
        {!isCurrentSeasonLoading && !serviceError && currentEpisodes.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No episodes found for Season {currentSeason}
            </h3>
            <p className="text-slate-600 mb-6">
              This season might not exist or hasn't been discovered yet.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => jumpToSeason(1)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go to Season 1</span>
              </button>
              <button
                onClick={handleDiscoverSeries}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Discover All Episodes</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center space-x-4">
            <div>
              <strong>Episode Data:</strong> Powered by OMDb API with intelligent caching
            </div>
            {cacheStats && (
              <div className="flex items-center space-x-3 text-xs">
                <span>📊 {cacheStats.cached_episodes} cached episodes</span>
                <span>⚡ {cacheStats.api_efficiency.toFixed(1)}% API efficiency</span>
              </div>
            )}
          </div>
          {series.imdb_id && (
            <a
              href={`https://www.imdb.com/title/${series.imdb_id}/episodes`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View on IMDb</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}