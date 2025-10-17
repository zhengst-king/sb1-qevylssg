// src/components/MovieCastSection.tsx
// Component to display cast and crew for a movie - MATCHES SERIES CAST DISPLAY

import React, { useEffect, useState } from 'react';
import { User, Users, Heart, Film, Camera, Music, Palette, Wand2, Sparkles, Clapperboard } from 'lucide-react';
import { tmdbCastService, TMDBMovieCredits, TMDBCastMember, TMDBCrewMember } from '../services/tmdbCastService';
import { tmdbService } from '../lib/tmdb';
import { favoriteActorsService } from '../services/favoriteActorsService';
import { favoriteCrewService } from '../services/favoriteCrewService';
import { favoriteCharactersService } from '../services/favoriteCharactersService';

interface MovieCastSectionProps {
  imdbId: string;
  className?: string;
}

type MainTab = 'cast' | 'crew';
type CrewSubTab = 'director' | 'producer' | 'executive-producer' | 'writer' | 'cinematographer' | 'editor' | 'music' | 'production-design' | 'costume-design' | 'vfx';

const crewJobMapping: Record<CrewSubTab, { jobs: string[]; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'director': { jobs: ['Director'], label: 'Director', icon: Film },
  'producer': { jobs: ['Producer'], label: 'Producer', icon: Clapperboard },
  'executive-producer': { jobs: ['Executive Producer'], label: 'Executive Producer', icon: Clapperboard },
  'writer': { jobs: ['Writer', 'Screenplay', 'Story'], label: 'Writer', icon: Sparkles },
  'cinematographer': { jobs: ['Director of Photography'], label: 'Cinematographer', icon: Camera },
  'editor': { jobs: ['Editor'], label: 'Editor', icon: Film },
  'music': { jobs: ['Original Music Composer', 'Music'], label: 'Music', icon: Music },
  'production-design': { jobs: ['Production Design'], label: 'Production Design', icon: Palette },
  'costume-design': { jobs: ['Costume Design'], label: 'Costume Design', icon: Palette },
  'vfx': { jobs: ['Visual Effects Supervisor'], label: 'Visual Effects', icon: Wand2 }
};

