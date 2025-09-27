// src/components/EnhancedTVSeriesCard.tsx
// Final fixed version with proper button positioning and genre enhancement
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Trash2, 
  Calendar, 
  MapPin, 
  User, 
  Users, 
  Clock, 
  Eye, 
  MessageSquare, 
  Award, 
  Globe, 
  Film, 
  Tv,
  Play,
  ExternalLink,
  Monitor,
  Download
} from 'lucide-react';
import { Movie } from '../lib/supabase';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { ReviewModal } from './ReviewModal';

interface EnhancedTVSeriesCardProps {
  movie: Movie;
  onUpdateStatus: (id: string, status: Movie['status']) => void;
  onUpdateRating: (id: string, rating: number | null) => void;
  onUpdateMovie: (id: string, updates: Partial<Movie>) => void;
  onDelete: (id: string) => void;
  onViewEpisodes: (movie: Movie) => void;
}

export function EnhancedTVSeriesCard({ 
  movie, 
  onUpdateStatus, 
  onUpdateRating, 
  onUpdateMovie, 
  onDelete, 
  onViewEpisodes 
}: EnhancedTVSeriesCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateWatchedError, setDateWatchedError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [episodeStatus, setEpisodeStatus] = useState({
    cached: false,
    totalSeasons: 0,
    totalEpisodes: 0,
    isBeingFetched: false
  });
  const [isLoadingEpisodeStatus, setIsLoadingEpisodeStatus] = useState(false);

  // Check episode cache status with async server-side service
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const checkEpisodeStatus = async () => {
      if (!movie.imdb_id) return;

      setIsLoadingEpisodeStatus(true);

      try {
        // Get series status from server
        const status = await serverSideEpisodeService.getSeriesStatus(movie.imdb_id);
      
        if (!isMounted) return; // Component unmounted

        setEpisodeStatus(status);

        // Add to background fetch queue if not cached
        if (!status.cached && !status.isBeingFetched) {
          await serverSideEpisodeService.addSeriesToQueue(movie.imdb_id, movie.title, 'medium');
        }

      } catch (error) {
        console.error('[EnhancedTVSeriesCard] Error checking episode status:', error);
        if (isMounted) {
          setEpisodeStatus({
            cached: false,
            totalSeasons: 0,
            totalEpisodes: 0,
            isBeingFetched: false
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingEpisodeStatus(false);
        }
      }
    };

    // Initial check
    checkEpisodeStatus();

    // Set up interval to check status updates
    const interval = setInterval(async () => {
      if (!movie.imdb_id || !isMounted) return;

      try {
        const updatedStatus = await serverSideEpisodeService.getSeriesStatus(movie.imdb_id);
        if (isMounted) {
          setEpisodeStatus(updatedStatus);
        }
      } catch (error) {
        console.error('[EnhancedTVSeriesCard] Error updating episode status:', error);
      }
    }, 3000); // Check every 3 seconds

    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [movie.imdb_id, movie.title]);

  // FIXED: Proper status change handler
  const handleStatusChange = async (status: Movie['status']) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(movie.id!, status); // Fixed: pass both id and status
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // FIXED: Proper rating change handler  
  const handleRatingChange = async (rating: number | null) => {
    setIsUpdating(true);
    try {
      await onUpdateRating(movie.id!, rating); // Fixed: pass both id and rating
    } catch (error) {
      console.error('Error updating rating:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDateWatchedChange = async (dateString: string) => {
    if (dateString && !isValidWatchDate(dateString)) {
      setDateWatchedError('Date cannot be in the future');
      return;
    }
    
    setDateWatchedError(null);
    setIsUpdating(true);
    try {
      await onUpdateMovie(movie.id!, { date_watched: dateString || null });
    } catch (err) {
      setDateWatchedError('Failed to update watch date');
      console.error('Failed to update watch date:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to remove "${movie.title}" from your collection?`)) {
      await onDelete(movie.id!);
    }
  };

  const handleSaveReview = async (review: string) => {
    setIsUpdating(true);
    try {
      await onUpdateMovie(movie.id!, { user_review: review });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: Movie['status']) => {
    switch (status) {
      case 'To Watch': return 'bg-blue-100 text-blue-800';
      case 'Watching': return 'bg-yellow-100 text-yellow-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'To Watch Again': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const parseCreators = (director: string | null): string[] => {
    if (!director || director === 'N/A') return [];
    return director.split(',').map(name => name.trim()).slice(0, 3);
  };

  const parseStreamingServices = (plot: string | null): string[] => {
    if (!plot) return [];
    
    const streamingServices = [];
    const plotLower = plot.toLowerCase();
    
    if (plotLower.includes('netflix')) streamingServices.push('Netflix');
    if (plotLower.includes('hbo') || plotLower.includes('max')) streamingServices.push('HBO Max');
    if (plotLower.includes('hulu')) streamingServices.push('Hulu');
    if (plotLower.includes('amazon') || plotLower.includes('prime')) streamingServices.push('Prime Video');
    if (plotLower.includes('disney')) streamingServices.push('Disney+');
    if (plotLower.includes('apple tv')) streamingServices.push('Apple TV+');
    if (plotLower.includes('paramount')) streamingServices.push('Paramount+');
    
    return streamingServices;
  };

  // Enhanced genre parsing with comprehensive sub-genres
  const parseEnhancedGenres = (basicGenres: string | null, plot: string | null, title: string): string[] => {
    const genres = new Set<string>();
    
    // Start with basic OMDb genres
    if (basicGenres && basicGenres !== 'N/A') {
      basicGenres.split(',').forEach(genre => genres.add(genre.trim()));
    }

    // Enhanced genre detection based on plot and title
    const fullText = `${title} ${plot || ''}`.toLowerCase();
    
    // Sci-Fi sub-genres
    if (fullText.includes('dystopian') || fullText.includes('post-apocalyptic')) genres.add('Dystopian Sci-Fi');
    if (fullText.includes('time travel') || fullText.includes('temporal')) genres.add('Time Travel');
    if (fullText.includes('cyberpunk') || fullText.includes('virtual reality')) genres.add('Cyberpunk');
    if (fullText.includes('space') || fullText.includes('alien') || fullText.includes('galaxy')) genres.add('Space Opera');
    
    // Drama sub-genres
    if (fullText.includes('psychological') || fullText.includes('mind') || fullText.includes('mental')) genres.add('Psychological Drama');
    if (fullText.includes('family') || fullText.includes('father') || fullText.includes('mother')) genres.add('Family Drama');
    if (fullText.includes('legal') || fullText.includes('court') || fullText.includes('lawyer')) genres.add('Legal Drama');
    if (fullText.includes('medical') || fullText.includes('hospital') || fullText.includes('doctor')) genres.add('Medical Drama');
    
    // Horror sub-genres
    if (fullText.includes('zombie') || fullText.includes('undead')) genres.add('Zombie Horror');
    if (fullText.includes('supernatural') || fullText.includes('ghost') || fullText.includes('spirit')) genres.add('Supernatural Horror');
    if (fullText.includes('slasher') || fullText.includes('serial killer')) genres.add('Slasher');
    if (fullText.includes('psychological horror') || fullText.includes('disturbing')) genres.add('Psychological Horror');
    
    // Adventure sub-genres
    if (fullText.includes('quest') || fullText.includes('journey') || fullText.includes('expedition')) genres.add('Quest');
    if (fullText.includes('survival') || fullText.includes('stranded') || fullText.includes('wilderness')) genres.add('Survival');
    if (fullText.includes('heist') || fullText.includes('robbery') || fullText.includes('steal')) genres.add('Heist');
    
    // Action sub-genres
    if (fullText.includes('martial arts') || fullText.includes('kung fu') || fullText.includes('fighter')) genres.add('Martial Arts');
    if (fullText.includes('spy') || fullText.includes('agent') || fullText.includes('espionage')) genres.add('Spy Thriller');
    if (fullText.includes('military') || fullText.includes('soldier') || fullText.includes('combat')) genres.add('Military Action');
    
    // Comedy sub-genres
    if (fullText.includes('romantic comedy') || fullText.includes('rom-com')) genres.add('Romantic Comedy');
    if (fullText.includes('dark comedy') || fullText.includes('black comedy')) genres.add('Dark Comedy');
    if (fullText.includes('satire') || fullText.includes('parody')) genres.add('Satirical Comedy');
    
    // Mystery/Crime sub-genres
    if (fullText.includes('detective') || fullText.includes('investigation')) genres.add('Detective Mystery');
    if (fullText.includes('noir') || fullText.includes('dark streets')) genres.add('Film Noir');
    if (fullText.includes('organized crime') || fullText.includes('mafia') || fullText.includes('gang')) genres.add('Crime Saga');
    
    // Western sub-genres
    if (fullText.includes('spaghetti western') || fullText.includes('sergio leone')) genres.add('Spaghetti Western');
    if (fullText.includes('contemporary western') || fullText.includes('modern western')) genres.add('Neo-Western');
    
    return Array.from(genres).slice(0, 8); // Limit to 8 genres for UI
  };

  const getStreamingLink = (service: string): string => {
    const links: { [key: string]: string } = {
      'Netflix': `https://www.netflix.com/search?q=${encodeURIComponent(movie.title)}`,
      'HBO Max': `https://www.hbomax.com/search?q=${encodeURIComponent(movie.title)}`,
      'Hulu': `https://www.hulu.com/search?q=${encodeURIComponent(movie.title)}`,
      'Prime Video': `https://www.amazon.com/s?k=${encodeURIComponent(movie.title)}&i=prime-instant-video`,
      'Disney+': `https://www.disneyplus.com/search/${encodeURIComponent(movie.title)}`,
      'Apple TV+': `https://tv.apple.com/search?term=${encodeURIComponent(movie.title)}`,
      'Paramount+': `https://www.paramountplus.com/search/${encodeURIComponent(movie.title)}`
    };
    return links[service] || '#';
  };

  const creators = parseCreators(movie.director);
  const streamingServices = parseStreamingServices(movie.plot);
  const enhancedGenres = parseEnhancedGenres(movie.genre, movie.plot, movie.title);

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-slate-200">
        <div className="md:flex">
          {/* Poster Section */}
          <div className="md:w-32 md:flex-shrink-0">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-48 md:h-full object-cover"
              />
            ) : (
              <div className="w-full h-48 md:h-full bg-slate-200 flex items-center justify-center">
                <Tv className="h-12 w-12 text-slate-400" />
              </div>
            )}
          </div>
          
          <div className="p-6 flex-1">
            {/* Title Line with Buttons - FIXED: Buttons moved to title line */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900">{movie.title}</h3>
                  <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                    <Tv className="h-3 w-3" />
                    <span>TV Series</span>
                  </div>
                  {movie.imdb_id && (
                    <a
                      href={`https://www.imdb.com/title/${movie.imdb_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-3 py-1 rounded transition-colors duration-200"
                    >
                      IMDb
                    </a>
                  )}
                </div>
              </div>
              
              {/* FIXED: Episodes and Delete buttons on title line, matching Movies page style */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onViewEpisodes(movie)}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                  title={episodeStatus.cached ? `Browse ${episodeStatus.totalEpisodes} episodes` : 'Browse Episodes'}
                >
                  <Play className="h-4 w-4" />
                  <span>Episodes</span>
                  {episodeStatus.cached && (
                    <span className="bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full text-xs">
                      {episodeStatus.totalEpisodes}
                    </span>
                  )}
                </button>

                {/* FIXED: Delete button style matching Movies page exactly */}
                <button
                  onClick={handleDelete}
                  className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                  title="Remove from watchlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Status and Basic Info */}
            <div className="flex items-center space-x-3 mb-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(movie.status)}`}>
                {movie.status}
              </span>
              
              {movie.year && (
                <div className="flex items-center space-x-1 text-sm text-slate-600">
                  <Calendar className="h-3 w-3" />
                  <span>{movie.year}</span>
                </div>
              )}
              
              {movie.imdb_score && (
                <div className="flex items-center space-x-1 text-sm text-slate-600">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span>{movie.imdb_score.toFixed(1)}</span>
                  {movie.imdb_votes && (
                    <span className="text-slate-400">({movie.imdb_votes} votes)</span>
                  )}
                </div>
              )}
              
              {movie.metascore && (
                <div className="flex items-center space-x-1 text-sm text-slate-600">
                  <Award className="h-3 w-3 text-green-500" />
                  <span>{movie.metascore} Metascore</span>
                </div>
              )}

              {movie.status === 'Watched' && movie.date_watched && (
                <div className="flex items-center space-x-1 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                  <Eye className="h-3 w-3" />
                  <span>Watched {formatDateWatched(movie.date_watched)}</span>
                </div>
              )}

              {/* Episode Cache Status Indicator */}
              {episodeStatus.isBeingFetched && (
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  Loading...
                </div>
              )}
            </div>

            {/* Enhanced Genres - FIXED: Now shows comprehensive genres */}
            {enhancedGenres.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {enhancedGenres.map(genre => (
                  <span key={genre} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* IMDb Data Fields */}
            <div className="space-y-2 mb-4 text-sm">
              {/* Creators */}
              {creators.length > 0 && (
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">Creators: </span>
                    <span className="text-slate-600">{creators.join(', ')}</span>
                  </div>
                </div>
              )}

              {/* Stars */}
              {movie.actors && movie.actors !== 'N/A' && (
                <div className="flex items-start space-x-2">
                  <Users className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">Stars: </span>
                    <span className="text-slate-600">{movie.actors}</span>
                  </div>
                </div>
              )}

              {/* Country/Locations */}
              {movie.country && movie.country !== 'N/A' && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">Country: </span>
                    <span className="text-slate-600">{movie.country}</span>
                  </div>
                </div>
              )}

              {/* Runtime */}
              {movie.runtime && (
                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">Runtime: </span>
                    <span className="text-slate-600">{movie.runtime} minutes</span>
                  </div>
                </div>
              )}

              {/* Awards */}
              {movie.awards && movie.awards !== 'N/A' && (
                <div className="flex items-start space-x-2">
                  <Award className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">Awards: </span>
                    <span className="text-slate-600">{movie.awards}</span>
                  </div>
                </div>
              )}

              {/* Streaming Services with Icon and Link */}
              {streamingServices.length > 0 && (
                <div className="flex items-start space-x-2">
                  <Monitor className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">Streaming: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {streamingServices.map(service => (
                        <a
                          key={service}
                          href={getStreamingLink(service)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{service}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Episode Cache Status */}
              {episodeStatus.cached && (
                <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                  <Download className="h-3 w-3" />
                  <span>{episodeStatus.totalSeasons} seasons, {episodeStatus.totalEpisodes} episodes cached</span>
                </div>
              )}
            </div>

            {/* Plot */}
            {movie.plot && (
              <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                {movie.plot}
              </p>
            )}

            {/* User Review */}
            {movie.user_review && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">My Review</p>
                    <p className="text-sm text-blue-700 mt-1">{movie.user_review}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Selection and Ratings Row - FIXED: Exact Movies Page Style */}
            <div className="flex items-center space-x-4 mb-4 flex-wrap">
              {/* Status Selection - Using dropdown like Movies page */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Status:</span>
                <select
                  value={movie.status}
                  onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                  disabled={isUpdating}
                  className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="To Watch">To Watch</option>
                  <option value="Watching">Watching</option>
                  <option value="Watched">Watched</option>
                  <option value="To Watch Again">To Watch Again</option>
                </select>
              </div>

              {/* Rating Dropdown - Exact Movies Page Style */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">My Rating:</span>
                <select
                  value={movie.user_rating || ''}
                  onChange={(e) => handleRatingChange(e.target.value ? parseInt(e.target.value) : null)}
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
                {movie.rating_updated_at && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span 
                      className="text-xs text-slate-500 cursor-help"
                      title={`Rating updated: ${formatExactTimestamp(movie.rating_updated_at)}`}
                    >
                      {formatRelativeTime(movie.rating_updated_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Official Website Link - Movies page style */}
              {movie.website && (
                <a
                  href={movie.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1 rounded transition-colors duration-200 inline-flex items-center space-x-1"
                >
                  <Globe className="h-3 w-3" />
                  <span>Official Site</span>
                </a>
              )}

              {movie.last_modified_at && (
                <div className="flex items-center space-x-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span 
                    className="cursor-help"
                    title={`Last modified: ${formatExactTimestamp(movie.last_modified_at)}`}
                  >
                    Updated {formatRelativeTime(movie.last_modified_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Conditional Date Watched Field */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              (movie.status === 'Watched' || movie.status === 'To Watch Again') ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {(movie.status === 'Watched' || movie.status === 'To Watch Again') && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-green-600" />
                    <label className="text-sm font-medium text-slate-700">Date Watched:</label>
                    <input
                      type="date"
                      value={movie.date_watched || ''}
                      onChange={(e) => handleDateWatchedChange(e.target.value)}
                      max={getTodayDateString()}
                      disabled={isUpdating}
                      className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                  {dateWatchedError && (
                    <p className="text-red-600 text-xs mt-1">{dateWatchedError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons - Just Review button now */}
            <div className="flex items-center space-x-3 mb-4">
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={isUpdating}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{movie.user_review ? 'Edit Review' : 'Add Review'}</span>
              </button>
            </div>

            {/* Metadata Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                {movie.created_at && (
                  <span title={formatExactTimestamp(movie.created_at)}>
                    Added {formatRelativeTime(movie.created_at)}
                  </span>
                )}
                {movie.updated_at && movie.updated_at !== movie.created_at && (
                  <span title={formatExactTimestamp(movie.updated_at)}>
                    Updated {formatRelativeTime(movie.updated_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {movie.media_type && (
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {movie.media_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          movieTitle={movie.title}
          initialReview={movie.user_review || ''}
          onSave={handleSaveReview}
        />
      )}
    </>
  );
}