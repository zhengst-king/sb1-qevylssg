// src/components/EpisodesBrowserPage.tsx
// Simple working version for TV series episodes browsing
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
  Search
} from 'lucide-react';
import { Movie } from '../lib/supabase';

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

interface Episode {
  season: number;
  episode: number;
  title: string;
  plot?: string;
  airDate?: string;
  imdbRating?: string;
  runtime?: string;
}

export function EpisodesBrowserPage({ series, onBack }: EpisodesBrowserPageProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSeasons, setTotalSeasons] = useState(5); // Default assumption

  // Mock episode data for demonstration - replace with actual API calls
  const generateMockEpisodes = (season: number): Episode[] => {
    const episodeCount = Math.floor(Math.random() * 10) + 8; // 8-18 episodes per season
    return Array.from({ length: episodeCount }, (_, i) => ({
      season,
      episode: i + 1,
      title: `Episode ${i + 1}`,
      plot: `This is a compelling episode of ${series.title} where exciting things happen and the story progresses in unexpected ways.`,
      airDate: new Date(2020 + season, Math.floor(i/4), (i * 7) % 28 + 1).toISOString().split('T')[0],
      imdbRating: (Math.random() * 3 + 7).toFixed(1),
      runtime: `${Math.floor(Math.random() * 20) + 40}min`
    }));
  };

  // Load episodes for current season
  useEffect(() => {
    const loadEpisodes = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, generate mock data
        const mockEpisodes = generateMockEpisodes(currentSeason);
        setEpisodes(mockEpisodes);
        
        // You would replace this with actual API calls like:
        // const response = await fetch(`/api/series/${series.imdb_id}/season/${currentSeason}/episodes`);
        // const data = await response.json();
        // setEpisodes(data.episodes);
        
      } catch (err) {
        setError('Failed to load episodes. This is a demo with mock data.');
        console.error('Error loading episodes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEpisodes();
  }, [currentSeason, series.imdb_id]);

  const nextSeason = () => {
    if (currentSeason < totalSeasons) {
      setCurrentSeason(currentSeason + 1);
    }
  };

  const prevSeason = () => {
    if (currentSeason > 1) {
      setCurrentSeason(currentSeason - 1);
    }
  };

  const handleEpisodeClick = (episode: Episode) => {
    console.log('Clicked episode:', episode);
    // You could add functionality here like:
    // - Mark as watched
    // - Add to watch queue
    // - Open episode details
    // - External links to streaming services
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
              disabled={currentSeason <= 1}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <select
              value={currentSeason}
              onChange={(e) => setCurrentSeason(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {Array.from({ length: totalSeasons }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Season {i + 1}
                </option>
              ))}
            </select>
            
            <button
              onClick={nextSeason}
              disabled={currentSeason >= totalSeasons}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading episodes...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Unable to load episodes</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={() => setCurrentSeason(currentSeason)} // Trigger reload
                  className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Episodes Grid */}
        {!loading && !error && episodes.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Season {currentSeason} Episodes
              </h2>
              <p className="text-slate-600">
                {episodes.length} episode{episodes.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {episodes.map((episode) => (
                <div
                  key={`${episode.season}-${episode.episode}`}
                  onClick={() => handleEpisodeClick(episode)}
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                >
                  {/* Episode Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                        {episode.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        S{episode.season}E{episode.episode.toString().padStart(2, '0')}
                      </p>
                    </div>
                    
                    {episode.imdbRating && (
                      <div className="flex items-center space-x-1 text-sm text-amber-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{episode.imdbRating}</span>
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
                      {episode.airDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(episode.airDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {episode.runtime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{episode.runtime}</span>
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
        {!loading && !error && episodes.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No episodes found
            </h3>
            <p className="text-slate-600 mb-6">
              Season {currentSeason} doesn't have any episodes available yet.
            </p>
            <button
              onClick={() => setCurrentSeason(1)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go to Season 1</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            <strong>Note:</strong> This is a demo with mock episode data. 
            In production, this would connect to episode databases like OMDB, TMDB, or TV Maze.
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