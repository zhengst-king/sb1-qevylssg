// src/components/PersonDetailsModal.tsx
import React, { useEffect, useState } from 'react';
import { X, User, Calendar, Globe, ExternalLink, Film, Star, Plus, ArrowLeft } from 'lucide-react';
import { tmdbCastService, TMDBPersonDetails } from '../services/tmdbCastService';
import { tmdbService } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import { Movie } from '../lib/supabase';
import { omdbEnrichmentService } from '../services/omdbEnrichmentService';
import { omdbApi } from '../lib/omdb';
import { useMovies } from '../hooks/useMovies';
import { buildMovieFromOMDb, getIMDbIdFromTMDB } from '../utils/movieDataBuilder';

interface PersonDetailsModalProps {
  tmdbPersonId: number;
  personName: string;
  personType: 'cast' | 'crew';
  onClose: () => void;
}

interface PersonDetailsModalProps {
  tmdbPersonId: number;
  personName: string;
  personType: 'cast' | 'crew';
  onClose: () => void;
  onOpenMovieDetails?: (movie: Movie) => void; // Add this line
}

interface PersonCredits {
  cast: CreditItem[];
  crew: CreditItem[];
}

interface CreditItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  media_type: string;
  character?: string;
  job?: string;
  department?: string;
  credit_id?: string;
}

type FilmographyTab = 'known-for' | 'credits';
type CrewDepartment = 'all' | 'Directing' | 'Writing' | 'Production' | 'Camera' | 'Editing' | 'Sound' | 'Art' | 'Costume & Make-Up' | 'Visual Effects';

