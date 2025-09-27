// src/components/EnhancedEpisodesBrowserPage.tsx
// Episodes page that uses background-fetched data and dynamic season counts
// STEP 1: Added comprehensive series information header
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
  Film,
  Download,
  Zap,
  Globe,
  ThumbsUp
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';
import { OMDBEpisodeDetails } from '../lib/omdb';
import { ReviewModal } from './ReviewModal';

interface EnhancedEpisodesBrowserPageProps {
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

export function EnhancedEpisodesBrowserPage({ series, onBack }: EnhancedEpisodesBrowserPageProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  
  // Dynamic season management
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [totalSeasons, setTotalSeasons] = useState(0);
  const [cacheStatus, setCacheStatus] = useState({
    cached: false,
    totalEpisodes: 0,
    isBeingFetched: false,
    lastUpdated: null as Date | null
  });
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    isProcessing: false,
    currentlyProcessing: null
  });

  // Load episodes for current season from background cache
  useEffect(() => {
    loadEpisodesFromCache(currentSeason);
  }, [currentSeason, series.imdb_id]);

  // Load queue status
  useEffect(() => {
    const loadQueueStatus = async () => {
      try {
        const status = await serverSideEpisodeService.getQueueStatus();
        setQueueStatus(status);
      } catch (error) {
        console.error('[Episodes] Error loading queue status:', error);
      }
    };
  
    loadQueueStatus();
  }, []);

  // Monitor cache status and update available seasons with async service
  useEffect(() => {
    if (!series.imdb_id) return;
  
    let isMounted = true; // Prevent state updates if component unmounts

    const updateStatus = async () => {
      try {
        const status = await serverSideEpisodeService.getSeriesStatus(series.imdb_id!);
      
        if (!isMounted) return; // Component unmounted
      
        setCacheStatus(status);
        setTotalSeasons(status.totalSeasons);
      
        // Update available seasons based on cached data
        const seasons = [];
        for (let i = 1; i <= Math.max(status.totalSeasons, 1); i++) {
          seasons.push(i);
        }
        setAvailableSeasons(seasons);
      
        // If current season is beyond available seasons, reset to season 1
        if (currentSeason > status.totalSeasons && status.totalSeasons > 0) {
          setCurrentSeason(1);
        }
      } catch (error) {
        console.error('[Episodes] Error updating cache status:', error);
      }
    };

    // Initial update
    updateStatus();

    // Set up interval to monitor changes
    const interval = setInterval(() => {
      if (isMounted) {
        updateStatus();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [series.imdb_id, currentSeason]);

  const loadEpisodesFromCache = async (seasonNumber: number) => {
    if (!series.imdb_id) {
      setError('No IMDb ID available for this series');
      return;
    }

    setLoading(true);
    setError(null);

    console.log(`[Episodes] Loading Season ${seasonNumber} from cache for ${series.title}`);

    try {
      // Try to get episodes from server-side cache
      const cachedEpisodes = await serverSideEpisodeService.getSeasonEpisodes(series.imdb_id, seasonNumber);
    
      if (cachedEpisodes) {
        // Convert to our Episode interface with default user tracking
        const episodesWithUserData: Episode[] = cachedEpisodes.map(ep => ({
          ...ep,
          status: 'To Watch',
          user_rating: undefined,
          user_review: undefined,
          date_watched: undefined,
          date_added: new Date().toISOString().split('T')[0]
        }));

        setEpisodes(episodesWithUserData);
        setLoading(false);
        console.log(`[Episodes] ✓ Loaded ${episodesWithUserData.length} episodes from cache`);
      } else {
        // FIX: NO CACHED DATA - AUTOMATICALLY TRIGGER DISCOVERY
        console.log(`[Episodes] 🔍 No cache found for ${series.title} Season ${seasonNumber} - triggering discovery`);
  
        setEpisodes([]);
  
        try {
          // Import and use integrationService to queue for discovery
          const { integrationService } = await import('../services/integrationService');
          const queueResult = await integrationService.queueSeriesDiscovery(
            series.imdb_id,
            series.title,
            'high' // High priority for user-requested episodes
          );
    
          console.log('[Episodes] 📥 Queued for discovery:', queueResult);
    
          if (queueResult.success) {
            setError(`🔄 Episodes are being discovered in the background. This may take 30-60 seconds.`);
          } else {
            setError(`Failed to queue series for discovery: ${queueResult.error}`);
          }
        } catch (importError) {
          console.error('[Episodes] Error importing integration service:', importError);
          setError('Failed to initialize episode discovery. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('[Episodes] Error loading episodes:', error);
      setError('Failed to load episodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!series.imdb_id) return;
    
    try {
      console.log('[Episodes] Manual refresh triggered');
      await loadEpisodesFromCache(currentSeason);
    } catch (error) {
      console.error('[Episodes] Manual refresh failed:', error);
      setError('Refresh failed. Please try again.');
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
    return `https://www.imdb.com/title/${series.imdb_id}/episodes?season=${episode.season}`;
  };

  // NEW: Helper functions for series information display
  const getSeriesStatusColor = (status: Movie['status']) => {
    switch (status) {
      case 'To Watch': return 'bg-blue-100 text-blue-800';
      case 'Watching': return 'bg-yellow-100 text-yellow-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'To Watch Again': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateWatched = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 >= 1;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 text-yellow-500 fill-current opacity-50" />);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
    }

    return stars;
  };

  // NEW: Handle watch status changes (mockup for now)
  const handleStatusChange = (newStatus: Movie['status']) => {
    // TODO: Implement status update logic
    console.log('Status change to:', newStatus);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        
        {/* NEW: Enhanced Series Information Header */}
        <div className="bg-white border-b border-slate-200 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-6 py-6">
            
            {/* Back Button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={onBack}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to TV</span>
              </button>
            </div>

            {/* Series Header Information */}
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Series Poster */}
              <div className="flex-shrink-0">
                {series.poster_url ? (
                  <img
                    src={series.poster_url}
                    alt={series.title}
                    className="w-48 h-72 object-cover rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-72 bg-slate-200 rounded-lg shadow-lg flex items-center justify-center">
                    <Tv className="h-16 w-16 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Series Information */}
              <div className="flex-1 space-y-4">
                
                {/* Title and TV Series Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{series.title}</h1>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        <Tv className="h-4 w-4" />
                        <span>TV Series</span>
                      </div>
                      
                      {/* Year */}
                      {series.year && (
                        <div className="flex items-center space-x-1 text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{series.year}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watch Status Dropdown */}
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${getSeriesStatusColor(series.status)}`}>
                      {series.status}
                    </span>
                    
                    {/* Status Change Dropdown */}
                    <select
                      value={series.status}
                      onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                      className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="To Watch">To Watch</option>
                      <option value="Watching">Watching</option>
                      <option value="Watched">Watched</option>
                      <option value="To Watch Again">To Watch Again</option>
                    </select>
                  </div>
                </div>

                {/* Rating and Metadata Row */}
                <div className="flex flex-wrap items-center gap-6">
                  
                  {/* IMDb Rating with Stars */}
                  {series.imdb_score && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {renderStars(series.imdb_score)}
                      </div>
                      <span className="font-bold text-lg">{series.imdb_score.toFixed(1)}</span>
                      {series.imdb_votes && (
                        <span className="text-slate-500 text-sm">({series.imdb_votes} votes)</span>
                      )}
                    </div>
                  )}

                  {/* Metascore */}
                  {series.metascore && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-green-500" />
                      <span className="font-medium">{series.metascore} Metascore</span>
                    </div>
                  )}

                  {/* Runtime */}
                  {series.runtime && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-slate-500" />
                      <span>{series.runtime} min</span>
                    </div>
                  )}

                  {/* Date Watched */}
                  {series.status === 'Watched' && series.date_watched && (
                    <div className="flex items-center space-x-2 text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                      <Eye className="h-4 w-4" />
                      <span>Watched {formatDateWatched(series.date_watched)}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {series.genre && series.genre !== 'N/A' && (
                  <div className="flex flex-wrap gap-2">
                    {series.genre.split(', ').map(genre => (
                      <span key={genre} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                        {genre.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Additional Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  
                  {/* Creators */}
                  {series.director && series.director !== 'N/A' && (
                    <div className="flex items-start space-x-2">
                      <User className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">Creators: </span>
                        <span className="text-slate-600">{series.director}</span>
                      </div>
                    </div>
                  )}

                  {/* Stars */}
                  {series.actors && series.actors !== 'N/A' && (
                    <div className="flex items-start space-x-2">
                      <Users className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">Stars: </span>
                        <span className="text-slate-600">{series.actors}</span>
                      </div>
                    </div>
                  )}

                  {/* Country */}
                  {series.country && series.country !== 'N/A' && (
                    <div className="flex items-start space-x-2">
                      <Globe className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">Country: </span>
                        <span className="text-slate-600">{series.country}</span>
                      </div>
                    </div>
                  )}

                  {/* Language */}
                  {series.language && series.language !== 'N/A' && (
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">Language: </span>
                        <span className="text-slate-600">{series.language}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Plot */}
                {series.plot && series.plot !== 'N/A' && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-700 leading-relaxed">{series.plot}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  
                  {/* IMDb Link */}
                  {series.imdb_id && (
                    <a
                      href={`https://www.imdb.com/title/${series.imdb_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View on IMDb</span>
                    </a>
                  )}

                  {/* Official Website */}
                  {series.website && series.website !== 'N/A' && (
                    <a
                      href={series.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Official Site</span>
                    </a>
                  )}

                  {/* User Rating */}
                  {series.user_rating && (
                    <div className="flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="font-medium">Your Rating: {series.user_rating}/10</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Episodes Section Header */}
        <div className="bg-white border-b border-slate-200 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <Play className="h-6 w-6 text-purple-600" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Episodes</h2>
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <span>Season {currentSeason}</span>
                      {episodes.length > 0 && <span>• {episodes.length} episodes</span>}
                      {cacheStatus.cached && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Download className="h-3 w-3" />
                          <span>cached</span>
                        </div>
                      )}
                      {cacheStatus.isBeingFetched && (
                        <div className="flex items-center space-x-1 text-purple-600 animate-pulse">
                          <Zap className="h-3 w-3" />
                          <span>updating</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Season Selector */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousSeason}
                  disabled={currentSeason <= 1 || loading}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <select
                  value={currentSeason}
                  onChange={(e) => handleSeasonSelect(parseInt(e.target.value))}
                  disabled={loading}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
                >
                  {availableSeasons.map(season => (
                    <option key={season} value={season}>
                      Season {season}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNextSeason}
                  disabled={currentSeason >= totalSeasons || loading}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="ml-3 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Refresh episodes"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Episodes Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="text-lg text-slate-600">Loading episodes...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-red-800 font-medium mb-1">Error Loading Episodes</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Episodes Grid */}
            {!loading && !error && episodes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {episodes.map((episode, index) => (
                  <div
                    key={episode.imdbID || `episode-${episode.season}-${episode.episode}`}
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

                      {/* Episode Plot */}
                      {episode.plot && episode.plot !== 'N/A' && (
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-4">
                          {episode.plot}
                        </p>
                      )}

                      {/* Episode Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center space-x-3">
                          {episode.released && (
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <Calendar className="h-3 w-3" />
                              <span>{episode.released}</span>
                            </div>
                          )}
                          
                          {episode.runtime && (
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              <span>{episode.runtime}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <a
                            href={getEpisodeIMDbUrl(episode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-3 py-1 rounded transition-colors"
                          >
                            IMDb
                          </a>
                          
                          <button
                            onClick={() => {
                              setSelectedEpisode(episode);
                              setShowReviewModal(true);
                            }}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium px-3 py-1 rounded transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && episodes.length === 0 && (
              <div className="text-center py-12">
                <Tv className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Episodes Found</h3>
                <p className="text-slate-600 mb-6">
                  Season {currentSeason} episodes haven't been loaded yet.
                </p>
                <button
                  onClick={handleManualRefresh}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Loading Episodes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedEpisode && (
        <ReviewModal
          movie={{
            id: selectedEpisode.imdbID || `episode-${selectedEpisode.season}-${selectedEpisode.episode}`,
            title: selectedEpisode.title || `Season ${selectedEpisode.season}, Episode ${selectedEpisode.episode}`,
            user_review: selectedEpisode.user_review,
            user_rating: selectedEpisode.user_rating
          } as any}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
          onUpdate={(updatedMovie) => {
            // Update episode with new review data
            setEpisodes(episodes.map(ep => 
              ep.imdbID === selectedEpisode.imdbID 
                ? { ...ep, user_review: updatedMovie.user_review, user_rating: updatedMovie.user_rating }
                : ep
            ));
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
        />
      )}
    </>
  );
}