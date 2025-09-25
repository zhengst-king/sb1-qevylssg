// File: src/components/EpisodeBrowser.tsx

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Clock, 
  Calendar, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  RefreshCw,
  BarChart3,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useEpisodeDiscovery, useEpisodeBrowser } from '../hooks/useEpisodeDiscovery';
import { EpisodeData } from '../services/episodeDiscoveryService';

interface EpisodeBrowserProps {
  seriesImdbId: string;
  seriesTitle: string;
  onEpisodeSelect?: (episode: EpisodeData) => void;
}

export function EpisodeBrowser({ seriesImdbId, seriesTitle, onEpisodeSelect }: EpisodeBrowserProps) {
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
  } = useEpisodeBrowser(seriesImdbId);

  const {
    discoverSeries,
    getDiscoveryProgress,
    cacheStats,
    loading: serviceLoading
  } = useEpisodeDiscovery();

  const [showStats, setShowStats] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refresh progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      getDiscoveryProgress(seriesImdbId);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [seriesImdbId, getDiscoveryProgress]);

  const handleDiscoverAll = async () => {
    try {
      const result = await discoverSeries(seriesImdbId);
      
      if (result.queued) {
        alert(`Discovery queued! This will require approximately ${result.estimatedCalls} API calls and will process in the background.`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start discovery');
    }
  };

  const handleRefreshSeason = async () => {
    await loadSeason(currentSeason, false);
    setLastRefresh(new Date());
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {seriesTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Episode Browser & Discovery
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </button>
          
          <button
            onClick={handleDiscoverAll}
            disabled={serviceLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Discover All
          </button>
        </div>
      </div>

      {/* Progress & Stats */}
      {(progress || showStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {progress && (
            <>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  Episodes Discovered
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {progress.episodes_discovered}
                  {progress.total_episodes > 0 && (
                    <span className="text-lg font-normal text-gray-500">
                      /{progress.total_episodes}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {progress.discovery_percentage.toFixed(1)}% complete
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Zap className="h-4 w-4" />
                  Estimated API Calls
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {progress.estimated_remaining_calls}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  remaining
                </div>
              </div>
            </>
          )}

          {showStats && cacheStats && (
            <>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Star className="h-4 w-4" />
                  Cache Efficiency
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {cacheStats.api_efficiency}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cacheStats.cached_episodes} episodes cached
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Queue Status
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {cacheStats.queue_items}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  pending discoveries
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Season Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Season {currentSeason}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={prevSeason}
              disabled={!hasPrevSeason}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <select
              value={currentSeason}
              onChange={(e) => jumpToSeason(parseInt(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Array.from({ length: totalSeasons || 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Season {i + 1} 
                  {episodesInSeason(i + 1) > 0 && ` (${episodesInSeason(i + 1)} episodes)`}
                </option>
              ))}
            </select>
            
            <button
              onClick={nextSeason}
              disabled={!hasNextSeason}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentEpisodes.length} episodes
          </span>
          
          <button
            onClick={handleRefreshSeason}
            disabled={isCurrentSeasonLoading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:animate-spin disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Episode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isCurrentSeasonLoading && currentEpisodes.length === 0 ? (
          // Loading state
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-4"></div>
              <div className="flex gap-2">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
              </div>
            </div>
          ))
        ) : currentEpisodes.length > 0 ? (
          // Episodes
          currentEpisodes.map((episode) => (
            <div
              key={`${episode.season_number}-${episode.episode_number}`}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onEpisodeSelect?.(episode)}
            >
              {/* Episode Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {episode.title || `Episode ${episode.episode_number}`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    S{episode.season_number}E{episode.episode_number.toString().padStart(2, '0')}
                  </p>
                </div>
                
                {episode.imdb_rating && (
                  <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    {episode.imdb_rating}
                  </div>
                )}
              </div>

              {/* Episode Details */}
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                {episode.plot || 'No description available.'}
              </p>

              {/* Episode Meta */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {episode.air_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatAirDate(episode.air_date)}
                  </div>
                )}
                
                {episode.runtime_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRuntime(episode.runtime_minutes)}
                  </div>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  <Play className="h-3 w-3" />
                  <span>Cached {episode.access_count || 0}x</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          // No episodes found
          <div className="col-span-full text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No episodes found for Season {currentSeason}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This season might not exist or hasn't been discovered yet.
            </p>
            <button
              onClick={handleRefreshSeason}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try discovering episodes
            </button>
          </div>
        )}
      </div>

      {/* Last refresh indicator */}
      {lastRefresh && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// Usage example component
export function EpisodeBrowserDemo() {
  const [selectedSeries] = useState({
    imdbId: 'tt0944947', // Game of Thrones example
    title: 'Game of Thrones'
  });

  const handleEpisodeSelect = (episode: EpisodeData) => {
    console.log('Selected episode:', episode);
    // Handle episode selection - could open modal, navigate, etc.
  };

  return (
    <EpisodeBrowser
      seriesImdbId={selectedSeries.imdbId}
      seriesTitle={selectedSeries.title}
      onEpisodeSelect={handleEpisodeSelect}
    />
  );
}