// File: src/hooks/useEpisodeDiscovery.ts

import { useState, useEffect, useCallback } from 'react';
import { episodeDiscoveryService, EpisodeData, DiscoveryProgress } from '../services/episodeDiscoveryService';
import { useAuth } from './useAuth';

export interface UseEpisodeDiscoveryOptions {
  autoDiscover?: boolean;
  maxApiCalls?: number;
  backgroundProcess?: boolean;
}

export interface EpisodeDiscoveryState {
  episodes: EpisodeData[];
  loading: boolean;
  error: string | null;
  progress: DiscoveryProgress | null;
  cacheStats: {
    cached_episodes: number;
    queue_items: number;
    api_efficiency: number;
  } | null;
}

export function useEpisodeDiscovery(options: UseEpisodeDiscoveryOptions = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<EpisodeDiscoveryState>({
    episodes: [],
    loading: false,
    error: null,
    progress: null,
    cacheStats: null
  });

  // Get single episode
  const getEpisode = useCallback(async (
    imdbId: string,
    seasonNum: number,
    episodeNum: number,
    forceRefresh: boolean = false
  ): Promise<EpisodeData | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const episode = await episodeDiscoveryService.getEpisode(
        imdbId,
        seasonNum,
        episodeNum,
        {
          forceRefresh,
          userId: user?.id,
          backgroundProcess: options.backgroundProcess
        }
      );

      return episode;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get episode';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id, options.backgroundProcess]);

  // Discover full season
  const discoverSeason = useCallback(async (
    seriesImdbId: string,
    seasonNumber: number
  ): Promise<EpisodeData[]> => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      episodes: [] 
    }));

    try {
      const episodes = await episodeDiscoveryService.discoverSeason(
        seriesImdbId,
        seasonNumber,
        {
          maxApiCalls: options.maxApiCalls || 50,
          userId: user?.id,
          backgroundProcess: options.backgroundProcess || false
        }
      );

      setState(prev => ({ ...prev, episodes }));
      return episodes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover season';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id, options.maxApiCalls, options.backgroundProcess]);

  // Discover full series (background only)
  const discoverSeries = useCallback(async (
    seriesImdbId: string
  ): Promise<{ queued: boolean; estimatedCalls: number }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await episodeDiscoveryService.discoverSeries(
        seriesImdbId,
        {
          maxApiCalls: options.maxApiCalls || 200,
          userId: user?.id
        }
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to queue series discovery';
      setState(prev => ({ ...prev, error: errorMessage }));
      return { queued: false, estimatedCalls: 0 };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id, options.maxApiCalls]);

  // Get discovery progress
  const getDiscoveryProgress = useCallback(async (
    seriesImdbId: string
  ): Promise<DiscoveryProgress | null> => {
    try {
      const progress = await episodeDiscoveryService.getDiscoveryProgress(seriesImdbId);
      setState(prev => ({ ...prev, progress }));
      return progress;
    } catch (error) {
      console.error('Failed to get discovery progress:', error);
      return null;
    }
  }, []);

  // Get popular episodes (for recommendations)
  const getPopularEpisodes = useCallback(async (
    limit: number = 20
  ): Promise<EpisodeData[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const episodes = await episodeDiscoveryService.getPopularEpisodes(limit);
      setState(prev => ({ ...prev, episodes }));
      return episodes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get popular episodes';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Load service stats
  const loadServiceStats = useCallback(async () => {
    try {
      const stats = await episodeDiscoveryService.getServiceStats();
      setState(prev => ({ 
        ...prev, 
        cacheStats: {
          cached_episodes: stats.cached_episodes,
          queue_items: stats.queue_items,
          api_efficiency: stats.api_efficiency
        }
      }));
    } catch (error) {
      console.error('Failed to load service stats:', error);
    }
  }, []);

  // Auto-load stats on mount
  useEffect(() => {
    loadServiceStats();
  }, [loadServiceStats]);

  return {
    // State
    episodes: state.episodes,
    loading: state.loading,
    error: state.error,
    progress: state.progress,
    cacheStats: state.cacheStats,

    // Actions
    getEpisode,
    discoverSeason,
    discoverSeries,
    getDiscoveryProgress,
    getPopularEpisodes,
    loadServiceStats,

    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearEpisodes: () => setState(prev => ({ ...prev, episodes: [] }))
  };
}

// Additional hook for episode browsing with pagination
export function useEpisodeBrowser(seriesImdbId: string) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Record<number, EpisodeData[]>>({});
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);
  
  const { user } = useAuth();

  // Load specific season
  const loadSeason = useCallback(async (seasonNumber: number, background: boolean = true) => {
    if (episodes[seasonNumber] || loadingSeasons.has(seasonNumber)) {
      return episodes[seasonNumber] || [];
    }

    setLoadingSeasons(prev => new Set(prev).add(seasonNumber));

    try {
      const seasonEpisodes = await episodeDiscoveryService.discoverSeason(
        seriesImdbId,
        seasonNumber,
        {
          maxApiCalls: 30, // Conservative for individual seasons
          userId: user?.id,
          backgroundProcess: background
        }
      );

      setEpisodes(prev => ({
        ...prev,
        [seasonNumber]: seasonEpisodes
      }));

      return seasonEpisodes;
    } catch (error) {
      console.error(`Failed to load season ${seasonNumber}:`, error);
      return [];
    } finally {
      setLoadingSeasons(prev => {
        const newSet = new Set(prev);
        newSet.delete(seasonNumber);
        return newSet;
      });
    }
  }, [seriesImdbId, user?.id, episodes, loadingSeasons]);

  // Navigate seasons
  const nextSeason = useCallback(() => {
    const newSeason = currentSeason + 1;
    setCurrentSeason(newSeason);
    // Preload next season
    loadSeason(newSeason, true);
  }, [currentSeason, loadSeason]);

  const prevSeason = useCallback(() => {
    if (currentSeason > 1) {
      setCurrentSeason(currentSeason - 1);
    }
  }, [currentSeason]);

  const jumpToSeason = useCallback((seasonNumber: number) => {
    setCurrentSeason(seasonNumber);
    loadSeason(seasonNumber, false); // Load immediately for jumps
  }, [loadSeason]);

  // Load progress on mount
  useEffect(() => {
    episodeDiscoveryService.getDiscoveryProgress(seriesImdbId)
      .then(setProgress)
      .catch(console.error);
  }, [seriesImdbId]);

  // Auto-load first season
  useEffect(() => {
    loadSeason(1, false);
  }, [seriesImdbId]); // Only depend on series change

  return {
    // Current state
    currentSeason,
    currentEpisodes: episodes[currentSeason] || [],
    allEpisodes: episodes,
    progress,
    
    // Loading states
    isLoadingSeason: (season: number) => loadingSeasons.has(season),
    isCurrentSeasonLoading: loadingSeasons.has(currentSeason),
    
    // Navigation
    nextSeason,
    prevSeason,
    jumpToSeason,
    
    // Data loading
    loadSeason,
    
    // Utilities
    hasNextSeason: progress ? currentSeason < (progress.total_episodes / 20) : true, // Rough estimate
    hasPrevSeason: currentSeason > 1,
    totalSeasons: progress ? Math.ceil(progress.total_episodes / 20) : undefined,
    
    // Stats
    episodesInSeason: (season: number) => episodes[season]?.length || 0,
    totalEpisodesLoaded: Object.values(episodes).flat().length
  };
}