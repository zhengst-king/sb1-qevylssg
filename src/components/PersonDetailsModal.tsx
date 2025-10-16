// src/components/PersonDetailsModal.tsx
import React, { useEffect, useState } from 'react';
import { X, User, Calendar, MapPin, Globe, ExternalLink, Film, Star } from 'lucide-react';
import { tmdbCastService, TMDBPersonDetails } from '../services/tmdbCastService';
import { tmdbService } from '../lib/tmdb';

interface PersonDetailsModalProps {
  tmdbPersonId: number;
  personName: string;
  personType: 'cast' | 'crew'; // Determines which credits to show
  onClose: () => void;
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
  media_type: string;
  character?: string;
  job?: string;
  department?: string;
}

type FilmographyTab = 'known-for' | 'credits';
type CrewDepartment = 'all' | 'Directing' | 'Writing' | 'Production' | 'Camera' | 'Editing' | 'Sound' | 'Art' | 'Costume & Make-Up' | 'Visual Effects';

export function PersonDetailsModal({ tmdbPersonId, personName, personType, onClose }: PersonDetailsModalProps) {
  const [personDetails, setPersonDetails] = useState<TMDBPersonDetails | null>(null);
  const [personCredits, setPersonCredits] = useState<PersonCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [filmographyTab, setFilmographyTab] = useState<FilmographyTab>('known-for');
  const [crewDepartment, setCrewDepartment] = useState<CrewDepartment>('all');
  const [showAllCredits, setShowAllCredits] = useState(false);

  useEffect(() => {
    fetchPersonData();
  }, [tmdbPersonId]);

  const fetchPersonData = async () => {
    setLoading(true);
    try {
      // Fetch person details and credits
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
    
    // Sort by popularity and return top 12
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
      // For crew, filter by department if not 'all'
      relevantCredits = crewDepartment === 'all'
        ? personCredits.crew
        : personCredits.crew.filter(credit => credit.department === crewDepartment);
    }
    
    // Sort by release date (most recent first)
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
  const profileUrl = personDetails.profile_path
    ? tmdbCastService.getProfileImageUrl(personDetails.profile_path, 'h632')
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-slate-900">{personDetails.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Title Bar: Name, Age, Gender */}
          <div className="flex items-start space-x-6 mb-6 pb-6 border-b border-slate-200">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt={personDetails.name}
                  className="w-32 h-48 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-32 h-48 bg-slate-200 rounded-lg flex items-center justify-center">
                  <User className="h-16 w-16 text-slate-400" />
                </div>
              )}
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{personDetails.name}</h1>
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                {age && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{age} years old</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{getGenderLabel(personDetails.gender)}</span>
                </div>

                {personDetails.known_for_department && (
                  <div className="flex items-center space-x-2">
                    <Film className="h-4 w-4" />
                    <span>{personDetails.known_for_department}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

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

            {/* Crew Department Filter (only for crew credits tab) */}
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
              {displayCredits.map((credit) => (
                <CreditCard key={`${credit.id}-${credit.credit_id}`} credit={credit} personType={personType} />
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
}

function CreditCard({ credit, personType }: CreditCardProps) {
  const posterUrl = credit.poster_path
    ? tmdbService.getImageUrl(credit.poster_path, 'w342')
    : null;

  const title = credit.title || credit.name || 'Untitled';
  const year = credit.release_date || credit.first_air_date;
  const displayYear = year ? new Date(year).getFullYear() : '';
  const rating = credit.vote_average ? credit.vote_average.toFixed(1) : null;
  const mediaType = credit.media_type === 'tv' ? 'TV' : 'Movie';

  const tmdbUrl = credit.media_type === 'tv'
    ? `https://www.themoviedb.org/tv/${credit.id}`
    : `https://www.themoviedb.org/movie/${credit.id}`;

  return (
    
      href={tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
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
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium">
            {mediaType}
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

          {personType === 'crew' && credit.job && (
            <p className="text-xs text-slate-600 line-clamp-1">{credit.job}</p>
          )}
        </div>
      </div>
    </a>
  );
}