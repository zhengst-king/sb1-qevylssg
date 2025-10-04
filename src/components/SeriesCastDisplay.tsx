// src/components/SeriesCastDisplay.tsx
// Component to display main series cast from TMDB

import React, { useState } from 'react';
import { Users, User, Star, ExternalLink } from 'lucide-react';
import { TMDBSeriesCredits, TMDBCastMember } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';

interface SeriesCastDisplayProps {
  credits: TMDBSeriesCredits;
  className?: string;
}

export function SeriesCastDisplay({ credits, className = '' }: SeriesCastDisplayProps) {
  const [showAllCast, setShowAllCast] = useState(false);

  if (!credits || !credits.cast || credits.cast.length === 0) {
    return null;
  }

  // Sort by order (main cast first)
  const sortedCast = [...credits.cast].sort((a, b) => a.order - b.order);
  
  // Show top 8 by default, all if expanded
  const displayCast = showAllCast ? sortedCast : sortedCast.slice(0, 8);
  const hasMoreCast = sortedCast.length > 8;

  // Get main creators from crew
  const creators = credits.crew?.filter(c => c.job === 'Creator' || c.job === 'Executive Producer').slice(0, 3) || [];

  return (
    <div className={`bg-slate-50 p-4 rounded-lg ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900">Series Cast</h3>
        </div>
        {hasMoreCast && (
          <button
            onClick={() => setShowAllCast(!showAllCast)}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            {showAllCast ? 'Show Less' : `Show All (${sortedCast.length})`}
          </button>
        )}
      </div>

      {/* Main Creators (if available) */}
      {creators.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-200">
          <div className="text-sm text-slate-600">
            <span className="font-medium">Created by:</span>{' '}
            <span className="text-slate-900">
              {creators.map(c => c.name).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Cast Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayCast.map((member) => (
          <CastMemberCard key={member.credit_id} member={member} />
        ))}
      </div>

      {/* TMDB Attribution */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Cast data from TMDB</span>
          <a
            href={`https://www.themoviedb.org/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 hover:text-slate-600 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>TMDB</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ==================== CAST MEMBER CARD ====================

interface CastMemberCardProps {
  member: TMDBCastMember;
}

function CastMemberCard({ member }: CastMemberCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const profileUrl = tmdbService.getProfileImageUrl(member.profile_path, 'w185');
  const tmdbPersonUrl = `https://www.themoviedb.org/person/${member.id}`;

  // Check if actor is favorited
  useEffect(() => {
    const checkFavorite = async () => {
      const favorited = await favoriteActorsService.isFavorite(member.id);
      setIsFavorite(favorited);
    };
    checkFavorite();
  }, [member.id]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    
    if (isFavorite) {
      const success = await favoriteActorsService.removeFavorite(member.id);
      if (success) {
        setIsFavorite(false);
      }
    } else {
      const result = await favoriteActorsService.addFavorite({
        actor_id: member.id,
        actor_name: member.name,
        character_name: member.character,
        profile_path: member.profile_path,
        known_for_department: 'Acting'
      });
      if (result) {
        setIsFavorite(true);
      }
    }
    
    setIsLoading(false);
  };

  return (
    
      href={tmdbPersonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Profile Image */}
        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={member.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="h-12 w-12 text-slate-400" />
            </div>
          )}
        </div>

        {/* Actor Info */}
        <div className="p-3 relative">
          <p className="font-medium text-sm text-slate-900 truncate">
            {member.name}
          </p>
          {member.character && (
            <p className="text-xs text-slate-500 truncate">
              as {member.character}
            </p>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`absolute bottom-2 right-2 p-1.5 rounded-full transition-all ${
              isFavorite
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-red-500'
            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </a>
  );
}