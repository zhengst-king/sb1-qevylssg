// src/components/SeriesCastDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Users, User, Heart, Film, Camera, Music, Palette, Wand2, Sparkles, Clapperboard, Info } from 'lucide-react';
import { TMDBSeriesCredits, TMDBCastMember, TMDBCrewMember } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';
import { favoriteActorsService } from '../services/favoriteActorsService';
import { favoriteCrewService } from '../services/favoriteCrewService';
import { favoriteCharactersService } from '../services/favoriteCharactersService';
import { tmdbCastService } from '../services/tmdbCastService';

interface SeriesCastDisplayProps {
  credits: TMDBSeriesCredits;
  createdBy?: Array<{ id: number; name: string; profile_path: string | null }>;
  seriesImdbId?: string;
  className?: string;
}

type MainTab = 'cast' | 'crew';
type CrewSubTab = 'director' | 'creator' | 'producer' | 'executive-producer' | 'cinematographer' | 'editor' | 'music' | 'production-design' | 'costume-design' | 'vfx' | 'sfx' | 'choreographer';

const crewJobMapping: Record<CrewSubTab, { jobs: string[]; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'director': { jobs: ['Director'], label: 'Director', icon: Film },
  'creator': { jobs: ['Creator'], label: 'Creator', icon: Sparkles },
  'producer': { jobs: ['Producer'], label: 'Producer', icon: Clapperboard },
  'executive-producer': { jobs: ['Executive Producer'], label: 'Executive Producer', icon: Clapperboard },
  'cinematographer': { jobs: ['Director of Photography'], label: 'Cinematographer', icon: Camera },
  'editor': { jobs: ['Editor'], label: 'Editor', icon: Film },
  'music': { jobs: ['Original Music Composer', 'Music'], label: 'Music', icon: Music },
  'production-design': { jobs: ['Production Design'], label: 'Production Design', icon: Palette },
  'costume-design': { jobs: ['Costume Design'], label: 'Costume Design', icon: Palette },
  'vfx': { jobs: ['Visual Effects Supervisor'], label: 'Visual Effects', icon: Wand2 },
  'sfx': { jobs: ['Special Effects'], label: 'Special Effects', icon: Wand2 },
  'choreographer': { jobs: ['Choreographer'], label: 'Choreographer', icon: Users }
};