export function MovieCastSection({
  imdbId,
  className = ''
  onOpenPersonDetails
}: MovieCastSectionProps) {
  const [credits, setCredits] = useState<TMDBMovieCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('cast');
  const [crewSubTab, setCrewSubTab] = useState<CrewSubTab>('director');
  const [showAllCast, setShowAllCast] = useState(false);
  const [favoriteActorIds, setFavoriteActorIds] = useState<Set<number>>(new Set());
  const [favoriteCrewIds, setFavoriteCrewIds] = useState<Set<number>>(new Set());

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

  // Load favorite crew
  useEffect(() => {
    const loadFavorites = async () => {
      const favorites = await favoriteCrewService.getAllFavorites();
      setFavoriteCrewIds(new Set(favorites.map(f => f.tmdb_person_id)));
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[MovieCast] Fetching credits for movie ${imdbId}`);
        const data = await tmdbCastService.getMovieCredits(imdbId);
        
        setCredits(data);
      } catch (err) {
        console.error('[MovieCast] Error fetching movie credits:', err);
        setError('Failed to load cast information');
      } finally {
        setLoading(false);
      }
    };

    if (imdbId) {
      fetchCredits();
    }
  }, [imdbId]);

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
        crewMember.profile_path || null,
        crewMember.job,
        crewMember.department || null
      );
      setFavoriteCrewIds(prev => new Set([...prev, crewMember.id]));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Users className="h-4 w-4 text-slate-400" />
          <div className="h-4 bg-slate-200 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="h-12 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error or no data
  if (error || !credits) {
    return null;
  }

  // Get cast sorted by prominence (order)
  const sortedCast = (credits.cast || []).sort((a, b) => a.order - b.order);
  const displayCast = showAllCast ? sortedCast : sortedCast.slice(0, 12);
  const hasMoreCast = sortedCast.length > 12;

  // Get crew members by job
  const getCrewByJob = (subTab: CrewSubTab): TMDBCrewMember[] => {
    const mapping = crewJobMapping[subTab];
    if (!credits.crew) return [];
    
    return credits.crew
      .filter(c => mapping.jobs.includes(c.job))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const currentCrewMembers = getCrewByJob(crewSubTab);

  if (sortedCast.length === 0 && !credits.crew?.length) {
    return null;
  }

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
            <span>Cast</span>
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
            <span>Crew</span>
          </div>
        </button>
      </div>

      {/* Cast Tab Content */}
      {mainTab === 'cast' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayCast.map((castMember) => (
              <CastMemberCard
                key={castMember.credit_id}
                castMember={castMember}
                favoriteActorIds={favoriteActorIds}
                onToggleFavoriteActor={handleToggleFavoriteActor}
                onOpenPersonDetails={onOpenPersonDetails}
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
                  {count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      crewSubTab === subTab ? 'bg-purple-700' : 'bg-slate-200'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Crew Members Grid */}
          {currentCrewMembers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentCrewMembers.map((crewMember) => {
                const isFavorite = favoriteCrewIds.has(crewMember.id);
                const tmdbPersonUrl = `https://www.themoviedb.org/person/${crewMember.id}`;
                
                const handleCrewCardClick = () => {
                  if (isFavorite && onOpenPersonDetails) {
                    onOpenPersonDetails(crewMember.id, crewMember.name, 'crew');
                  }
                };

                // ✅ Use <a> for non-favorites, <div> for favorites
                const CrewCardWrapper = isFavorite ? 'div' : 'a';
                const crewCardProps = isFavorite 
                  ? { onClick: handleCrewCardClick, className: "relative group cursor-pointer block" }
                  : { href: tmdbPersonUrl, target: "_blank", rel: "noopener noreferrer", className: "relative group block" };
                
                return (
                  <CrewCardWrapper key={`${crewMember.id}-${crewMember.credit_id}`} {...crewCardProps}>
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleFavoriteCrew(crewMember);
                      }}
                      className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all"
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${
                          isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-500'
                        }`}
                      />
                    </button>

                    {crewMember.profile_path ? (
                      <img
                        src={tmdbService.getProfileImageUrl(crewMember.profile_path, 'w185')}
                        alt={crewMember.name}
                        className="w-full aspect-[2/3] object-cover rounded-lg mb-2 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
                        <User className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{crewMember.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{crewMember.job}</p>
                  </CrewCardWrapper>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No {crewJobMapping[crewSubTab].label} information available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========== ENHANCED CAST MEMBER CARD ====================

interface CastMemberCardProps {
  castMember: TMDBCastMember;
  favoriteActorIds: Set<number>;
  onToggleFavoriteActor: (castMember: TMDBCastMember) => void;
  onOpenPersonDetails?: (tmdbPersonId: number, personName: string, personType: 'cast' | 'crew') => void; // ✅ ADD THIS
}

function CastMemberCard({ 
  castMember, 
  favoriteActorIds, 
  onToggleFavoriteActor,
  onOpenPersonDetails // ✅ ADD THIS
}: CastMemberCardProps) {
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

  const handleCardClick = () => {
    if (isFavoriteActor && onOpenPersonDetails) {
      onOpenPersonDetails(castMember.id, castMember.name, 'cast');
    }
  };

  const tmdbPersonUrl = `https://www.themoviedb.org/person/${castMember.id}`;

  // Wrapper component - use <a> for non-favorites, <div> for favorites
  const CardWrapper = isFavoriteActor ? 'div' : 'a';
  const cardProps = isFavoriteActor 
    ? { onClick: handleCardClick, className: "relative group cursor-pointer block" }
    : { href: tmdbPersonUrl, target: "_blank", rel: "noopener noreferrer", className: "relative group block" };

  return (
    <CardWrapper {...cardProps}>
      {/* Actor Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavoriteActor(castMember);
        }}
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
          className="w-full aspect-[2/3] object-cover rounded-lg mb-2 group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
          <User className="h-12 w-12 text-slate-400" />
        </div>
      )}
      
      <p className="text-sm font-medium text-slate-900 line-clamp-2">{castMember.name}</p>
      {castMember.character && (
        <div className="flex items-start space-x-1 mt-1">
          <p className="text-xs text-slate-500 line-clamp-2 flex-1">
            as {castMember.character}
          </p>
          {/* Character Favorite Button */}
          <button
            onClick={handleToggleFavoriteCharacter}
            disabled={isLoadingCharacter}
            className="flex-shrink-0 p-0.5 hover:bg-slate-100 rounded transition-colors"
            title={isFavoriteCharacter ? 'Remove character from favorites' : 'Add character to favorites'}
          >
            {isLoadingCharacter ? (
              <div className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Heart
                className={`h-3 w-3 transition-colors ${
                  isFavoriteCharacter ? 'fill-pink-500 text-pink-500' : 'text-slate-300 hover:text-pink-500'
                }`}
              />
            )}
          </button>
        </div>
      )}
    </CardWrapper>
  );
}