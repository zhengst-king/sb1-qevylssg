// src/components/EpisodesBrowserPage.tsx
// Enhanced version with season caching, full TV page features, and episode-specific IMDb links
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
  Info,
  MessageSquare,
  User,
  Users,
  Eye,
  StarIcon,
  Award,
  Film
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { omdbApi, OMDBEpisodeDetails } from '../lib/omdb';
import { ReviewModal } from './ReviewModal';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

interface Episode extends OMDBEpisodeDetails {
  // User tracking fields (mirror TV page)
  status?: 'To Watch' | 'Watching' | 'Watched' | 'To Watch Again';
  user_rating?: number;
  user_review?: string;
  date_watched?: string;
  date_added?: string;
}

// Season cache to prevent refetching
interface SeasonCache {
  [seasonNumber: string]: {
    episodes: Episode[];
    timestamp: number;
    fullyLoaded: boolean;
  };
}

export function EpisodesBrowserPage({ series, onBack }: EpisodesBrowserPageProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSeasons, setTotalSeasons] = useState(10);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [discoveryProgress, setDiscoveryProgress] = useState<{found: number; tried: number}>({found: 0, tried: 0});
  
  // Season-based caching
  const [seasonCache, setSeasonCache] = useState<SeasonCache>({});
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Load episodes for current season with caching
  useEffect(() => {
    loadEpisodesWithCache(currentSeason);
  }, [currentSeason, series.imdb_id]);

  const isCacheValid = (seasonNumber: number): boolean => {
    const cached = seasonCache[seasonNumber.toString()];
    if (!cached) return false;
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > CACHE_DURATION;
    return !isExpired && cached.fullyLoaded;
  };

  const loadEpisodesWithCache = async (seasonNumber: number, forceRefresh = false) => {
    if (!series.imdb_id) {
      setError('No IMDb ID available for this series');
      return;
    }

    // Check cache first (unless forced refresh)
    if (!forceRefresh && isCacheValid(seasonNumber)) {
      console.log(`[Episodes] Using cached data for Season ${seasonNumber}`);
      const cached = seasonCache[seasonNumber.toString()];
      setEpisodes(cached.episodes);
      setDiscoveryProgress({found: cached.episodes.length, tried: cached.episodes.length});
      setError(null);
      return;
    }

    // Load fresh data
    setLoading(true);
    setError(null);
    setEpisodes([]);
    setDiscoveryProgress({found: 0, tried: 0});

    try {
      console.log(`[Episodes] Loading Season ${seasonNumber} for ${series.title} (${forceRefresh ? 'forced refresh' : 'fresh load'})`);

      // Use the enhanced service with progress callback
      const episodeData = await omdbApi.discoverSeasonEpisodes(
        series.imdb_id, 
        seasonNumber,
        {
          maxEpisodes: 30,
          maxConsecutiveFailures: 3,
          onProgress: (found, tried) => {
            setDiscoveryProgress({found, tried});
          }
        }
      );

      // Convert to our Episode interface with user tracking (default values)
      const episodesWithUserData: Episode[] = episodeData.map(ep => ({
        ...ep,
        status: 'To Watch',
        user_rating: undefined,
        user_review: undefined,
        date_watched: undefined,
        date_added: new Date().toISOString().split('T')[0]
      }));

      // Cache the results
      setSeasonCache(prev => ({
        ...prev,
        [seasonNumber.toString()]: {
          episodes: episodesWithUserData,
          timestamp: Date.now(),
          fullyLoaded: true
        }
      }));

      setEpisodes(episodesWithUserData);
      setDiscoveryProgress({found: episodesWithUserData.length, tried: episodesWithUserData.length});

      if (episodesWithUserData.length === 0) {
        setError(`No episodes found for Season ${seasonNumber}. This season might not exist or might not be available in OMDb.`);
      } else {
        console.log(`[Episodes] Successfully loaded and cached ${episodesWithUserData.length} episodes`);
      }
      
    } catch (err) {
      console.error('[Episodes] Error loading episodes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load episodes');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle episode actions (mirror TV page functionality)
  const handleStatusChange = (episode: Episode, status: Episode['status']) => {
    const updatedEpisodes = episodes.map(ep => 
      ep.season === episode.season && ep.episode === episode.episode
        ? { 
            ...ep, 
            status, 
            date_watched: status === 'Watched' ? new Date().toISOString().split('T')[0] : undefined 
          }
        : ep
    );
    
    setEpisodes(updatedEpisodes);
    
    // Update cache
    setSeasonCache(prev => ({
      ...prev,
      [currentSeason.toString()]: {
        ...prev[currentSeason.toString()],
        episodes: updatedEpisodes
      }
    }));
  };

  const handleRatingChange = (episode: Episode, rating: number) => {
    const updatedEpisodes = episodes.map(ep => 
      ep.season === episode.season && ep.episode === episode.episode
        ? { ...ep, user_rating: rating }
        : ep
    );
    
    setEpisodes(updatedEpisodes);
    
    // Update cache
    setSeasonCache(prev => ({
      ...prev,
      [currentSeason.toString()]: {
        ...prev[currentSeason.toString()],
        episodes: updatedEpisodes
      }
    }));
  };

  const handleReviewClick = (episode: Episode) => {
    setSelectedEpisode(episode);
    setShowReviewModal(true);
  };

  const handleSaveReview = (reviewText: string) => {
    if (selectedEpisode) {
      const updatedEpisodes = episodes.map(ep => 
        ep.season === selectedEpisode.season && ep.episode === selectedEpisode.episode
          ? { ...ep, user_review: reviewText }
          : ep
      );
      
      setEpisodes(updatedEpisodes);
      
      // Update cache
      setSeasonCache(prev => ({
        ...prev,
        [currentSeason.toString()]: {
          ...prev[currentSeason.toString()],
          episodes: updatedEpisodes
        }
      }));
    }
    setShowReviewModal(false);
    setSelectedEpisode(null);
  };

  const handleRefresh = async () => {
    // First check if there are any cached episodes
    if (episodes.length === 0) {
      // No episodes cached - queue a discovery job
      console.log('[Episodes] No episodes cached, queuing discovery...');
      await serverSideEpisodeService.addSeriesToQueue(
        series.imdb_id!,
        series.title,
        'high' // High priority for manual user request
      );
    
      // Show feedback to user
      alert(`Discovery started for ${series.title}! Episodes will be cached in the background. This may take a few minutes.`);
    } else {
      // Episodes exist, just reload from cache
      loadEpisodesWithCache(currentSeason, true);
    }
  };

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

  const getStatusColor = (status: Episode['status']) => {
    switch (status) {
      case 'To Watch': return 'bg-blue-100 text-blue-800';
      case 'Watching': return 'bg-yellow-100 text-yellow-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'To Watch Again': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEpisodeIMDbUrl = (episode: Episode): string => {
    if (episode.imdbID) {
      return `https://www.imdb.com/title/${episode.imdbID}/`;
    }
    // Fallback to series episodes page with season anchor
    return `https://www.imdb.com/title/${series.imdb_id}/episodes?season=${episode.season}`;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to TV</span>
                </button>

                <div className="flex items-center space-x-3">
                  <Tv className="h-6 w-6 text-purple-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{series.title}</h1>
                    <p className="text-sm text-slate-600">
                      Browse episodes • Season {currentSeason} • {episodes.length} episodes
                      {isCacheValid(currentSeason) && (
                        <span className="ml-2 text-green-600">(cached)</span>
                      )}
                      {loading && discoveryProgress.tried > 0 && (
                        <span className="ml-2 text-purple-600">
                          (Discovering: {discoveryProgress.found}/{discoveryProgress.tried})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Season Selector */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousSeason}
                  disabled={currentSeason <= 1 || loading}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <select
                  value={currentSeason}
                  onChange={(e) => handleSeasonSelect(Number(e.target.value))}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                >
                  {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(seasonNum => (
                    <option key={seasonNum} value={seasonNum}>
                      Season {seasonNum} {isCacheValid(seasonNum) && '(cached)'}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNextSeason}
                  disabled={currentSeason >= totalSeasons || loading}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {loading && episodes.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Discovering episodes via OMDb API...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Secure HTTPS connection • Smart episode discovery for Season {currentSeason}
                </p>
                {discoveryProgress.tried > 0 && (
                  <p className="text-sm text-purple-600 mt-2">
                    Found {discoveryProgress.found} of {discoveryProgress.tried} episodes checked
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-red-800">Unable to load episodes</h3>
                  <p className="text-red-600 mt-1 text-sm">{error}</p>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={handleRefresh}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Try Again</span>
                    </button>
                    <button
                      onClick={() => setCurrentSeason(1)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Go to Season 1</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Episodes Notice - ADD THIS */}
          {!loading && episodes.length === 0 && !error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-amber-800">
                    Season {currentSeason} episodes haven't been cached yet
                  </h3>
                  <p className="text-amber-600 mt-1 text-sm">
                    Click the button below to start discovering episodes in the background.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await serverSideEpisodeService.addSeriesToQueue(
                          series.imdb_id!,
                          series.title,
                          'high'
                        );
                        alert('Discovery started! Episodes will be cached in the background. Check back in a few minutes.');
                      } catch (err) {
                        alert('Failed to start discovery. Please try again.');
                      }
                    }}
                    className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Start Discovery</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Episodes Grid */}
          {episodes.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {episodes.map((episode) => (
                <div
                  key={`s${episode.season}e${episode.episode}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  {/* Episode Poster Section */}
                  {episode.poster && episode.poster !== 'N/A' && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={episode.poster} 
                        alt={episode.title || `Season ${episode.season}, Episode ${episode.episode}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Episode Card Content */}
                  <div className="p-6">
                    {/* Episode Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <Play className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 leading-tight">
                            Episode {episode.episode}
                          </h3>
                          <p className="text-sm text-slate-500">Season {episode.season}</p>
                        </div>
                      </div>
                      
                      {episode.imdbRating && episode.imdbRating !== 'N/A' && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{episode.imdbRating}</span>
                        </div>
                      )}
                    </div>

                    {/* Episode Title */}
                    {episode.title && (
                      <h4 className="text-lg font-medium text-slate-800 mb-3 leading-tight">
                        {episode.title}
                      </h4>
                    )}

                    {/* User Status Badge */}
                    <div className="mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(episode.status)}`}>
                        {episode.status}
                      </span>
                    </div>

                    {/* Episode Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                      {episode.released && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{episode.released}</span>
                        </div>
                      )}
                      {episode.runtime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{episode.runtime}</span>
                        </div>
                      )}
                    </div>

                    {/* Plot Summary */}
                    {episode.plot && episode.plot !== 'N/A' && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
                        {episode.plot}
                      </p>
                    )}

                    {/* Stars */}
                    {episode.actors && episode.actors !== 'N/A' && (
                      <div className="mb-4 text-xs text-slate-500">
                        <div className="flex items-start space-x-1">
                          <Users className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span><span className="font-medium">Stars:</span> {episode.actors}</span>
                        </div>
                      </div>
                    )}

                    {/* Credits */}
                    {(episode.director || episode.writer) && (
                      <div className="space-y-1 mb-4 text-xs text-slate-500">
                        {episode.director && episode.director !== 'N/A' && (
                          <div className="flex items-start space-x-1">
                            <User className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span><span className="font-medium">Director:</span> {episode.director}</span>
                          </div>
                        )}
                        {episode.writer && episode.writer !== 'N/A' && (
                          <div className="flex items-start space-x-1">
                            <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span><span className="font-medium">Writer:</span> {episode.writer}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* User Review Display */}
                    {episode.user_review && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">My Review</p>
                            <p className="text-sm text-blue-700 mt-1">{episode.user_review}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Actions */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      {/* Status Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {(['To Watch', 'Watching', 'Watched', 'To Watch Again'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(episode, status)}
                            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                              episode.status === status
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-600">Your rating:</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => handleRatingChange(episode, rating)}
                              className="group"
                            >
                              <StarIcon 
                                className={`h-4 w-4 transition-colors ${
                                  episode.user_rating && rating <= episode.user_rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-slate-300 group-hover:text-yellow-400'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        {episode.user_rating && (
                          <span className="text-xs text-slate-600">({episode.user_rating}/5)</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReviewClick(episode)}
                          className="flex-1 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>
                            {episode.user_review ? 'Edit Review' : 'Add Review'}
                          </span>
                        </button>

                        {/* IMDb Button */}
                        <a
                          href={getEpisodeIMDbUrl(episode)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>IMDb</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading progress during discovery */}
          {loading && episodes.length > 0 && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Still discovering episodes... ({discoveryProgress.found} found)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-slate-400" />
                <span>Powered by OMDb API • Season Caching • Smart Discovery</span>
              </div>
              {episodes.length > 0 && (
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {episodes.length} episodes {isCacheValid(currentSeason) ? 'cached' : 'loaded'}
                </span>
              )}
              <span className="text-xs text-slate-500">
                Cache: {Object.keys(seasonCache).length} seasons stored
              </span>
            </div>
            {series.imdb_id && (
              <a
                href={omdbApi.getIMDbEpisodesUrl(series.imdb_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View all episodes on IMDb</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedEpisode && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
          movieTitle={`${series.title} - S${selectedEpisode.season}E${selectedEpisode.episode}${selectedEpisode.title ? ': ' + selectedEpisode.title : ''}`}
          initialReview={selectedEpisode.user_review || ''}
          onSave={handleSaveReview}
        />
      )}
    </>
  );
}