export function SeriesCastDisplay({ credits, createdBy = [], seriesImdbId, className = '' }: SeriesCastDisplayProps) {
  const [mainTab, setMainTab] = useState<MainTab>('cast');
  const [crewSubTab, setCrewSubTab] = useState<CrewSubTab>('director');
  const [showAllCast, setShowAllCast] = useState(false);
  const [favoriteActorIds, setFavoriteActorIds] = useState<Set<number>>(new Set());
  const [favoriteCrewIds, setFavoriteCrewIds] = useState<Set<number>>(new Set());
  const [aggregatedDirectors, setAggregatedDirectors] = useState<Array<{
    name: string;
    episodeCount: number;
    episodes: Array<{season: number; episode: number}>;
  }>>([]);
  const [loadingDirectors, setLoadingDirectors] = useState(false);

  // Load favorite actors and crew
  useEffect(() => {
    const loadFavorites = async () => {
      const [actorFavorites, crewFavorites] = await Promise.all([
        favoriteActorsService.getAllFavorites(),
        favoriteCrewService.getFavoriteCrew()
      ]);
      setFavoriteActorIds(new Set(actorFavorites.map(f => f.actor_id)));
      setFavoriteCrewIds(new Set(crewFavorites.map(f => f.tmdb_person_id)));
    };
    loadFavorites();
  }, []);

  // Fetch aggregated directors from all episodes
  useEffect(() => {
    const fetchDirectors = async () => {
      if (!seriesImdbId) return;
      
      setLoadingDirectors(true);
      try {
        // Read from OMDb cache - NO API CALLS!
        const directors = await tmdbCastService.getSeriesDirectorsFromOMDb(seriesImdbId);
        setAggregatedDirectors(directors);
        console.log(`[SeriesCastDisplay] Loaded ${directors.length} directors from OMDb cache`);
      } catch (error) {
        console.error('[SeriesCastDisplay] Error fetching directors:', error);
      } finally {
        setLoadingDirectors(false);
      }
    };

    fetchDirectors();
  }, [seriesImdbId]);

  const handleToggleFavoriteActor = async (castMember: TMDBCastMember) => {
    const isFavorite = favoriteActorIds.has(castMember.id);
    
    if (isFavorite) {
      await favoriteActorsService.removeFavorite(castMember.id);
      setFavoriteActorIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(castMember.id);
        return newSet;
      });
    } else {
      await favoriteActorsService.addFavorite({
        actor_id: castMember.id,
        actor_name: castMember.name,
        profile_path: castMember.profile_path || undefined,
        character_name: castMember.character
      });
      setFavoriteActorIds(prev => new Set([...prev, castMember.id]));
    }
  };

  const handleToggleFavoriteCrew = async (crewMember: TMDBCrewMember) => {
    const isFavorite = favoriteCrewIds.has(crewMember.id);
    
    if (isFavorite) {
      await favoriteCrewService.removeFavoriteCrew(crewMember.id);
      setFavoriteCrewIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(crewMember.id);
        return newSet;
      });
    } else {
      await favoriteCrewService.addFavoriteCrew(
        crewMember.id,
        crewMember.name,
        crewMember.profile_path,
        crewMember.job,
        crewMember.department
      );
      setFavoriteCrewIds(prev => new Set([...prev, crewMember.id]));
    }
  };

  if (!credits || !credits.cast || credits.cast.length === 0) {
    return null;
  }

  // Sort cast by order
  const sortedCast = [...credits.cast].sort((a, b) => a.order - b.order);
  const displayCast = showAllCast ? sortedCast : sortedCast.slice(0, 12);
  const hasMoreCast = sortedCast.length > 12;

  // Get crew members by job
  const getCrewByJob = (subTab: CrewSubTab): any[] => {
    const mapping = crewJobMapping[subTab];
    
    // Special handling for creators - use created_by data
    if (subTab === 'creator' && createdBy.length > 0) {
      return createdBy.map(creator => ({
        id: creator.id,
        name: creator.name,
        profile_path: creator.profile_path,
        job: 'Creator',
        department: 'Writing',
        credit_id: `creator-${creator.id}`,
        adult: false,
        gender: 0,
        known_for_department: 'Writing',
        original_name: creator.name,
        popularity: 0
      }));
    }
    
    // Special handling for directors - use aggregated directors from all episodes
    if (subTab === 'director') {
      return aggregatedDirectors.map((director, index) => ({
        id: index, // Use index as ID since OMDb doesn't provide person IDs
        name: director.name,
        episodeCount: director.episodeCount,
        episodes: director.episodes,
        profile_path: null, // OMDb doesn't provide photos
        job: 'Director',
        department: 'Directing',
        credit_id: `director-${index}`,
        adult: false,
        gender: 0,
        known_for_department: 'Directing',
        original_name: director.name,
        popularity: 0
      }));
    }
    
    if (!credits.crew) return [];
    
    return credits.crew
      .filter(c => mapping.jobs.includes(c.job))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const currentCrewMembers = getCrewByJob(crewSubTab);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
      {/* Main Tabs */}
      <div className="flex items-center space-x-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setMainTab('cast')}
          className={`pb-3 px-2 font-semibold transition-colors border-b-2 ${
            mainTab === 'cast'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Series Cast</span>
          </div>
        </button>
        
        <button
          onClick={() => setMainTab('crew')}
          className={`pb-3 px-2 font-semibold transition-colors border-b-2 ${
            mainTab === 'crew'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Film className="h-5 w-5" />
            <span>Series Crew</span>
          </div>
        </button>
      </div>

      {/* Cast Tab Content */}
      {mainTab === 'cast' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayCast.map((castMember) => (
              <CastMemberCard
                key={castMember.id}
                castMember={castMember}
                favoriteActorIds={favoriteActorIds}
                onToggleFavoriteActor={handleToggleFavoriteActor}
              />
            ))}
          </div>

          {hasMoreCast && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllCast(!showAllCast)}
                className="px-6 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors"
              >
                {showAllCast ? 'Show Less' : `Show All ${sortedCast.length} Cast Members`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Crew Tab Content */}
      {mainTab === 'crew' && (
        <div>
          {/* Crew Sub-tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(crewJobMapping) as CrewSubTab[]).map((subTab) => {
              const mapping = crewJobMapping[subTab];
              const Icon = mapping.icon;
              const count = getCrewByJob(subTab).length;
              const isLoading = subTab === 'director' && loadingDirectors;
              
              return (
                <button
                  key={subTab}
                  onClick={() => setCrewSubTab(subTab)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    crewSubTab === subTab
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{mapping.label}</span>
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : count > 0 ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      crewSubTab === subTab ? 'bg-purple-700' : 'bg-slate-200'
                    }`}>
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Crew Members Grid */}
          {currentCrewMembers.length > 0 ? (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentCrewMembers.map((crewMember) => {
                  const isFavorite = favoriteCrewIds.has(crewMember.id);
                  const isDirector = crewSubTab === 'director';
                  
                  return (
                    <div key={`${crewMember.id}-${crewMember.credit_id}`} className="relative group">
                      {/* Only show favorite button for non-OMDb directors (those with real TMDB IDs) */}
                      {!isDirector && (
                        <button
                          onClick={() => handleToggleFavoriteCrew(crewMember)}
                          className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all"
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart
                            className={`h-4 w-4 transition-colors ${
                              isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-500'
                            }`}
                          />
                        </button>
                      )}

                      {/* Avatar - use placeholder for OMDb directors */}
                      {crewMember.profile_path ? (
                        <img
                          src={tmdbService.getProfileImageUrl(crewMember.profile_path, 'w185')}
                          alt={crewMember.name}
                          className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
                          <Film className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
                      
                      {/* Name */}
                      <p className="text-sm font-medium text-slate-900 line-clamp-2">
                        {crewMember.name}
                      </p>
                      
                      {/* Job title */}
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {crewMember.job}
                      </p>
                      
                      {/* Show episode count for directors */}
                      {isDirector && crewMember.episodeCount && (
                        <div className="mt-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium inline-block">
                          {crewMember.episodeCount} {crewMember.episodeCount === 1 ? 'ep' : 'eps'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Info banner for directors */}
              {crewSubTab === 'director' && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">
                        Director Information from Episode Cache
                      </p>
                      <p className="text-blue-700">
                        Showing directors from {aggregatedDirectors.reduce((sum, d) => sum + d.episodeCount, 0)} cached episodes. 
                        Browse more episodes to discover additional directors.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                {loadingDirectors 
                  ? 'Loading directors...' 
                  : crewSubTab === 'director'
                    ? 'No director information available yet. Directors will appear as you browse episodes.'
                    : `No ${crewJobMapping[crewSubTab].label} information available`
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== CAST MEMBER CARD ====================

interface CastMemberCardProps {
  castMember: TMDBCastMember;
  favoriteActorIds: Set<number>;
  onToggleFavoriteActor: (castMember: TMDBCastMember) => void;
}

function CastMemberCard({ castMember, favoriteActorIds, onToggleFavoriteActor }: CastMemberCardProps) {
  const [isFavoriteCharacter, setIsFavoriteCharacter] = useState(false);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false);
  const isFavoriteActor = favoriteActorIds.has(castMember.id);

  // Check if character is favorited
  useEffect(() => {
    const checkFavorite = async () => {
      if (castMember.character) {
        const isFav = await favoriteCharactersService.isFavorite(castMember.character);
        setIsFavoriteCharacter(isFav);
      }
    };
    checkFavorite();
  }, [castMember.character]);

  const handleToggleFavoriteCharacter = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!castMember.character) return;
    
    setIsLoadingCharacter(true);
    
    if (isFavoriteCharacter) {
      await favoriteCharactersService.removeFavorite(castMember.character);
      setIsFavoriteCharacter(false);
    } else {
      await favoriteCharactersService.addFavorite({
        character_name: castMember.character,
        actor_id: castMember.id,
        actor_name: castMember.name,
        profile_path: castMember.profile_path || undefined
      });
      setIsFavoriteCharacter(true);
    }
    
    setIsLoadingCharacter(false);
  };

  return (
    <div className="relative group">
      {/* Actor Favorite Button */}
      <button
        onClick={() => onToggleFavoriteActor(castMember)}
        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all"
        title={isFavoriteActor ? 'Remove actor from favorites' : 'Add actor to favorites'}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            isFavoriteActor ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-500'
          }`}
        />
      </button>

      {castMember.profile_path ? (
        <img
          src={tmdbService.getProfileImageUrl(castMember.profile_path, 'w185')}
          alt={castMember.name}
          className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
          <User className="h-12 w-12 text-slate-400" />
        </div>
      )}
      
      <p className="text-sm font-medium text-slate-900 line-clamp-2">{castMember.name}</p>
      
      {/* Character name with favorite button */}
      {castMember.character && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500 line-clamp-1 flex-1">
            {castMember.character}
          </p>
          <button
            onClick={handleToggleFavoriteCharacter}
            disabled={isLoadingCharacter}
            className={`ml-1 p-1 rounded-full transition-all flex-shrink-0 ${
              isFavoriteCharacter
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-purple-500'
            } ${isLoadingCharacter ? 'opacity-50 cursor-wait' : ''}`}
            title={isFavoriteCharacter ? 'Remove character from favorites' : 'Add character to favorites'}
          >
            <Heart className={`h-3 w-3 ${isFavoriteCharacter ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}