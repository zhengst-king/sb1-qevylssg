// src/components/SeriesCastDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Users, User, Heart, Film, Camera, Music, Palette, Wand2, Sparkles, Clapperboard } from 'lucide-react';
import { TMDBSeriesCredits, TMDBCastMember, TMDBCrewMember } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';
import { favoriteActorsService } from '../services/favoriteActorsService';
import { favoriteCrewService } from '../services/favoriteCrewService';
import { favoriteCharactersService } from '../services/favoriteCharactersService';

interface SeriesCastDisplayProps {
  credits: TMDBSeriesCredits;
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

export function SeriesCastDisplay({ credits, className = '' }: SeriesCastDisplayProps) {
  const [mainTab, setMainTab] = useState<MainTab>('cast');
  const [crewSubTab, setCrewSubTab] = useState<CrewSubTab>('director');
  const [showAllCast, setShowAllCast] = useState(false);
  const [favoriteActorIds, setFavoriteActorIds] = useState<Set<number>>(new Set());
  const [favoriteCrewIds, setFavoriteCrewIds] = useState<Set<number>>(new Set());

  // Load favorite actors
  useEffect(() => {
    const loadFavorites = async () => {
      const favorites = await favoriteActorsService.getFavoriteActors();
      setFavoriteActorIds(new Set(favorites.map(f => f.tmdb_person_id)));
    };
    loadFavorites();
  }, []);

  // Load favorite actors
  useEffect(() => {
    const loadFavorites = async () => {
      const favorites = await favoriteActorsService.getAllFavorites();
      setFavoriteActorIds(new Set(favorites.map(f => f.actor_id)));
    };
    loadFavorites();
  }, []);

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
  const getCrewByJob = (subTab: CrewSubTab): TMDBCrewMember[] => {
    const mapping = crewJobMapping[subTab];
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
                
                return (
                  <div key={`${crewMember.id}-${crewMember.credit_id}`} className="relative group">
                    {/* Favorite Button */}
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

                    {crewMember.profile_path ? (
                      <img
                        src={tmdbService.getProfileImageUrl(crewMember.profile_path, 'w185')}
                        alt={crewMember.name}
                        className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
                        <User className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{crewMember.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{crewMember.job}</p>
                  </div>
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