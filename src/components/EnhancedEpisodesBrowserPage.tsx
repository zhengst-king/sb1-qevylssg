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
  Globe,
  Plus,
  Minus,
  X,
  Package,
  Check
} from 'lucide-react';
import { Movie, supabase } from '../lib/supabase';
import { serverSideEpisodeService } from '../services/serverSideEpisodeService';
import { OMDBEpisodeDetails } from '../lib/omdb';
import { ReviewModal } from './ReviewModal';
import { formatRelativeTime, formatExactTimestamp, formatDateWatched, getTodayDateString, isValidWatchDate } from '../utils/dateUtils';
import { TMDBTVDetailsSection } from './TMDBTVDetailsSection';
import { tmdbService } from '../lib/tmdb';
import { TMDBAPITester } from './TMDBAPITester';
import { episodeTrackingService } from '../services/episodeTrackingService';
import { EpisodeTrackingGrid } from './EpisodeTrackingGrid';
import { SeriesCastDisplay } from './SeriesCastDisplay';
import { SeriesRecommendations } from './SeriesRecommendations';
import WatchProvidersDisplay from './WatchProvidersDisplay';
import { TMDBTVSeriesDetails } from '../lib/tmdb';
import { PersonDetailsModal } from './PersonDetailsModal';
import { useCustomCollections } from '../hooks/useCustomCollections';
import { customCollectionsService } from '../services/customCollectionsService';
import type { CustomCollection } from '../types/customCollections';
import { CustomCollectionDetailModal } from './CustomCollectionDetailModal';
import { TagSelectorModal } from './TagSelectorModal';
import { useTags, useContentTags } from '../hooks/useTags';
import { getCategoryById } from '../data/taggingCategories';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { AssignedTagDetailModal } from './AssignedTagDetailModal';
import { contentTagsService } from '../services/contentTagsService';

