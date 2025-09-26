// src/components/EpisodesBrowserPage.tsx
// Optimized version using the enhanced OMDb service
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
  StarIcon
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { omdbApi, OMDBEpisodeDetails } from '../lib/omdb'; // Enhanced service
import { ReviewModal } from './ReviewModal';

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

interface Episode extends OMDBEpisodeDetails {
  // User tracking fields
  userStatus?: 'To Watch' | 'Watching' | 'Watched' | 'Skipped';
  userRating?: number;
  userReview?: string;
  dateWatched?: string;
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

  // Load episodes for current season using enhanced service
  useEffect(() => {
    loadEpisodes(currentSeason);
  }, [currentSeason, series.imdb_id]);

  const loadEpisodes = async (seasonNumber: number) => {
    if (!series.imdb_id) {
      setError('No IMDb ID available for this series');
      return;
    }

    setLoading(true);
    setError(null);
    setEpisodes([]);
    setDiscoveryProgress({found: 0, tried: 0});

    try {
      console.log(`[Episodes] Loading Season ${seasonNumber} for ${series.title}`);

      // Use the enhanced service with progress callback
      const episodeData = await omdbApi.discoverSeasonEpisodes(
        series.imdb_id, 
        seasonNumber,
        {
          maxEpisodes: 30,
          maxConsecutiveFailures: 3,
          onProgress: (found, tried) => {
            setDiscoveryProgress({found, tried});
            // Update episodes in real-time as they're discovered
            if (found > episodes.length) {
              // This will be handled by the returned promise, but we could optionally
              // implement streaming updates here if the service supported it
            }
          }
        }
      );

      // Convert to our Episode interface with user tracking
      const episodesWithUserData: Episode[] = episodeData.map(ep => ({
        ...ep,
        userStatus: 'To Watch',
        userRating: undefined,
        userReview: undefined,
        dateWatched: undefined
      }));

      setEpisodes(episodesWithUserData);
      setDiscoveryProgress({found: episodesWithUserData.length, tried: episodesWithUserData.length});

      if (episodesWithUserData.length === 0) {
        setError(`No episodes found for Season ${seasonNumber}. This season might not exist or might not be available in OMDb.`);
      } else {
        console.log(`[Episodes] Successfully loaded ${episodesWithUserData.length} episodes`);
      }
      
    } catch (err) {
      console.error('[Episodes] Error loading episodes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load episodes');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle episode actions
  const handleStatusChange = (episode: Episode, status: Episode['userStatus']) => {
    setEpisodes(prev => prev.map(ep => 
      ep.season === episode.season && ep.episode === episode.episode
        ? { ...ep, userStatus: status, dateWatched: status === 'Watched' ? new Date().toISOString().split('T')[0] : undefined }
        : ep
    ));
  };

  const handleRatingChange = (episode: Episode, rating: number) => {
    setEpisodes(prev => prev.map(ep => 
      ep.season === episode.season && ep.episode === episode.episode
        ? { ...ep, userRating: rating }
        : ep
    ));
  };

  const handleReviewClick = (episode: Episode) => {
    setSelectedEpisode(episode);
    setShowReviewModal(true);
  };

  const handleSaveReview = (reviewText: string) => {
    if (selectedEpisode) {
      setEpisodes(prev => prev.map(ep => 
        ep.season === selectedEpisode.season && ep.episode === selectedEpisode.episode
          ? { ...ep, userReview: reviewText }
          : ep
      ));
    }
    setShowReviewModal(false);
    setSelectedEpisode(null);
  };

  const handleRefresh = () => {
    loadEpisodes(currentSeason);
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
                      Season {seasonNum}
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

          {/* Episodes Grid */}
          {episodes.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {episodes.map((episode) => (
                <div
                  key={`s${episode.season}e${episode.episode}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200"
                >
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

                    {/* User Actions */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      {/* Status Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {(['To Watch', 'Watching', 'Watched', 'Skipped'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(episode, status)}
                            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                              episode.userStatus === status
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
                                  episode.userRating && rating <= episode.userRating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-slate-300 group-hover:text-yellow-400'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        {episode.userRating && (
                          <span className="text-xs text-slate-600">({episode.userRating}/5)</span>
                        )}
                      </div>

                      {/* Review Button */}
                      <button
                        onClick={() => handleReviewClick(episode)}
                        className="w-full px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>
                          {episode.userReview ? 'Edit Review' : 'Add Review'}
                        </span>
                      </button>
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
                <span>Powered by OMDb API • Secure HTTPS • Smart Discovery</span>
              </div>
              {episodes.length > 0 && (
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {episodes.length} episodes loaded
                </span>
              )}
              <span className="text-xs text-slate-500">
                API Usage: {omdbApi.getUsageStats().requestCount}/{omdbApi.getUsageStats().dailyLimit} requests today
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
          title={`Review: ${selectedEpisode.title || `Episode ${selectedEpisode.episode}`}`}
          initialReview={selectedEpisode.userReview || ''}
          onSave={handleSaveReview}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
        />
      )}
    </>
  );
}