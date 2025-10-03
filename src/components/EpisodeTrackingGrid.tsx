// src/components/EpisodeTrackingGrid.tsx
import React, { useState, useEffect } from 'react';
import { episodeTrackingService } from '../services/episodeTrackingService';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';

interface EpisodeTrackingGridProps {
  seriesImdbId: string;
  totalSeasons: number;
}

interface EpisodeCell {
  season: number;
  episode: number;
  status?: 'To Watch' | 'Watching' | 'Watched' | 'To Watch Again';
  exists: boolean; // Does the episode exist in cache
}

export function EpisodeTrackingGrid({ seriesImdbId, totalSeasons }: EpisodeTrackingGridProps) {
  const [gridData, setGridData] = useState<Map<string, EpisodeCell>>(new Map());
  const [maxEpisodes, setMaxEpisodes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackingData();
  }, [seriesImdbId, totalSeasons]);

  const loadTrackingData = async () => {
    setLoading(true);
    try {
      const grid = new Map<string, EpisodeCell>();
      let maxEps = 0;

      // Load data for each season
      for (let season = 1; season <= totalSeasons; season++) {
        // Get episodes from cache to know which exist
        const cachedEpisodes = await serverSideEpisodeService.getSeasonEpisodes(seriesImdbId, season);
        
        // Get user tracking data
        const trackingMap = await episodeTrackingService.getSeasonTracking(seriesImdbId, season);

        if (cachedEpisodes && cachedEpisodes.length > 0) {
          maxEps = Math.max(maxEps, cachedEpisodes.length);

          cachedEpisodes.forEach(ep => {
            const key = `${season}-${ep.episode}`;
            const tracking = trackingMap.get(ep.episode);
            
            grid.set(key, {
              season,
              episode: ep.episode,
              status: tracking?.status,
              exists: true
            });
          });
        }
      }

      setGridData(grid);
      setMaxEpisodes(maxEps);
    } catch (error) {
      console.error('Error loading tracking grid:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (cell: EpisodeCell | undefined): string => {
    if (!cell || !cell.exists) return 'bg-white border-slate-200';
    
    switch (cell.status) {
      case 'Watched':
        return 'bg-green-200 border-green-300 hover:bg-green-300';
      case 'Watching':
        return 'bg-blue-200 border-blue-300 hover:bg-blue-300';
      case 'To Watch':
        return 'bg-yellow-200 border-yellow-300 hover:bg-yellow-300';
      case 'To Watch Again':
        return 'bg-purple-200 border-purple-300 hover:bg-purple-300';
      default:
        return 'bg-yellow-100 border-yellow-200 hover:bg-yellow-200'; // Default to "To Watch"
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-32 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (totalSeasons === 0 || maxEpisodes === 0) {
    return (
      <div className="text-sm text-slate-500">
        No episode data available yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Episode Progress</h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
          <span className="text-slate-600">Watched</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded"></div>
          <span className="text-slate-600">Watching</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-200 border border-yellow-300 rounded"></div>
          <span className="text-slate-600">To Watch</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-purple-200 border border-purple-300 rounded"></div>
          <span className="text-slate-600">To Watch Again</span>
        </div>
      </div>

      {/* Grid Container - Scrollable */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Episode Headers */}
          <div className="flex items-center mb-1">
            <div className="w-12 flex-shrink-0"></div>
            <div className="flex gap-1">
              {Array.from({ length: maxEpisodes }, (_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 flex items-center justify-center text-xs font-medium text-slate-600"
                  title={`Episode ${i + 1}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Season Rows */}
          {Array.from({ length: totalSeasons }, (_, seasonIdx) => {
            const season = seasonIdx + 1;
            return (
              <div key={season} className="flex items-center mb-1">
                {/* Season Label */}
                <div className="w-12 flex-shrink-0 text-xs font-semibold text-slate-700">
                  S{season}
                </div>
                
                {/* Episode Cells */}
                <div className="flex gap-1">
                  {Array.from({ length: maxEpisodes }, (_, episodeIdx) => {
                    const episode = episodeIdx + 1;
                    const key = `${season}-${episode}`;
                    const cell = gridData.get(key);
                    
                    return (
                      <div
                        key={episode}
                        className={`w-6 h-6 border rounded cursor-pointer transition-colors ${getStatusColor(cell)}`}
                        title={cell?.exists ? `S${season}E${episode} - ${cell?.status || 'To Watch'}` : 'Episode not available'}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}