interface EnhancedEpisodesBrowserPageProps {
  series: Movie;
  onBack: () => void;
  onUpdateStatus?: (id: string, status: Movie['status']) => void;
  onUpdateRating?: (id: string, rating: number | null) => void;
  onUpdateMovie?: (id: string, updates: Partial<Movie>) => void;
  onViewRecommendation?: (series: Movie) => void;
  onSeriesAddedToWatchlist?: () => void;
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
  onUpdateMovie,
  onViewRecommendation,
  onSeriesAddedToWatchlist
}: EnhancedEpisodesBrowserPageProps) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSeriesReviewModal, setShowSeriesReviewModal] = useState(false);
  const [dateWatchedError, setDateWatchedError] = useState<string | null>(null);
  const [isPlotExpanded, setIsPlotExpanded] = useState(false); 
  const [tmdbData, setTmdbData] = useState<TMDBTVSeriesDetails | null>(null);
  
  // Local state for immediate UI updates
  const [localRating, setLocalRating] = useState<number | null>(series.user_rating || null);
  const [localStatus, setLocalStatus] = useState<Movie['status']>(series.status);
  const [localReview, setLocalReview] = useState<string | null>(series.user_review || null);
  const [localDateWatched, setLocalDateWatched] = useState<string | null>(series.date_watched || null);

  const [showPersonDetailsModal, setShowPersonDetailsModal] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string>('');
  const [selectedPersonType, setSelectedPersonType] = useState<'cast' | 'crew'>('cast');

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

  const [debugTmdbData, setDebugTmdbData] = useState<any>(null);

  // Custom Collections state
  const { collections: customCollections } = useCustomCollections();
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollections, setAddingToCollections] = useState(false);
  const [seriesCollections, setSeriesCollections] = useState<CustomCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionToView, setSelectedCollectionToView] = useState<CustomCollection | null>(null);

  // Tagging state
  const [showTagSelector, setShowTagSelector] = useState(false);
  const { subcategories } = useTagSubcategories();
  const { contentTags, refetch: refetchContentTags } = useContentTags(
    series.id ? parseInt(series.id) : null,
    'tv'
  );

  const [selectedEpisodeForTag, setSelectedEpisodeForTag] = useState<Episode | null>(null);
  const [selectedEpisodeAssignedTag, setSelectedEpisodeAssignedTag] = useState<{
    tag: any;
    metadata: {
      content_tag_id: string;
      start_time?: string | null;
      end_time?: string | null;
      notes?: string | null;
    };
    episode: { season: number; episode: number };
  } | null>(null);

  const [selectedAssignedTag, setSelectedAssignedTag] = useState<{
    tag: any;
    metadata: {
      content_tag_id: string;
      start_time?: string | null;
      end_time?: string | null;
      notes?: string | null;
    }
  } | null>(null);
  
  // Add this handler function after your state declarations
  const handleRecommendationClick = (clickedSeries: Movie) => {
    if (onViewRecommendation) {
      onViewRecommendation(clickedSeries);
    }
  };

  // Add handler function
  const handleOpenPersonDetails = (tmdbPersonId: number, personName: string, personType: 'cast' | 'crew') => {
    setSelectedPersonId(tmdbPersonId);
    setSelectedPersonName(personName);
    setSelectedPersonType(personType);
    setShowPersonDetailsModal(true);
  };

  const handleOpenSeriesDetails = (series: Movie) => {
    console.log('[EnhancedEpisodesBrowserPage] Series clicked from PersonDetailsModal:', series.title);
    // Close person modal and update the current series being viewed
    setShowPersonDetailsModal(false);
    setSelectedPersonId(null);
    if (onViewRecommendation) {
      onViewRecommendation(series);
    }
  };

  // ✅ ADD THIS: Handler for opening assigned tag details
  const handleOpenAssignedTagDetails = async (tag: any) => {
    console.log('[handleOpenAssignedTagDetails] Clicked tag:', tag);
    console.log('[handleOpenAssignedTagDetails] Has content_tag_id?', tag.content_tag_id);
    
    try {
      if (!series.id) {
        console.log('[handleOpenAssignedTagDetails] No series.id');
        alert('Error: No series ID found');
        return;
      }
      
      if (!tag.content_tag_id) {
        console.log('[handleOpenAssignedTagDetails] No content_tag_id, tag object:', tag);
        alert('Error: No content tag ID found');
        return;
      }
    
      console.log('[handleOpenAssignedTagDetails] Setting selectedAssignedTag with metadata:', {
        content_tag_id: tag.content_tag_id,
        start_time: tag.start_time,
        end_time: tag.end_time,
        notes: tag.notes,
      });
      
      setSelectedAssignedTag({
        tag: tag,
        metadata: {
          content_tag_id: tag.content_tag_id,
          start_time: tag.start_time,
          end_time: tag.end_time,
          notes: tag.notes,
        }
      });
    } catch (error) {
      console.error('[handleOpenAssignedTagDetails] Error loading assigned tag:', error);
      alert('Error opening tag details. Check console for details.');
    }
  };

  // ✅ ADD THIS: Handler for removing a tag
  const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail modal
    
    if (!series.id) return;
    
    if (!window.confirm('Remove this tag from the series?')) return;
    
    try {
      await contentTagsService.removeTagFromContent(tagId, parseInt(series.id), 'tv');
      await refetchContentTags();
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag. Please try again.');
    }
  };

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTagSelector) {
          setShowTagSelector(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showTagSelector]);
  
  // Update local state when series prop changes
  useEffect(() => {
    setLocalRating(series.user_rating || null);
    setLocalStatus(series.status);
    setLocalReview(series.user_review || null);
    setLocalDateWatched(series.date_watched || null);
  }, [series.user_rating, series.status, series.user_review, series.date_watched]);

  // Sync IMDb rating to TMDB cache for smart TTL calculation
  useEffect(() => {
    if (series.imdb_id && series.imdb_score) {
      tmdbService.updateCacheRating(series.imdb_id, series.imdb_score);
    }
  }, [series.imdb_id, series.imdb_score]);

  useEffect(() => {
    const fetchTMDBData = async () => {
      if (!series.imdb_id) return;

      try {
        console.log('[Episodes] Fetching TMDB data for:', series.imdb_id);
        const data = await tmdbService.getTVSeriesByImdbId(series.imdb_id);
      
        if (data) {
          console.log('[Episodes] TMDB data received:', {
            cast: data.credits?.cast?.length || 0,
            recommendations: data.recommendations?.results?.length || 0,
            similar: data.similar?.results?.length || 0,
            watchProviders: data['watch/providers'] ? 'Available' : 'Not available'
          });
          setTmdbData(data);
        }
      } catch (error) {
        console.error('[Episodes] Error fetching TMDB data:', error);
      }
    };

    fetchTMDBData();
  }, [series.imdb_id]);

  // Fetch collections that contain this series
  useEffect(() => {
    const fetchSeriesCollections = async () => {
      if (!series.id) return;
      
      setLoadingCollections(true);
      try {
        const collections = await customCollectionsService.getCollectionsForItem(series.id);
        setSeriesCollections(collections);
      } catch (error) {
        console.error('Error fetching series collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchSeriesCollections();
  }, [series.id]);
  
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

  // Monitor cache status and update available seasons
  useEffect(() => {
    if (!series.imdb_id) return;
  
    let isMounted = true;

    const updateStatus = async () => {
      try {
        const status = await serverSideEpisodeService.getSeriesStatus(series.imdb_id!);
        
        if (!isMounted) return;

        if (status) {
          setCacheStatus(status);
          setTotalSeasons(status.totalSeasons || 0);
          setAvailableSeasons(status.availableSeasons || []);
        }
      } catch (error) {
        console.error('[Episodes] Error checking series status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [series.imdb_id]);

  // SIMPLE DEBUG TEST - Add this to your existing debug useEffect

  useEffect(() => {
    // Debug: Test TMDB data fetching
    const testTmdbFetch = async () => {
      if (!series.imdb_id) return;
      
      console.log('[DEBUG] Testing TMDB fetch for:', series.imdb_id);
      
      try {
        // Clear cache first to ensure fresh fetch
        await tmdbService.clearCacheForSeries(series.imdb_id);
        
        // TEST: Direct API call to verify data
        const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
        const directUrl = `https://api.themoviedb.org/3/find/${series.imdb_id}?api_key=${API_KEY}&external_source=imdb_id`;
        console.log('[DEBUG] Finding TMDB ID for:', series.imdb_id);
        
        const findResponse = await fetch(directUrl);
        const findData = await findResponse.json();
        console.log('[DEBUG] Find response:', findData);
        
        if (findData.tv_results && findData.tv_results[0]) {
          const tmdbId = findData.tv_results[0].id;
          console.log('[DEBUG] Found TMDB ID:', tmdbId);
          
          // Test watch providers directly
          const watchUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers?api_key=${API_KEY}`;
          console.log('[DEBUG] Testing watch providers URL');
          
          const watchResponse = await fetch(watchUrl);
          const watchData = await watchResponse.json();
          console.log('[DEBUG] Watch providers response:', watchData);
          
          // Also test our service
          const tmdbData = await tmdbService.getTVSeriesByImdbId(series.imdb_id);
          console.log('[DEBUG] Service response:', tmdbData);
          console.log('[DEBUG] Service watch providers:', tmdbData?.watch_providers);

          // TEST WITH BREAKING BAD (known to have streaming data)
          const BREAKING_BAD_IMDB = 'tt0903747';
          const testUrl = `https://api.themoviedb.org/3/find/${BREAKING_BAD_IMDB}?api_key=${API_KEY}&external_source=imdb_id`;
          console.log('[DEBUG] Testing with Breaking Bad');
        
          const testResponse = await fetch(testUrl);
          const testData = await testResponse.json();
        
          if (testData.tv_results && testData.tv_results[0]) {
            const testTmdbId = testData.tv_results[0].id;
            console.log('[DEBUG] Breaking Bad TMDB ID:', testTmdbId);
          
            const testWatchUrl = `https://api.themoviedb.org/3/tv/${testTmdbId}/watch/providers?api_key=${API_KEY}`;
            const testWatchResponse = await fetch(testWatchUrl);
            const testWatchData = await testWatchResponse.json();
          
            console.log('[DEBUG] Breaking Bad watch providers:', testWatchData);
            console.log('[DEBUG] Available regions:', Object.keys(testWatchData.results || {}));
          }
          
          setDebugTmdbData({
            tmdbId,
            directWatchData: watchData,
            serviceData: tmdbData,
            serviceWatchProviders: tmdbData?.watch_providers
          });
        }
        
      } catch (error) {
        console.error('[DEBUG] TMDB fetch error:', error);
      }
    };

    testTmdbFetch();
  }, [series.imdb_id]);

  const loadEpisodesFromCache = async (seasonNumber: number) => {
    if (!series.imdb_id) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`[Episodes] Loading Season ${seasonNumber} for ${series.imdb_id}`);
      
      // Load episode data from cache
      const cachedEpisodes = await serverSideEpisodeService.getSeasonEpisodes(series.imdb_id, seasonNumber);
      
      if (!cachedEpisodes || cachedEpisodes.length === 0) {
        setError(`Season ${seasonNumber} episodes haven't been cached yet. They will be discovered in the background.`);
        setEpisodes([]);
        return;
      }

      // Load user tracking data for this season
      const trackingMap = await episodeTrackingService.getSeasonTracking(series.imdb_id, seasonNumber);
      
      // Merge episode data with user tracking data
      const episodesWithTracking: Episode[] = cachedEpisodes.map(ep => {
        const tracking = trackingMap.get(ep.episode);
        return {
          ...ep,
          status: tracking?.status || 'To Watch',
          user_rating: tracking?.user_rating || undefined,
          user_review: tracking?.user_review || undefined,
          date_watched: tracking?.date_watched || undefined,
          date_added: tracking?.date_added || undefined
        };
      });

      setEpisodes(episodesWithTracking);
      console.log(`[Episodes] Loaded ${episodesWithTracking.length} episodes for Season ${seasonNumber}`);
      
    } catch (err) {
      console.error('[Episodes] Error loading episodes:', err);
      setError('Failed to load episodes. Please try again.');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!series.imdb_id) return;
    
    try {
      console.log('[Episodes] Manual refresh triggered');
      
      // Try loading from cache first
      await loadEpisodesFromCache(currentSeason);
    
      // If still no episodes after loading, queue discovery
      if (episodes.length === 0) {
        console.log('[Episodes] No episodes in cache, queueing discovery...');
      
        await serverSideEpisodeService.addSeriesToQueue(
          series.imdb_id,
          series.title,
          'high'
        );
      
        setError('Discovery job queued! Episodes will be cached in the background. Check back in a few minutes or refresh to see progress.');
      }
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
      case 'Paused': return 'bg-orange-100 text-orange-800';
      case 'Watched': return 'bg-green-100 text-green-800';
      case 'To Watch Again': return 'bg-purple-100 text-purple-800';
      case 'Upcoming': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEpisodeIMDbUrl = (episode: Episode): string => {
    if (episode.imdbID) {
      return `https://www.imdb.com/title/${episode.imdbID}/`;
    }
    return `https://www.imdb.com/title/${series.imdb_id}/episodes?season=${episode.season}`;
  };

  // Parse creators for TV series
  const parseCreators = (director: string | null): string[] => {
    if (!director || director === 'N/A') return [];
    return director.split(',').map(name => name.trim()).slice(0, 3);
  };

  // Handle series rating changes
  const handleSeriesRatingChange = async (rating: number | null) => {
    setLocalRating(rating);
    
    if (!onUpdateRating) return;
    
    setIsUpdating(true);
    try {
      await onUpdateRating(series.id!, rating);
    } catch (error) {
      console.error('Error updating series rating:', error);
      setLocalRating(series.user_rating || null);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle series status changes
  const handleStatusChange = async (newStatus: Movie['status']) => {
    setLocalStatus(newStatus);
    
    if (!onUpdateStatus) return;
    
    setIsUpdating(true);
    try {
      await onUpdateStatus(series.id!, newStatus);
    } catch (error) {
      console.error('Error updating series status:', error);
      setLocalStatus(series.status);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle series review save
  const handleSaveSeriesReview = async (review: string) => {
    setLocalReview(review);
    
    if (!onUpdateMovie) return;
    
    setIsUpdating(true);
    try {
      await onUpdateMovie(series.id!, { user_review: review });
    } catch (error) {
      console.error('Error updating series review:', error);
      setLocalReview(series.user_review || null);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle date watched changes
  const handleDateWatchedChange = async (dateString: string) => {
    if (dateString && !isValidWatchDate(dateString)) {
      setDateWatchedError('Date cannot be in the future');
      return;
    }
  
    setDateWatchedError(null);
    setLocalDateWatched(dateString || null);
  
    if (!onUpdateMovie) return;
  
    setIsUpdating(true);
    try {
      await onUpdateMovie(series.id!, { date_watched: dateString || null });
    } catch (err) {
      setDateWatchedError('Failed to update watch date');
      console.error('Failed to update watch date:', err);
      setLocalDateWatched(series.date_watched || null);
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ ADD: Episode tag handlers
  const handleOpenEpisodeTagSelector = (episode: Episode) => {
    setSelectedEpisodeForTag(episode);
    setShowTagSelector(true);
  };

  const handleOpenEpisodeAssignedTagDetails = async (tag: any, episode: Episode) => {
    console.log('[handleOpenEpisodeAssignedTagDetails] Clicked tag:', tag);
    
    try {
      if (!series.id) {
        alert('Error: No series ID found');
        return;
      }
      
      if (!tag.content_tag_id) {
        alert('Error: No content tag ID found');
        return;
      }
      
      setSelectedEpisodeAssignedTag({
        tag: tag,
        metadata: {
          content_tag_id: tag.content_tag_id,
          start_time: tag.start_time,
          end_time: tag.end_time,
          notes: tag.notes,
        },
        episode: { season: episode.season, episode: episode.episode }
      });
    } catch (error) {
      console.error('[handleOpenEpisodeAssignedTagDetails] Error:', error);
      alert('Error opening tag details.');
    }
  };

  const handleRemoveEpisodeTag = async (tagId: string, episode: Episode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!series.id) return;
    
    if (!window.confirm('Remove this tag from the episode?')) return;
    
    try {
      await contentTagsService.removeTagFromContent(
        tagId, 
        parseInt(series.id), 
        'tv',
        { season: episode.season, episode: episode.episode }
      );
      
      // Trigger re-render by updating episodes array
      setEpisodes([...episodes]);
    } catch (error) {
      console.error('Error removing episode tag:', error);
      alert('Failed to remove tag.');
    }
  };

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId);
      } else {
        newSet.add(collectionId);
      }
      return newSet;
    });
  };

  const handleAddToCollections = async () => {
    if (selectedCollections.size === 0) return;

    setAddingToCollections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add series to each selected collection
      for (const collectionId of selectedCollections) {
        if (series.id) {
          await customCollectionsService.addItemToCollection(series.id, collectionId);
        }
      }

      // Refresh the collections list
      const updatedCollections = await customCollectionsService.getCollectionsForItem(series.id!);
      setSeriesCollections(updatedCollections);

      alert(`Added "${series.title}" to ${selectedCollections.size} collection(s)!`);
      setShowCollectionSelector(false);
      setSelectedCollections(new Set());
    } catch (error) {
      console.error('Error adding to collections:', error);
      alert('Failed to add to collections. Please try again.');
    } finally {
      setAddingToCollections(false);
    }
  };

  const handleRemoveFromCollection = async (collectionId: string) => {
    if (!series.id) return;

    try {
      await customCollectionsService.removeItemFromCollection(series.id, collectionId);
      
      // Refresh the collections list
      const updatedCollections = await customCollectionsService.getCollectionsForItem(series.id);
      setSeriesCollections(updatedCollections);
    } catch (error) {
      console.error('Error removing from collection:', error);
      alert('Failed to remove from collection.');
    }
  };

  // ✅ Component for displaying episode tags
  const EpisodeTagsSection: React.FC<{ episode: Episode }> = ({ episode }) => {
    const { contentTags, refetch } = useContentTags(
      series.id ? parseInt(series.id) : null,
      'tv',
      { season: episode.season, episode: episode.episode }
    );

    React.useEffect(() => {
      refetch();
    }, [episodes, refetch]);

    if (contentTags.length === 0) {
      return (
        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Episode Tags</span>
            <button
              onClick={() => handleOpenEpisodeTagSelector(episode)}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors text-xs"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Tag</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">No tags for this episode</p>
        </div>
      );
    }

    return (
      <div className="border-t border-slate-200 pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-700">Episode Tags</span>
          <button
            onClick={() => handleOpenEpisodeTagSelector(episode)}
            className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors text-xs"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Tag</span>
          </button>
        </div>
        
        {/* ✅ 2 tags per row */}
        <div className="grid grid-cols-2 gap-2">
          {contentTags.map((tag) => {
            const category = getCategoryById(tag.category_id);
            
            return (
              <div
                key={tag.id}
                className="group relative flex items-center space-x-1.5 px-2 py-1.5 border border-slate-200 hover:border-blue-300 rounded-lg transition-all cursor-pointer text-xs"
                style={{ backgroundColor: `${tag.color}08` }}
                title={tag.description || tag.name}
                onClick={() => handleOpenEpisodeAssignedTagDetails(tag, episode)}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-[10px] flex-shrink-0">{category?.icon}</span>
                <span className="font-medium text-slate-900 flex-1 truncate text-xs">
                  {tag.name}
                </span>
                {(tag.start_time || tag.end_time || tag.notes) && (
                  <div className="flex-shrink-0 w-1 h-1 bg-blue-500 rounded-full" />
                )}
                <button
                  onClick={(e) => handleRemoveEpisodeTag(tag.id, episode, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-all flex-shrink-0"
                  title="Remove"
                >
                  <X className="h-2.5 w-2.5 text-red-600" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        
        {/* Episodes Section Header - Fixed at top */}
        <div className="bg-white border-b border-slate-200 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-4">
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

                      {series.year && (
                        <div className="flex items-center space-x-1 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <span>{series.year}</span>
                        </div>
                      )}
  
                      {series.rated && (
                        <div className="flex items-center space-x-1 text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          <span>Rated {series.rated}</span>
                        </div>
                      )}
                      
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
                      {totalSeasons > 0 && cacheStatus.totalEpisodes > 0 && (
                        <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                          <Download className="h-3 w-3" />
                          <span>{totalSeasons} seasons, {cacheStatus.totalEpisodes} episodes cached</span>
                        </div>
                      )}
                      {cacheStatus.isBeingFetched && (
                        <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">
                          <Zap className="h-3 w-3" />
                          <span>Discovering episodes...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousSeason}
                    disabled={currentSeason <= 1}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <select
                    value={currentSeason}
                    onChange={(e) => handleSeasonSelect(parseInt(e.target.value))}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium"
                  >
                    {Array.from({ length: totalSeasons || 10 }, (_, i) => i + 1).map(seasonNum => (
                      <option key={seasonNum} value={seasonNum}>
                        Season {seasonNum}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleNextSeason}
                    disabled={currentSeason >= (totalSeasons || 10)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
            
            {/* Series Information Header - NEW 2-COLUMN LAYOUT */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
              
              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN: OMDb + TMDB Data */}
                <div className="space-y-6">
                  
                  {/* Rating and Metadata Row */}
                  <div className="flex flex-wrap items-center gap-6">
                    {/* IMDb Rating */}
                    {series.imdb_score && (
                      <div className="flex items-center space-x-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        <span className="text-lg font-bold text-slate-900">{series.imdb_score}</span>
                        <span className="text-sm text-slate-500">IMDb</span>
                      </div>
                    )}

                    {/* Metascore */}
                    {series.metascore && (
                      <div className="flex items-center space-x-2">
                        <Award className="h-5 w-5 text-green-500" />
                        <span className="font-medium">{series.metascore} Metascore</span>
                      </div>
                    )}
                  </div>

                  {/* OMDb Additional Metadata (2-column grid) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    
                    {/* Creators */}
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

                  {/* TMDB Data Section */}
                  {series.imdb_id && (
                    <div>
                      <TMDBTVDetailsSection imdbId={series.imdb_id} />
                    </div>
                  )}
                  {/* Wikipedia Link */}
                  {series.title && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <a                  
                        href={`https://en.wikipedia.org/wiki/${encodeURIComponent(`${series.title} (TV series)`.replace(/ /g, '_'))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        <span>View on Wikipedia</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Episode Tracking + Plot */}
                <div className="space-y-6">
                  
                  {/* Episode Tracking Grid */}
                  {series.imdb_id && totalSeasons > 0 && (
                    <div>
                      <EpisodeTrackingGrid 
                        seriesImdbId={series.imdb_id} 
                        totalSeasons={totalSeasons} 
                      />
                    </div>
                  )}

                  {/* Plot Section */}
                  {series.plot && series.plot !== 'N/A' && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">Plot</h3>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="relative">
                          <p className={`text-slate-700 leading-relaxed text-sm ${!isPlotExpanded ? 'line-clamp-3' : ''}`}>
                            {series.plot}
                          </p>
                          {series.plot.length > 150 && (
                            <button
                              onClick={() => setIsPlotExpanded(!isPlotExpanded)}
                              className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm font-medium mt-2 transition-colors"
                            >
                              <span>{isPlotExpanded ? 'Show Less' : 'Show More'}</span>
                              {!isPlotExpanded ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ SERIES TAGS SECTION - Between Series Info and User Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Series Tags</span>
                </h3>
                <button
                  onClick={() => setShowTagSelector(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Tag</span>
                </button>
              </div>

              {/* Tags Display */}
              {contentTags.length === 0 ? (
                <p className="text-slate-500 text-sm">No tags yet. Add tags to organize and categorize this series.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contentTags.map((tag) => {
                    const category = getCategoryById(tag.category_id);
                    const subcategory = subcategories?.find(s => s.id === tag.subcategory_id);
                    
                    return (
                      <div
                        key={tag.id}
                        className="group relative flex items-center space-x-2 px-3 py-2 border border-slate-200 hover:border-blue-300 rounded-lg transition-all cursor-pointer"
                        style={{ backgroundColor: `${tag.color}08` }}
                        title={tag.description || tag.name}
                        onClick={() => handleOpenAssignedTagDetails(tag)}
                      >
                        {/* Color Dot */}
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        
                        {/* Category Icon */}
                        <span className="text-xs flex-shrink-0">{category?.icon}</span>
                        
                        {/* Tag Name - Allow 2 lines */}
                        <span className="font-medium text-slate-900 text-sm flex-1 line-clamp-2 min-w-0">
                          {tag.name}
                        </span>
                        
                        {/* Metadata indicator */}
                        {(tag.start_time || tag.end_time || tag.notes) && (
                          <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full" title="Has metadata" />
                        )}
                        
                        {/* Action Icons */}
                        <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {/* Remove button */}
                          <button
                            onClick={(e) => handleRemoveTag(tag.id, e)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Remove tag"
                          >
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Actions Section - OUTSIDE the white card for full-width layout below */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
              {/* Row 1: Rating, Status, Date Watched, Edit Review */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                  
                {/* My Rating */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-700">My Rating:</span>
                  <select
                    value={localRating || ''}
                    onChange={(e) => handleSeriesRatingChange(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={isUpdating}
                    className="border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    style={{ 
                      fontSize: '12px',
                      height: '28px',
                      padding: '2px 8px',
                      minWidth: '90px',
                      maxWidth: '110px'
                    }}
                  >
                    <option value="">No rating</option>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => (
                      <option key={rating} value={rating}>
                        {rating}/10
                      </option>
                    ))}
                  </select>
                  {series.rating_updated_at && (
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(series.rating_updated_at)}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-700">Status:</span>
                  <select
                    value={localStatus}
                    onChange={(e) => handleStatusChange(e.target.value as Movie['status'])}
                    disabled={isUpdating}
                    className="border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    style={{ 
                      fontSize: '12px',
                      height: '28px',
                      padding: '2px 8px',
                      minWidth: '120px',
                      maxWidth: '140px'
                    }}
                  >
                    <option value="To Watch">To Watch</option>
                    <option value="Watching">Watching</option>
                    <option value="Paused">Paused</option>
                    <option value="Watched">Watched</option>
                    <option value="To Watch Again">To Watch Again</option>
                  </select>
                  {series.status_updated_at && (
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(series.status_updated_at)}
                    </span>
                  )}
                </div>

                {/* Date Watched */}
                {(localStatus === 'Watched' || localStatus === 'To Watch Again') && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-700">Date Watched:</span>
                    <input
                      type="date"
                      value={localDateWatched || ''}
                      onChange={(e) => handleDateWatchedChange(e.target.value)}
                      disabled={isUpdating}
                      max={getTodayDateString()}
                      className="border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      style={{ 
                        fontSize: '12px',
                        height: '28px',
                        padding: '2px 8px',
                        minWidth: '130px',
                        maxWidth: '150px'
                      }}
                    />
                    {dateWatchedError && (
                      <span className="text-xs text-red-600">{dateWatchedError}</span>
                    )}
                  </div>
                )}

                {/* Edit Review Button */}
                <button
                  onClick={() => setShowSeriesReviewModal(true)}
                  disabled={isUpdating}
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  style={{ 
                    fontSize: '12px', 
                    height: '28px',
                    padding: '0 12px'
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{localReview ? 'Edit Review' : 'Add Review'}</span>
                </button>
              </div>

              {/* Row 2: Add to Collection + Collection Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Add to Collection Button */}
                <button
                  onClick={() => setShowCollectionSelector(true)}
                  disabled={isUpdating}
                  className="inline-flex items-center space-x-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  style={{ 
                    fontSize: '12px', 
                    height: '28px',
                    padding: '0 12px'
                  }}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Add to Collection</span>
                </button>

                {/* Collection Badges */}
                {loadingCollections ? (
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span>Loading collections...</span>
                  </div>
                ) : seriesCollections.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-600">In collections:</span>
                    {seriesCollections.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => setSelectedCollectionToView(collection)}
                        className="group relative inline-flex items-center space-x-2 px-3 py-1 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm"
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: collection.color }}
                        />
                        <span className="text-slate-700 group-hover:text-purple-700">
                          {collection.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove "${series.title}" from "${collection.name}"?`)) {
                              handleRemoveFromCollection(collection.id);
                            }
                          }}
                          className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove from collection"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Review Display */}
              {localReview && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-900 text-sm leading-relaxed">{localReview}</p>
                </div>
              )}
            </div>

            {tmdbData?.credits && tmdbData.credits.cast && tmdbData.credits.cast.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
                <SeriesCastDisplay 
                  credits={tmdbData.credits} 
                  createdBy={tmdbData.created_by}
                  seriesImdbId={series.imdb_id}
                  onOpenPersonDetails={handleOpenPersonDetails}
                />
              </div>
            )}

            {(tmdbData?.recommendations || tmdbData?.similar) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
                <SeriesRecommendations 
                  recommendations={tmdbData.recommendations}
                  similar={tmdbData.similar}
                  onSeriesDetailsClick={handleRecommendationClick}
                  onSeriesAddedToWatchlist={onSeriesAddedToWatchlist}
                />
              </div>
            )}

            {(() => {
              const watchProviders = tmdbData?.['watch/providers'];
              const hasWatchProviders = watchProviders?.results && Object.keys(watchProviders.results).length > 0;
  
              return hasWatchProviders ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
                  <WatchProvidersDisplay 
                    watchProviders={watchProviders}
                    title={series.title}
                  />
                </div>
              ) : null;
            })()}
            
            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
                <p className="text-slate-600">Loading Season {currentSeason}...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900 mb-1">Notice</h3>
                    <p className="text-amber-800 text-sm mb-3">{error}</p>
                    {episodes.length === 0 && (
                      <button
                        onClick={async () => {
                          try {
                            await serverSideEpisodeService.addSeriesToQueue(
                              series.imdb_id!,
                              series.title,
                              'high'
                            );
                            setError('Discovery started! Episodes will be cached in the background. Check back in a few minutes or refresh to see progress.');
                          } catch (err) {
                            console.error('Error starting discovery:', err);
                            alert('Failed to start discovery. Please try again.');
                          }
                        }}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Start Discovery</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Episodes Grid */}
            {!loading && !error && episodes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
                {episodes.map((episode) => (
                  <div key={`${episode.season}-${episode.episode}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    
                    {/* Episode Poster */}
                    {episode.poster && episode.poster !== 'N/A' && (
                      <div className="relative h-48 bg-slate-200">
                        <img 
                          src={episode.poster} 
                          alt={episode.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Episode Card Content */}
                    <div className="p-6">
                      {/* Episode Header - 2 Row Layout */}
                      <div className="flex items-start gap-2 mb-3">
                        {/* Episode Icon */}
                        <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                          <Play className="h-4 w-4 text-purple-600" />
                        </div>
                        
                        {/* Two-row content */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Episode Number + Title */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="text-sm font-semibold text-slate-900">Episode {episode.episode}</div>
                            {episode.title && (
                              <div className="text-sm font-semibold text-slate-900">{episode.title}</div>
                            )}
                          </div>
                          
                          {/* Row 2: Season + Metadata */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs text-slate-500">Season {episode.season}</div>
                            
                            {episode.released && (
                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(episode.released).toLocaleDateString()}</span>
                              </div>
                            )}
                            
                            {episode.runtime && episode.runtime !== 'N/A' && (
                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                <span>{episode.runtime}</span>
                              </div>
                            )}
                            
                            {episode.imdbID && (
                              <a
                                href={`https://www.imdb.com/title/${episode.imdbID}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-2 py-0.5 rounded transition-colors text-xs"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>IMDb</span>
                              </a>
                            )}
                            
                            {episode.imdbRating && episode.imdbRating !== 'N/A' && (
                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="font-medium">{episode.imdbRating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Episode Plot */}
                      {episode.plot && episode.plot !== 'N/A' && (
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 mb-4">
                          {episode.plot}
                        </p>
                      )}

                      {/* Credits */}
                      {(episode.director || episode.writer || episode.actors) && (
                        <div className="space-y-1 text-xs text-slate-500">
                          {episode.director && episode.director !== 'N/A' && (
                            <div className="flex items-start space-x-1">
                              <User className="h-3 w-3 mt-0.5" />
                              <span><span className="font-medium">Director:</span> {episode.director}</span>
                            </div>
                          )}
                          {episode.writer && episode.writer !== 'N/A' && (
                            <div className="flex items-start space-x-1">
                              <User className="h-3 w-3 mt-0.5" />
                              <span><span className="font-medium">Writer:</span> {episode.writer}</span>
                            </div>
                          )}
                          {episode.actors && episode.actors !== 'N/A' && (
                            <div className="flex items-start space-x-1">
                              <Users className="h-3 w-3 mt-0.5" />
                              <span><span className="font-medium">Stars:</span> {episode.actors}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ===== Episode Tracking Section ===== */}
                      <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                        
                        {/* Status, Rating, and Review in a row */}
                        <div className="flex items-center gap-2 text-xs">
                          {/* Status Selector */}
                          <div className="flex items-center space-x-1 flex-1">
                            <label className="font-medium text-slate-700 whitespace-nowrap">Status:</label>
                            <select
                              value={episode.status || 'To Watch'}
                              onChange={async (e) => {
                                const newStatus = e.target.value as Episode['status'];
    
                                // Update local state immediately for responsive UI
                                const updatedEpisodes = episodes.map(ep => 
                                  ep.season === episode.season && ep.episode === episode.episode
                                    ? { 
                                        ...ep, 
                                        status: newStatus, 
                                        date_watched: newStatus === 'Watched' ? getTodayDateString() : ep.date_watched 
                                      }
                                    : ep
                                );
                                setEpisodes(updatedEpisodes);
    
                                // Save to database
                                await episodeTrackingService.updateEpisodeTracking(
                                  series.imdb_id!,
                                  episode.season,
                                  episode.episode,
                                  { 
                                    status: newStatus,
                                    date_watched: newStatus === 'Watched' ? getTodayDateString() : undefined
                                  }
                                );
                              }}
                              className="flex-1 border border-slate-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs"
                            >
                              <option value="To Watch">To Watch</option>
                              <option value="Watching">Watching</option>
                              <option value="Watched">Watched</option>
                              <option value="To Watch Again">To Watch Again</option>
                            </select>
                          </div>

                          {/* Rating Dropdown */}
                          <div className="flex items-center space-x-1 flex-1">
                            <label className="font-medium text-slate-700 whitespace-nowrap">My Rating:</label>
                            <select
                              value={episode.user_rating || ''}
                              onChange={async (e) => {
                                const newRating = e.target.value ? parseInt(e.target.value) : null;
                                
                                // Update local state immediately for responsive UI
                                const updatedEpisodes = episodes.map(ep => 
                                  ep.season === episode.season && ep.episode === episode.episode
                                    ? { ...ep, user_rating: newRating }
                                    : ep
                                );
                                setEpisodes(updatedEpisodes);
                                
                                // Save to database
                                await episodeTrackingService.updateEpisodeTracking(
                                  series.imdb_id!,
                                  episode.season,
                                  episode.episode,
                                  { user_rating: newRating }
                                );
                              }}
                              className="flex-1 border border-slate-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs"
                            >
                              <option value="">No rating</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                                <option key={rating} value={rating}>
                                  {rating}/10 {'★'.repeat(Math.ceil(rating / 2))}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Review Button */}
                          <button
                            onClick={() => {
                              setSelectedEpisode(episode);
                              setShowReviewModal(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg transition-colors whitespace-nowrap text-xs"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>{episode.user_review ? 'Edit Review' : 'Add Review'}</span>
                          </button>
                        </div>

                        {/* Review Display */}
                        {episode.user_review && (
                          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-blue-800 mb-0.5">My Review</p>
                                <p className="text-xs text-blue-700">{episode.user_review}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ✅ ADD: Episode Tags Section */}
                        <EpisodeTagsSection episode={episode} />
                      </div>
                      {/* ===== END: Episode Tracking Section ===== */}
                    
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

      {/* Series Review Modal */}
      {showSeriesReviewModal && (
        <ReviewModal
          isOpen={showSeriesReviewModal}
          onClose={() => setShowSeriesReviewModal(false)}
          onSave={handleSaveSeriesReview}
          initialReview={localReview || ''}
          movieTitle={series.title}
        />
      )}

      {/* Episode Review Modal */}
      {showReviewModal && selectedEpisode && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
          onSave={async (review) => {
            // Update local state immediately
            const updatedEpisodes = episodes.map(ep => 
              ep.season === selectedEpisode.season && ep.episode === selectedEpisode.episode
                ? { ...ep, user_review: review }
                : ep
            );
            setEpisodes(updatedEpisodes);
            
            // Save to database
            await episodeTrackingService.updateEpisodeTracking(
              series.imdb_id!,
              selectedEpisode.season,
              selectedEpisode.episode,
              { user_review: review }
            );
            
            setShowReviewModal(false);
            setSelectedEpisode(null);
          }}
          initialReview={selectedEpisode.user_review || ''}
          movieTitle={`${series.title} - S${selectedEpisode.season}E${selectedEpisode.episode}${selectedEpisode.title ? ': ' + selectedEpisode.title : ''}`}
        />
      )}

      {/* Person Details Modal */}
      {showPersonDetailsModal && selectedPersonId && (
        <div className="fixed inset-0 z-[60]"> {/* ✅ z-[60] to appear above episode modal */}
          <PersonDetailsModal
            tmdbPersonId={selectedPersonId}
            personName={selectedPersonName}
            personType={selectedPersonType}
            onClose={() => {
              setShowPersonDetailsModal(false);
              setSelectedPersonId(null);
            }}
            onOpenMovieDetails={(movie) => {  // ✅ ADD THIS ENTIRE PROP
              console.log('[EnhancedEpisodesBrowserPage] Movie clicked from PersonDetailsModal');
              setShowPersonDetailsModal(false);
              setSelectedPersonId(null);
              alert(`"${movie.title}" is a movie. This feature works best from the Movies page where you can view full movie details.`);
            }}
            onOpenSeriesDetails={handleOpenSeriesDetails}
          />
        </div>
      )}

      {/* Collection Selector Popup */}
      {showCollectionSelector && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCollectionSelector(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add to Collections</h3>
              <button
                onClick={() => setShowCollectionSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {customCollections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-2">No custom collections yet</p>
                  <p className="text-sm text-slate-500">
                    Create a custom collection first to add titles
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customCollections.map((collection) => (
                    <label
                      key={collection.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollections.has(collection.id)}
                        onChange={() => handleToggleCollection(collection.id)}
                        className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: collection.color }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {collection.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{collection.name}</p>
                        {collection.description && (
                          <p className="text-xs text-slate-500 truncate">{collection.description}</p>
                        )}
                      </div>
                      {selectedCollections.has(collection.id) && (
                        <Check className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCollectionSelector(false);
                  setSelectedCollections(new Set());
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCollections}
                disabled={selectedCollections.size === 0 || addingToCollections}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {addingToCollections ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Add to {selectedCollections.size} Collection(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Collection Detail Modal */}
      {selectedCollectionToView && (
        <CustomCollectionDetailModal
          isOpen={!!selectedCollectionToView}
          onClose={() => setSelectedCollectionToView(null)}
          collection={selectedCollectionToView}
          onMovieClick={handleRecommendationClick}
          onUpdatePoster={(collectionId, posterUrl) => {
            console.log('Poster updated for collection:', collectionId, posterUrl);
          }}
        />
      )}

      {/* ✅ NEW: Tag Selector Modal */}
      {showTagSelector && series.id && !isNaN(parseInt(series.id)) && (
        <TagSelectorModal
          isOpen={showTagSelector}
          onClose={() => setShowTagSelector(false)}
          contentId={parseInt(series.id)}
          contentType="tv"
          contentTitle={series.title}
          onTagsUpdated={() => {
            refetchContentTags();
          }}
        />
      )}

      {/* ✅ Assigned Tag Detail Modal for Series */}
      {selectedAssignedTag && series.id && (
        <AssignedTagDetailModal
          isOpen={!!selectedAssignedTag}
          onClose={() => setSelectedAssignedTag(null)}
          tag={selectedAssignedTag.tag}
          contentId={parseInt(series.id)}
          contentType="tv"
          contentTitle={series.title}
          initialMetadata={selectedAssignedTag.metadata}
          onSaved={async () => {
            console.log('[EnhancedEpisodesBrowserPage] onSaved called, refetching tags...');
            await refetchContentTags();
            console.log('[EnhancedEpisodesBrowserPage] Tags refetched');
          }}
        />
      )}

      {/* ✅ Tag Selector Modal */}
      {showTagSelector && series.id && !isNaN(parseInt(series.id)) && (
        <TagSelectorModal
          isOpen={showTagSelector}
          onClose={() => setShowTagSelector(false)}
          contentId={parseInt(series.id)}
          contentType="tv"
          contentTitle={series.title}
          onTagsUpdated={() => {
            refetchContentTags();
          }}
        />
      )}

      {/* ✅ Episode Tag Detail Modal */}
      {selectedEpisodeAssignedTag && series.id && (
        <AssignedTagDetailModal
          isOpen={!!selectedEpisodeAssignedTag}
          onClose={() => setSelectedEpisodeAssignedTag(null)}
          tag={selectedEpisodeAssignedTag.tag}
          contentId={parseInt(series.id)}
          contentType="tv"
          contentTitle={`${series.title} - S${selectedEpisodeAssignedTag.episode.season}E${selectedEpisodeAssignedTag.episode.episode}`}
          initialMetadata={selectedEpisodeAssignedTag.metadata}
          onSaved={() => {
            // Trigger episode tags refresh
            setEpisodes([...episodes]);
          }}
        />
      )}

      {/* ✅ Tag Selector Modal - Handles both series and episode tags */}
      {showTagSelector && series.id && !isNaN(parseInt(series.id)) && (
        <TagSelectorModal
          isOpen={showTagSelector}
          onClose={() => {
            setShowTagSelector(false);
            setSelectedEpisodeForTag(null);
          }}
          contentId={parseInt(series.id)}
          contentType="tv"
          contentTitle={
            selectedEpisodeForTag
              ? `${series.title} - S${selectedEpisodeForTag.season}E${selectedEpisodeForTag.episode}${selectedEpisodeForTag.title ? ': ' + selectedEpisodeForTag.title : ''}`
              : series.title
          }
          episodeInfo={
            selectedEpisodeForTag
              ? { season: selectedEpisodeForTag.season, episode: selectedEpisodeForTag.episode }
              : undefined
          }
          onTagsUpdated={() => {
            if (selectedEpisodeForTag) {
              setEpisodes([...episodes]);
            } else {
              refetchContentTags();
            }
          }}
        />
      )}
    </>
  );
}