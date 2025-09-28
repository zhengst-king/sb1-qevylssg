// src/components/EnhancedEpisodesBrowserPage.tsx
// Episodes page that uses background-fetched data and dynamic season counts
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
  MessageSquare,
  User,
  Users,
  Eye,
  Award,
  Download,
  Zap,
  Globe
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';
import { OMDBEpisodeDetails } from '../lib/omdb';
import { ReviewModal } from './ReviewModal';

interface EnhancedEpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
  onUpdateStatus?: (id: string, status: Movie['status']) => void;
  onUpdateRating?: (id: string, rating: number | null) => void;
  onUpdateMovie?: (id: string, updates: Partial<Movie>) => void;
}

interface Episode extends OMDBEpisodeDetails {
  // User tracking fields (mirror TV page)
  status?: 'To Watch' | 'Watching' | 'Watched' | 'To Watch Again';
  user_rating?: number;
  user_review?: string;
  date_watched?: string;
  date_added?: string;
}

export function EnhancedEpisodesBrowserPage({ 
  series, 
  onBack, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie 
}: EnhancedEpisodesBrowserPageProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSeriesReviewModal, setShowSeriesReviewModal] = useState(false);
  
  // Local state for immediate UI updates
  const [localRating, setLocalRating] = useState<number | null>(series.user_rating || null);
  const [localStatus, setLocalStatus] = useState<Movie['status']>(series.status);
  const [localReview, setLocalReview] = useState<string | null>(series.user_review || null);
  
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

  // Update local state when series prop changes
  useEffect(() => {
    setLocalRating(series.user_rating || null);
    setLocalStatus(series.status);
    setLocalReview(series.user_review || null);
  }, [series.user_rating, series.status, series.user_review]);

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

  // Helper functions for series information display
  const formatDateWatched = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Parse creators for TV series
  const parseCreators = (director: string | null): string[] => {
    if (!director || director === 'N/A') return [];
    return director.split(',').map(name => name.trim()).slice(0, 3);
  };

  // Handle series rating changes
  const handleSeriesRatingChange = async (rating: number | null) => {
    // Update local state immediately for UI responsiveness
    setLocalRating(rating);
    
    if (!onUpdateRating) return;
    
    setIsUpdating(true);
    try {
      await onUpdateRating(series.id!, rating);
    } catch (error) {
      console.error('Error updating series rating:', error);
      // Revert local state on error
      setLocalRating(series.user_rating || null);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle series status changes
  const handleStatusChange = async (newStatus: Movie['status']) => {
    // Update local state immediately for UI responsiveness
    setLocalStatus(newStatus);
    
    if (!onUpdateStatus) return;
    
    setIsUpdating(true);
    try {
      await onUpdateStatus(series.id!, newStatus);
    } catch (error) {
      console.error('Error updating series status:', error);
      // Revert local state on error
      setLocalStatus(series.status);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle series review save - Fixed to match TV card pattern
  const handleSaveSeriesReview = async (review: string) => {
    // Update local state immediately for UI responsiveness
    setLocalReview(review);
    
    if (!onUpdateMovie) return;
    
    setIsUpdating(true);
    try {
      await onUpdateMovie(series.id!, { user_review: review });
    } catch (error) {
      console.error('Error updating series review:', error);
      // Revert local state on error
      setLocalReview(series.user_review || null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        
        {/* Episodes Section Header - Fixed at top */}
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
                  <Play className="h-6 w-6 text-purple-600" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h1 className="text-2xl font-bold text-slate-900">{series.title}</h1>
                      {/* Genre labels moved here to save space */}
                      {series.genre && series.genre !== 'N/A' && (
                        <div className="flex flex-wrap gap-1">
                          {series.genre.split(',').map(genre => {
                            const trimmedGenre = genre.trim();
                            return trimmedGenre && (
                              <span key={trimmedGenre} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                                {trimmedGenre}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <span>Season {currentSeason}</span>
                      {episodes.length > 0 && <span>• {episodes.length} episodes</span>}
                      {/* Enhanced cache status like TV page */}
                      {totalSeasons > 0 && cacheStatus.totalEpisodes > 0 && (
                        <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                          <Download className="h-3 w-3" />
                          <span>{totalSeasons} seasons, {cacheStatus.totalEpisodes} episodes cached</span>
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

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            
            {/* Series Information Header - Now scrollable */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              
              {/* Rating and Metadata Row */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                
                {/* Metascore */}
                {series.metascore && (
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{series.metascore} Metascore</span>
                  </div>
                )}

                {/* Date Watched */}
                {localStatus === 'Watched' && series.date_watched && (
                  <div className="flex items-center space-x-2 text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                    <Eye className="h-4 w-4" />
                    <span>Watched {formatDateWatched(series.date_watched)}</span>
                  </div>
                )}
              </div>

              {/* Additional Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                
                {/* Creators - Enhanced for TV series */}
                {(() => {
                  const creators = parseCreators(series.director);
                  return creators.length > 0 && (
                    <div className="flex items-start space-x-2">
                      <User className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">Creators: </span>
                        <span className="text-slate-600">{creators.join(', ')}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Awards */}
                {series.awards && series.awards !== 'N/A' && (
                  <div className="flex items-start space-x-2">
                    <Award className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <span className="font-medium text-slate-700">Awards: </span>
                      <span className="text-slate-600">{series.awards}</span>
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
                <div className="bg-slate-50 p-4 rounded-lg mb-6">
                  <p className="text-slate-700 leading-relaxed">{series.plot}</p>
                </div>
              )}

              {/* User Actions Section */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left side: My Rating and Review */}
                  <div className="flex items-center space-x-4">
                    {/* User Rating - Matching TV card style */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">My Rating:</span>
                      <select
                        value={localRating || ''}
                        onChange={(e) => handleSeriesRatingChange(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isUpdating}
                        className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">No rating</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                          <option key={rating} value={rating}>
                            {rating}/10 {'★'.repeat(Math.ceil(rating / 2))}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Add Review Button - Matching TV card style */}
                    <button
                      onClick={() => setShowSeriesReviewModal(true)}
                      disabled={isUpdating}
                      className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{localReview ? 'Edit Review' : 'Add Review'}</span>
                    </button>
                  </div>

                  {/* Right side: Status and Website */}
                  <div className="flex items-center space-x-3">
                    {/* Watch Status Dropdown */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-700">Status:</span>
                      <select
                        value={localStatus}
                        onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                        disabled={isUpdating}
                        className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="To Watch">To Watch</option>
                        <option value="Watching">Watching</option>
                        <option value="Watched">Watched</option>
                        <option value="To Watch Again">To Watch Again</option>
                      </select>
                    </div>

                    {/* Official Website */}
                    {series.website && series.website !== 'N/A' && (
                      <a
                        href={series.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Official Site</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* User Review Display - Like TV card */}
                {localReview && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">My Review</p>
                        <p className="text-sm text-blue-700 mt-1">{localReview}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
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

      {/* Episode Review Modal - FIXED INTERFACE */}
      {showReviewModal && selectedEpisode && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
          movieTitle={`${series.title} - S${selectedEpisode.season}E${selectedEpisode.episode}${selectedEpisode.title ? ': ' + selectedEpisode.title : ''}`}
          initialReview={selectedEpisode.user_review || ''}
          onSave={(review: string) => {
            // Update episode with new review data
            setEpisodes(episodes.map(ep => 
              ep.imdbID === selectedEpisode.imdbID 
                ? { ...ep, user_review: review }
                : ep
            ));
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
        />
      )}

      {/* Series Review Modal - FIXED INTERFACE */}
      {showSeriesReviewModal && (
        <ReviewModal
          isOpen={showSeriesReviewModal}
          onClose={() => setShowSeriesReviewModal(false)}
          movieTitle={series.title}
          initialReview={localReview || ''}
          onSave={async (review: string) => {
            await handleSaveSeriesReview(review);
            setShowSeriesReviewModal(false);
          }}
        />
      )}
    </>
  );
}