export function PersonDetailsModal({ tmdbPersonId, personName, personType, onClose, onOpenMovieDetails }: PersonDetailsModalProps) {
  const [personDetails, setPersonDetails] = useState<TMDBPersonDetails | null>(null);
  const [personCredits, setPersonCredits] = useState<PersonCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [filmographyTab, setFilmographyTab] = useState<FilmographyTab>('known-for');
  const [crewDepartment, setCrewDepartment] = useState<CrewDepartment>('all');
  const [showAllCredits, setShowAllCredits] = useState(false);
  const [watchlistTitles, setWatchlistTitles] = useState<Set<number>>(new Set());
  const [selectedMovieForDetails, setSelectedMovieForDetails] = useState<Movie | null>(null);

  useEffect(() => {
    fetchPersonData();
    loadWatchlistTitles();
  }, [tmdbPersonId]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadWatchlistTitles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('movies')
        .select('tmdb_id')
        .eq('user_id', user.id);

      if (data) {
        const tmdbIds = new Set<number>();
    
        for (const movie of data) {
          if (movie.tmdb_id) {
            tmdbIds.add(movie.tmdb_id);
          }
        }
        
        setWatchlistTitles(tmdbIds);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const fetchPersonData = async () => {
    setLoading(true);
    try {
      const [details, credits] = await Promise.all([
        fetchPersonDetails(),
        fetchPersonCredits()
      ]);
      
      setPersonDetails(details);
      setPersonCredits(credits);
    } catch (error) {
      console.error('Error fetching person data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonDetails = async (): Promise<TMDBPersonDetails | null> => {
    return await tmdbCastService.getPersonDetails(tmdbPersonId);
  };

  const fetchPersonCredits = async (): Promise<PersonCredits | null> => {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/person/${tmdbPersonId}/combined_credits?api_key=${apiKey}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        cast: data.cast || [],
        crew: data.crew || []
      };
    } catch (error) {
      console.error('Error fetching person credits:', error);
      return null;
    }
  };

  const calculateAge = (birthday: string | null, deathday: string | null): string | null => {
    if (!birthday) return null;
    
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  const getGenderLabel = (gender: number): string => {
    switch (gender) {
      case 1: return 'Female';
      case 2: return 'Male';
      case 3: return 'Non-binary';
      default: return 'Not specified';
    }
  };

  const getKnownForCredits = (): CreditItem[] => {
    if (!personCredits) return [];
    
    const relevantCredits = personType === 'cast' 
      ? personCredits.cast 
      : personCredits.crew;
    
    // For crew "Known For", deduplicate by title ID
    if (personType === 'crew') {
      const uniqueCredits = new Map<number, CreditItem>();
      relevantCredits.forEach(credit => {
        if (!uniqueCredits.has(credit.id) || 
            (uniqueCredits.get(credit.id)!.vote_average || 0) < (credit.vote_average || 0)) {
          uniqueCredits.set(credit.id, credit);
        }
      });
      
      return Array.from(uniqueCredits.values())
        .sort((a, b) => (b.vote_average * 10 + (b.vote_count || 0) / 1000) - (a.vote_average * 10 + (a.vote_count || 0) / 1000))
        .slice(0, 12);
    }
    
    return relevantCredits
      .sort((a, b) => (b.vote_average * 10 + (b.vote_count || 0) / 1000) - (a.vote_average * 10 + (a.vote_count || 0) / 1000))
      .slice(0, 12);
  };

  const getAllCredits = (): CreditItem[] => {
    if (!personCredits) return [];
    
    let relevantCredits: CreditItem[] = [];
    
    if (personType === 'cast') {
      relevantCredits = personCredits.cast;
    } else {
      if (crewDepartment === 'all') {
        const uniqueCredits = new Map<number, CreditItem>();
        personCredits.crew.forEach(credit => {
          if (!uniqueCredits.has(credit.id)) {
            uniqueCredits.set(credit.id, credit);
          }
        });
        relevantCredits = Array.from(uniqueCredits.values());
      } else {
        relevantCredits = personCredits.crew.filter(credit => credit.department === crewDepartment);
      }
    }
    
    return relevantCredits.sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || '';
      const dateB = b.release_date || b.first_air_date || '';
      return dateB.localeCompare(dateA);
    });
  };

  const getUniqueDepartments = (): CrewDepartment[] => {
    if (!personCredits) return ['all'];
    
    const departments = new Set(personCredits.crew.map(credit => credit.department).filter(Boolean));
    return ['all', ...Array.from(departments).sort()] as CrewDepartment[];
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const displayCredits = filmographyTab === 'known-for' 
    ? getKnownForCredits() 
    : (showAllCredits ? getAllCredits() : getAllCredits().slice(0, 12));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!personDetails) {
    return null;
  }

  const age = calculateAge(personDetails.birthday, personDetails.deathday);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Stars</span>
            </button>

            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-purple-600" />
              <h1 className="text-2xl font-bold text-slate-900">{personDetails.name}</h1>
            </div>
            
            {age && (
              <div className="flex items-center space-x-1 text-slate-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{age} years old</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1 text-slate-600">
              <User className="h-4 w-4" />
              <span className="text-sm">{getGenderLabel(personDetails.gender)}</span>
            </div>

            {personDetails.known_for_department && (
              <div className="flex items-center space-x-1 text-slate-600">
                <Film className="h-4 w-4" />
                <span className="text-sm">{personDetails.known_for_department}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Basic Info Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Biography & Background</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-4">
              {personDetails.birthday && (
                <div className="text-sm">
                  <span className="text-slate-600">Born: </span>
                  <span className="text-slate-900">
                    {new Date(personDetails.birthday).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {personDetails.deathday && (
                <div className="text-sm">
                  <span className="text-slate-600">Died: </span>
                  <span className="text-slate-900">
                    {new Date(personDetails.deathday).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {personDetails.place_of_birth && (
                <div className="text-sm">
                  <span className="text-slate-600">Place of Birth: </span>
                  <span className="text-slate-900">{personDetails.place_of_birth}</span>
                </div>
              )}

              {personDetails.also_known_as && personDetails.also_known_as.length > 0 && (
                <div className="text-sm">
                  <span className="text-slate-600">Also Known As: </span>
                  <span className="text-slate-900">{personDetails.also_known_as.join(', ')}</span>
                </div>
              )}
            </div>

            {personDetails.biography && (
              <div className="text-sm text-slate-700 leading-relaxed">
                <p className="whitespace-pre-line">{personDetails.biography}</p>
              </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-4 mt-4">
              {personDetails.homepage && (
                <a
                  href={personDetails.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Globe className="h-4 w-4" />
                  <span>Official Website</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {personDetails.imdb_id && (
                <a
                  href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Film className="h-4 w-4" />
                  <span>IMDb Profile</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <a
                href={`https://www.themoviedb.org/person/${tmdbPersonId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
              >
                <Star className="h-4 w-4" />
                <span>TMDB Profile</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Filmography Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Filmography</h3>

            {/* Filmography Tabs */}
            <div className="flex items-center space-x-4 mb-4 border-b border-slate-200">
              <button
                onClick={() => setFilmographyTab('known-for')}
                className={`pb-3 px-2 font-semibold transition-colors border-b-2 relative ${
                  filmographyTab === 'known-for'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4" />
                  <span>Known For</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setFilmographyTab('credits');
                  setShowAllCredits(false);
                }}
                className={`pb-3 px-2 font-semibold transition-colors border-b-2 relative ${
                  filmographyTab === 'credits'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Film className="h-4 w-4" />
                  <span>All Credits</span>
                </div>
              </button>
            </div>

            {/* Crew Department Filter */}
            {personType === 'crew' && filmographyTab === 'credits' && (
              <div className="flex flex-wrap gap-2 mb-4">
                {getUniqueDepartments().map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      setCrewDepartment(dept);
                      setShowAllCredits(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      crewDepartment === dept
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dept === 'all' ? 'All Departments' : dept}
                  </button>
                ))}
              </div>
            )}

            {/* Credits Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {displayCredits.map((credit, index) => (
                <CreditCard 
                  key={`${credit.id}-${credit.credit_id || index}`} 
                  credit={credit} 
                  personType={personType}
                  showJob={personType === 'crew' && crewDepartment !== 'all'}
                  isInWatchlist={watchlistTitles.has(credit.id)}
                  onToggleWatchlist={() => {
                    // Will be implemented in CreditCard
                  }}
                  onWatchlistUpdate={loadWatchlistTitles}
                  onOpenMovieDetails={onOpenMovieDetails}
                />
              ))}
            </div>

            {/* Show All Button */}
            {filmographyTab === 'credits' && getAllCredits().length > 12 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAllCredits(!showAllCredits)}
                  className="px-6 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors"
                >
                  {showAllCredits ? 'Show Less' : `Show All ${getAllCredits().length} Credits`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CREDIT CARD ====================

interface CreditCardProps {
  credit: CreditItem;
  personType: 'cast' | 'crew';
  showJob?: boolean;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  onWatchlistUpdate: () => void;
  onOpenMovieDetails?: (movie: Movie) => void;
}

function CreditCard({ credit, personType, showJob = false, isInWatchlist, onWatchlistUpdate, onOpenMovieDetails }: CreditCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addMovie: addMovieToWatchlist } = useMovies();
  
  const posterUrl = credit.poster_path
    ? tmdbService.getImageUrl(credit.poster_path, 'w342')
    : null;

  const title = credit.title || credit.name || 'Untitled';
  const year = credit.release_date || credit.first_air_date;
  const displayYear = year ? new Date(year).getFullYear() : '';
  const rating = credit.vote_average ? credit.vote_average.toFixed(1) : null;
  const mediaType = credit.media_type === 'tv' ? 'series' : 'movie';

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAdding) return;
    
    setIsAdding(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to add titles to your watchlist.');
        return;
      }

      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from('movies')
          .delete()
          .eq('user_id', user.id)
          .eq('title', title)
          .eq('media_type', mediaType);

        if (error) throw error;
      } else {

        // ✅ REFACTORED - Use centralized builder for movies
        console.log('[PersonDetailsModal] Adding movie to watchlist:', title);
        
        // Get IMDb ID from TMDB
        const imdbId = await getIMDbIdFromTMDB(credit.id, credit.media_type === 'tv' ? 'tv' : 'movie');
        
        // Fetch OMDb enrichment (if IMDb ID available)
        let omdbDetails = null;
        if (imdbId) {
          try {
            console.log('[PersonDetailsModal] Fetching OMDb data for:', title, imdbId);
            omdbDetails = await omdbApi.getMovieDetails(imdbId);
          } catch (omdbError) {
            console.error('[PersonDetailsModal] OMDb fetch failed:', omdbError);
            // Continue without OMDb data
          }
        }
        
        // ✅ USE CENTRALIZED BUILDER
        const movieData = buildMovieFromOMDb(
          {
            title: title,
            year: displayYear || undefined,
            imdb_id: imdbId || `tmdb_${credit.id}`,
            tmdb_id: credit.id,
            poster_url: posterUrl || undefined,
            plot: undefined,
            imdb_score: credit.vote_average,
            media_type: mediaType,
            status: 'To Watch'
          },
          omdbDetails
        );

        // ✅ USE HOOK FOR INSERT
        await addMovieToWatchlist(movieData);

        console.log('[PersonDetailsModal] ✅ Movie added with complete data');
      }
      
      // Refresh watchlist
      onWatchlistUpdate();
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      alert('Failed to update watchlist. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    if (isInWatchlist && onOpenMovieDetails) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[PersonDetailsModal] Clicked watchlist title:', title, mediaType);
      
      // Fetch the movie from database to get full details
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[PersonDetailsModal] No user found');
          return;
        }

        console.log('[PersonDetailsModal] Fetching movie:', { title, mediaType, userId: user.id });

        const { data: movie, error } = await supabase
          .from('movies')
          .select('*')
          .eq('user_id', user.id)
          .eq('title', title)
          .eq('media_type', mediaType)
          .single();

        console.log('[PersonDetailsModal] Query result:', { movie, error });

        if (error) {
          console.error('[PersonDetailsModal] Error fetching movie:', error);
          alert(`Could not find movie in watchlist: ${error.message}`);
          return;
        }

        if (movie) {
          console.log('[PersonDetailsModal] Opening movie details modal for:', movie.title);
          onOpenMovieDetails(movie);
        } else {
          console.log('[PersonDetailsModal] No movie found in database');
          alert('Could not find this movie in your watchlist.');
        }
      } catch (error) {
        console.error('[PersonDetailsModal] Error in handleCardClick:', error);
        alert('An error occurred while trying to open movie details.');
      }
    }
  };

  const tmdbUrl = credit.media_type === 'tv'
    ? `https://www.themoviedb.org/tv/${credit.id}`
    : `https://www.themoviedb.org/movie/${credit.id}`;

  // If in watchlist, use div with onClick; otherwise use link
  if (isInWatchlist) {
    return (
      <div
        onClick={handleCardClick}
        className="group relative block cursor-pointer"
      >
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
          {/* Poster */}
          <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="h-12 w-12 text-slate-400" />
              </div>
            )}

            {/* Watchlist Button */}
            <button
              onClick={handleToggleWatchlist}
              disabled={isAdding}
              className={`absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all ${
                isInWatchlist 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white/90 hover:bg-white'
              }`}
              title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {isAdding ? (
                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <X
                  className={`h-4 w-4 transition-all ${
                    isInWatchlist 
                      ? 'text-white rotate-0' 
                      : 'text-slate-600 hover:text-purple-500 rotate-45'
                  }`}
                />
              )}
            </button>

            {/* Rating Badge */}
            {rating && parseFloat(rating) > 0 && (
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-white text-xs font-semibold">{rating}</span>
                </div>
              </div>
            )}

            {/* Media Type Badge */}
            <div className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium">
              {credit.media_type === 'tv' ? 'TV' : 'Movie'}
            </div>
          </div>

          {/* Info */}
          <div className="p-3">
            <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
              {title}
            </h3>
            
            {displayYear && (
              <p className="text-xs text-slate-500 mb-1">{displayYear}</p>
            )}

            {personType === 'cast' && credit.character && (
              <p className="text-xs text-slate-600 line-clamp-1">as {credit.character}</p>
            )}

            {personType === 'crew' && showJob && credit.job && (
              <p className="text-xs text-slate-600 line-clamp-1">{credit.job}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not in watchlist - use regular link
  return (
    <a
      href={tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Poster */}
        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="h-12 w-12 text-slate-400" />
            </div>
          )}

          {/* Watchlist Button */}
          <button
            onClick={handleToggleWatchlist}
            disabled={isAdding}
            className={`absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all ${
              isInWatchlist 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/90 hover:bg-white'
            }`}
            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isAdding ? (
              <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X
                className={`h-4 w-4 transition-all ${
                  isInWatchlist 
                    ? 'text-white rotate-0' 
                    : 'text-slate-600 hover:text-purple-500 rotate-45'
                }`}
              />
            )}
          </button>

          {/* Rating Badge */}
          {rating && parseFloat(rating) > 0 && (
            <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-white text-xs font-semibold">{rating}</span>
              </div>
            </div>
          )}

          {/* Media Type Badge */}
          <div className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium">
            {credit.media_type === 'tv' ? 'TV' : 'Movie'}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-sm text-slate-900 line-clamp-2 mb-1">
            {title}
          </h3>
          
          {displayYear && (
            <p className="text-xs text-slate-500 mb-1">{displayYear}</p>
          )}

          {personType === 'cast' && credit.character && (
            <p className="text-xs text-slate-600 line-clamp-1">as {credit.character}</p>
          )}

          {personType === 'crew' && showJob && credit.job && (
            <p className="text-xs text-slate-600 line-clamp-1">{credit.job}</p>
          )}
        </div>
      </div>
    </a>
  );
}