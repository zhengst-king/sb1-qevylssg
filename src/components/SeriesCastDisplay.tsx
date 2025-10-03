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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
  const profileUrl = tmdbService.getProfileImageUrl(member.profile_path, 'w185');
  const tmdbPersonUrl = `https://www.themoviedb.org/person/${member.id}`;

  return (
    <a
      href={tmdbPersonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Profile Image */}
        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={member.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
              <User className="h-12 w-12 text-slate-400" />
            </div>
          )}
          
          {/* Order Badge for main cast */}
          {member.order < 5 && (
            <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
              {member.order + 1}
            </div>
          )}

          {/* Popularity Indicator */}
          {member.popularity > 15 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
              <Star className="h-3 w-3 text-amber-400 fill-current" />
            </div>
          )}
        </div>

        {/* Actor Info */}
        <div className="p-3">
          <h4 className="font-medium text-slate-900 text-sm line-clamp-1 group-hover:text-purple-600 transition-colors">
            {member.name}
          </h4>
          {member.character && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              <span className="italic">{member.character}</span>
            </p>
          )}
        </div>
      </div>
    </a>
  );
}