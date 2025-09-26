// src/components/EpisodesBrowserPage.tsx
// Enhanced version with complete OMDb data and custom user fields
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
  Info,
  MessageSquare,
  User,
  Users,
  Eye,
  StarIcon
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';
import { ReviewModal } from './ReviewModal';

interface EpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
}

interface Episode {
  // OMDb Data
  season: number;
  episode: number;
  imdbID?: string;
  title?: string;
  plot?: string;
  released?: string; // Air date
  runtime?: string;
  imdbRating?: string;
  poster?: string;
  director?: string;
  writer?: string;
  actors?: string; // Stars
  
  // Custom User Data
  userStatus?: 'To Watch' | 'Watching' | 'Watched' | 'Skipped';
  userRating?: number;
  userReview?: string;
  dateWatched?: string;
  
  // Internal
  loading?: boolean;
  error?: string;
}

export function EpisodesBrowserPage({ series, onBack }: EpisodesBrowserPageProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSeasons, setTotalSeasons] = useState(10);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  // Load episodes for current season
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

    try {
      console.log(`Loading episodes for ${series.title}, Season ${seasonNumber}`);
      
      const foundEpisodes: Episode[] = [];
      
      // Try to load episodes 1-25 (most seasons don't go beyond 25 episodes)
      for (let episodeNum = 1; episodeNum <= 25; episodeNum++) {
        try {
          // Create placeholder episode while loading
          const placeholderEpisode: Episode = {
            season: seasonNumber,
            episode: episodeNum,
            loading: true
          };
          
          if (episodeNum <= 3) { // Show first few as loading
            setEpisodes(prev => [...prev, placeholderEpisode]);
          }

          // Make OMDb API call
          const episodeData = await fetchEpisodeFromOMDb(series.imdb_id, seasonNumber, episodeNum);
          
          if (episodeData) {
            foundEpisodes.push(episodeData);
            
            // Update episodes list in real-time
            setEpisodes(prev => {
              const updated = prev.filter(ep => !(ep.season === seasonNumber && ep.episode === episodeNum && ep.loading));
              return [...updated, episodeData].sort((a, b) => a.episode - b.episode);
            });
          } else {
            // If this episode doesn't exist, stop looking
            if (episodeNum > 1) break;
            if (episodeNum === 1) {
              throw new Error(`Season ${seasonNumber} not found or no episodes available`);
            }
          }
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (episodeError) {
          console.warn(`Episode ${episodeNum} error:`, episodeError);
          if (episodeNum === 1) {
            throw episodeError;
          }
          break;
        }
      }
      
      // Remove any remaining loading placeholders
      setEpisodes(foundEpisodes);
      
      if (foundEpisodes.length === 0) {
        setError(`No episodes found for Season ${seasonNumber}. This season might not exist.`);
      }
      
    } catch (err) {
      console.error('Error loading episodes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load episodes');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual episode data from OMDb
  const fetchEpisodeFromOMDb = async (imdbId: string, season: number, episode: number): Promise<Episode | null> => {
    try {
      const url = `http://www.omdbapi.com/?apikey=${import.meta.env.VITE_OMDB_API_KEY}&i=${imdbId}&Season=${season}&Episode=${episode}&plot=full`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.Response === 'True') {
        return {
          season,
          episode,
          imdbID: data.imdbID,
          title: data.Title,
          plot: data.Plot,
          released: data.Released,
          runtime: data.Runtime,
          imdbRating: data.imdbRating,
          poster: data.Poster !== 'N/A' ? data.Poster : undefined,
          director: data.Director,
          writer: data.Writer,
          actors: data.Actors,
          
          // Initialize custom fields
          userStatus: 'To Watch',
          userRating: undefined,
          userReview: undefined,
          dateWatched: undefined
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching episode:', error);
      return null;
    }
  };

  // Handle episode actions
  const handleStatusChange = (episode: Episode, status: Episode['userStatus']) => {
    setEpisodes(prev => prev.map(ep => 
      ep.season === episode.season && ep.episode === episode.episode
        ? { ...ep, userStatus: status, dateWatched: status === 'Watched' ? new Date().toISOString().split('T')[0] : ep.dateWatched }
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

  const handleAddReview = (episode: Episode) => {
    setSelectedEpisode(episode);
    setShowReviewModal(true);
  };

  const handleSaveReview = (review: string) => {
    if (selectedEpisode) {
      setEpisodes(prev => prev.map(ep => 
        ep.season === selectedEpisode.season && ep.episode === selectedEpisode.episode
          ? { ...ep, userReview: review }
          : ep
      ));
    }
    setShowReviewModal(false);
    setSelectedEpisode(null);
  };

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

  const handleRefresh = () => {
    loadEpisodes(currentSeason);
  };

  const getStatusColor = (status?: Episode['userStatus']) => {
    switch (status) {
      case 'To Watch': return 'bg-blue-100 text-blue-800';
      case 'Watching': return 'bg-yellow-100 text-yellow-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'Skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <>
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
                  Browse episodes • Season {currentSeason} • {episodes.length} episodes
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
              
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-purple-600 disabled:animate-spin transition-colors"
                title="Refresh episodes"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
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
                <p className="text-slate-600">Loading episodes from OMDb...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Fetching detailed episode information
                </p>
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
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
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
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Season {currentSeason} Episodes
                </h2>
                <p className="text-slate-600">
                  {episodes.filter(ep => !ep.loading).length} episodes loaded
                  {loading && " • Loading more..."}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {episodes.map((episode) => (
                  <div
                    key={`${episode.season}-${episode.episode}`}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                  >
                    {/* Episode Loading State */}
                    {episode.loading ? (
                      <div className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-slate-300 rounded mb-3"></div>
                          <div className="h-3 bg-slate-300 rounded mb-2"></div>
                          <div className="h-3 bg-slate-300 rounded w-2/3"></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Episode Poster */}
                        <div className="relative h-48 bg-slate-100">
                          {episode.poster ? (
                            <img
                              src={episode.poster}
                              alt={episode.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Play className="h-12 w-12 text-slate-400" />
                            </div>
                          )}
                          
                          {/* Episode Number Overlay */}
                          <div className="absolute top-3 left-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-medium">
                            S{episode.season}E{episode.episode.toString().padStart(2, '0')}
                          </div>

                          {/* IMDb Rating */}
                          {episode.imdbRating && episode.imdbRating !== 'N/A' && (
                            <div className="absolute top-3 right-3 bg-yellow-500 text-black px-2 py-1 rounded text-sm font-bold">
                              ⭐ {episode.imdbRating}
                            </div>
                          )}
                        </div>

                        <div className="p-6">
                          {/* Episode Title */}
                          <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                            {episode.title || `Episode ${episode.episode}`}
                          </h3>

                          {/* Episode Meta Info */}
                          <div className="flex items-center space-x-4 text-sm text-slate-600 mb-4">
                            {episode.released && episode.released !== 'N/A' && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(episode.released).toLocaleDateString()}</span>
                              </div>
                            )}
                            
                            {episode.runtime && episode.runtime !== 'N/A' && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{episode.runtime}</span>
                              </div>
                            )}
                          </div>

                          {/* Plot Summary */}
                          {episode.plot && episode.plot !== 'N/A' && (
                            <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                              {episode.plot}
                            </p>
                          )}

                          {/* Director & Writer */}
                          {(episode.director || episode.writer) && (
                            <div className="mb-4 space-y-1">
                              {episode.director && episode.director !== 'N/A' && (
                                <div className="flex items-center space-x-2 text-sm text-slate-600">
                                  <User className="h-4 w-4" />
                                  <span><strong>Director:</strong> {episode.director}</span>
                                </div>
                              )}
                              {episode.writer && episode.writer !== 'N/A' && (
                                <div className="flex items-center space-x-2 text-sm text-slate-600">
                                  <User className="h-4 w-4" />
                                  <span><strong>Writer:</strong> {episode.writer}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stars */}
                          {episode.actors && episode.actors !== 'N/A' && (
                            <div className="mb-4">
                              <div className="flex items-start space-x-2 text-sm text-slate-600">
                                <Users className="h-4 w-4 mt-0.5" />
                                <span><strong>Stars:</strong> {episode.actors}</span>
                              </div>
                            </div>
                          )}

                          {/* Status Selector */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                            <select
                              value={episode.userStatus || 'To Watch'}
                              onChange={(e) => handleStatusChange(episode, e.target.value as Episode['userStatus'])}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="To Watch">To Watch</option>
                              <option value="Watching">Watching</option>
                              <option value="Watched">Watched</option>
                              <option value="Skipped">Skipped</option>
                            </select>
                          </div>

                          {/* My Rating */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">My Rating</label>
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  onClick={() => handleRatingChange(episode, rating)}
                                  className={`p-1 rounded transition-colors ${
                                    episode.userRating && episode.userRating >= rating
                                      ? 'text-yellow-500'
                                      : 'text-slate-300 hover:text-yellow-400'
                                  }`}
                                >
                                  <Star className="h-5 w-5 fill-current" />
                                </button>
                              ))}
                              {episode.userRating && (
                                <button
                                  onClick={() => handleRatingChange(episode, 0)}
                                  className="ml-2 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          {/* User Review */}
                          {episode.userReview && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-blue-800">My Review</p>
                                  <p className="text-sm text-blue-700 mt-1">{episode.userReview}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleAddReview(episode)}
                              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>{episode.userReview ? 'Edit Review' : 'Add Review'}</span>
                            </button>

                            {episode.imdbID && (
                              <a
                                href={`https://www.imdb.com/title/${episode.imdbID}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>IMDb</span>
                              </a>
                            )}
                          </div>

                          {/* Watch Status Badge */}
                          <div className="mt-4 flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(episode.userStatus)}`}>
                              {episode.userStatus || 'To Watch'}
                            </span>
                            
                            {episode.dateWatched && (
                              <div className="flex items-center space-x-1 text-xs text-green-600">
                                <Eye className="h-3 w-3" />
                                <span>Watched {new Date(episode.dateWatched).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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
                No episodes found for Season {currentSeason}
              </h3>
              <p className="text-slate-600 mb-6">
                This season might not exist, or detailed episode information might not be available.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setCurrentSeason(1)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Try Season 1</span>
                </button>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry</span>
                </button>
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
                <span>Episode data from OMDb API</span>
              </div>
              {episodes.length > 0 && (
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {episodes.filter(ep => !ep.loading).length} episodes loaded
                </span>
              )}
            </div>
            {series.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${series.imdb_id}/episodes`}
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