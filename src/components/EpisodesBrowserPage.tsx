// src/components/EpisodesBrowserPage.tsx
// Separate page for episode browsing - Option B implementation
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
  Download, 
  RefreshCw,
  BarChart3,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useEpisodeDiscovery, useEpisodeBrowser } from '../hooks/useEpisodeDiscovery';
import { EpisodeData } from '../services/episodeDiscoveryService';
import { Movie } from '../lib/supabase';

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

export function EpisodesBrowserPage({ series, onBack }: EpisodesBrowserPageProps) {
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
    loading: serviceLoading
  } = useEpisodeDiscovery();

  const [showStats, setShowStats] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refresh progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      getDiscoveryProgress(series.imdb_id);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [series.imdb_id, getDiscoveryProgress]);

  const handleDiscoverAll = async () => {
    try {
      const result = await discoverSeries(series.imdb_id);
      
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

  const handleEpisodeSelect = (episode: EpisodeData) => {
    console.log('Selected episode:', episode);
    // Could open episode details, add to watchlist, etc.
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header with Back Button */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back to TV Series
                </button>
                
                <div className="border-l border-gray-300 pl-4">
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Tv className="h-8 w-8 text-purple-600" />
                    {series.title}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Episode Browser & Discovery
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

                <a
                  href={`https://www.imdb.com/title/${series.imdb_id}/episodes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on IMDb
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Progress & Stats */}
        {(progress || showStats) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {progress && (
              <>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Episodes Discovered
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {progress.episodes_discovered}
                    {progress.total_episodes > 0 && (
                      <span className="text-lg font-normal text-gray-500">
                        /{progress.total_episodes}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {progress.discovery_percentage.toFixed(1)}% complete
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Zap className="h-4 w-4" />
                    Estimated API Calls
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {progress.estimated_remaining_calls}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    remaining
                  </div>
                </div>
              </>
            )}

            {showStats && cacheStats && (
              <>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Star className="h-4 w-4" />
                    Cache Efficiency
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {cacheStats.api_efficiency}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {cacheStats.cached_episodes} episodes cached
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Queue Status
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {cacheStats.queue_items}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    pending discoveries
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Season Navigation */}
        <div className="bg-white rounded-lg p-4 mb-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Season {currentSeason}
              </h2>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSeason}
                  disabled={!hasPrevSeason}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <select
                  value={currentSeason}
                  onChange={(e) => jumpToSeason(parseInt(e.target.value))}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-900"
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
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {currentEpisodes.length} episodes
              </span>
              
              <button
                onClick={handleRefreshSeason}
                disabled={isCurrentSeasonLoading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:animate-spin disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Episode Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isCurrentSeasonLoading && currentEpisodes.length === 0 ? (
            // Loading state
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse"
              >
                <div className="h-4 bg-gray-300 rounded mb-3"></div>
                <div className="h-3 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3 mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                  <div className="h-6 bg-gray-300 rounded w-12"></div>
                </div>
              </div>
            ))
          ) : currentEpisodes.length > 0 ? (
            // Episodes
            currentEpisodes.map((episode) => (
              <div
                key={`${episode.season_number}-${episode.episode_number}`}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEpisodeSelect(episode)}
              >
                {/* Episode Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {episode.title || `Episode ${episode.episode_number}`}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      S{episode.season_number}E{episode.episode_number.toString().padStart(2, '0')}
                    </p>
                  </div>
                  
                  {episode.imdb_rating && (
                    <div className="flex items-center gap-1 text-sm text-amber-600">
                      <Star className="h-4 w-4 fill-current" />
                      {episode.imdb_rating}
                    </div>
                  )}
                </div>

                {/* Episode Details */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {episode.plot || 'No description available.'}
                </p>

                {/* Episode Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No episodes found for Season {currentSeason}
              </h3>
              <p className="text-gray-600 mb-4">
                This season might not exist or hasn't been discovered yet.
              </p>
              <button
                onClick={handleRefreshSeason}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try discovering episodes
              </button>
            </div>
          )}
        </div>

        {/* Last refresh indicator */}
        {lastRefresh && (
          <div className="text-center text-xs text-gray-500">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

// Standalone page component that can be routed to
export function EpisodesBrowserPageStandalone() {
  // This would get series data from URL params in a real router setup
  // For now, we'll handle navigation from the TV series page
  
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Episode Browser</h2>
        <p className="text-slate-600">Navigate here from a TV series to browse episodes.</p>
      </div>
    </div>
  );
}