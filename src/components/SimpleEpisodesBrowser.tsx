// src/components/SimpleEpisodesBrowser.tsx
// Standalone episodes browser component to avoid inline component issues
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
  ExternalLink 
} from 'lucide-react';
import { Movie } from '../lib/supabase';

interface SimpleEpisodesBrowserProps {
  series: Movie;
  onBack: () => void;
}

interface MockEpisode {
  season: number;
  episode: number;
  title: string;
  plot: string;
  airDate: string;
  imdbRating: string;
  runtime: string;
}

export function SimpleEpisodesBrowser({ series, onBack }: SimpleEpisodesBrowserProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<MockEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSeasons] = useState(5); // Simple assumption for demo

  // Load episodes when season changes
  useEffect(() => {
    const loadEpisodes = async () => {
      setLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Generate mock episodes for demonstration
        const episodeCount = Math.floor(Math.random() * 8) + 8; // 8-16 episodes
        const mockEpisodes: MockEpisode[] = Array.from({ length: episodeCount }, (_, i) => ({
          season: currentSeason,
          episode: i + 1,
          title: `Episode ${i + 1}${i === 0 ? ': Pilot' : i === episodeCount - 1 ? ': Season Finale' : ''}`,
          plot: `An exciting episode of ${series.title} featuring compelling storylines, character development, and dramatic moments that advance the overall narrative arc of the series.`,
          airDate: new Date(2020 + currentSeason - 1, Math.floor(i/4), (i * 7) % 28 + 1).toISOString().split('T')[0],
          imdbRating: (Math.random() * 3 + 7).toFixed(1),
          runtime: `${Math.floor(Math.random() * 20) + 40}min`
        }));
        
        setEpisodes(mockEpisodes);
      } catch (error) {
        console.error('Error loading episodes:', error);
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    };

    loadEpisodes();
  }, [currentSeason, series.title]);

  const handlePreviousSeason = () => {
    if (currentSeason > 1) {
      setCurrentSeason(currentSeason - 1);
    }
  };

  const handleNextSeason = () => {
    if (currentSeason < totalSeasons) {
      setCurrentSeason(currentSeason + 1);
    }
  };

  const handleSeasonSelect = (seasonNumber: number) => {
    setCurrentSeason(seasonNumber);
  };

  const handleEpisodeClick = (episode: MockEpisode) => {
    console.log('Episode clicked:', episode);
    // Future: Add episode details, mark as watched, etc.
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
              title="Back to TV Series"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Tv className="h-6 w-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">{series.title}</h1>
              </div>
              <p className="text-slate-600">Browse episodes • Season {currentSeason}</p>
            </div>
          </div>

          {/* Season Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousSeason}
              disabled={currentSeason <= 1}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Season"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <select
              value={currentSeason}
              onChange={(e) => handleSeasonSelect(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {Array.from({ length: totalSeasons }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Season {i + 1}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleNextSeason}
              disabled={currentSeason >= totalSeasons}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Season"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-slate-600">Loading episodes...</p>
              <p className="text-xs text-slate-500 mt-1">Fetching season {currentSeason} data</p>
            </div>
          </div>
        ) : episodes.length > 0 ? (
          <>
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
                  key={`S${episode.season}E${episode.episode}`}
                  onClick={() => handleEpisodeClick(episode)}
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                >
                  {/* Episode Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                        {episode.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        S{episode.season}E{episode.episode.toString().padStart(2, '0')}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-sm text-amber-600 ml-2">
                      <Star className="h-4 w-4 fill-current" />
                      <span>{episode.imdbRating}</span>
                    </div>
                  </div>

                  {/* Episode Plot */}
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {episode.plot}
                  </p>

                  {/* Episode Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(episode.airDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{episode.runtime}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-3 w-3" />
                      <span>View</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No episodes found
            </h3>
            <p className="text-slate-600 mb-6">
              Season {currentSeason} doesn't have any episodes available yet.
            </p>
            <button
              onClick={() => handleSeasonSelect(1)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go to Season 1</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            <strong>Demo Mode:</strong> Showing mock episode data • Ready for OMDb API integration
          </div>
          {series.imdb_id && (
            <a
              href={`https://www.imdb.com/title/${series.imdb_id}/episodes`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 transition-colors"
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