// src/components/MovieCastSection.tsx
// Component to display cast and crew for a movie - UPDATED TO MATCH EPISODE STYLE

import React, { useEffect, useState } from 'react';
import { User, Users, ExternalLink, Heart } from 'lucide-react';
import { tmdbCastService, TMDBMovieCredits, TMDBCastMember } from '../services/tmdbCastService';

interface MovieCastSectionProps {
  imdbId: string;
  className?: string;
}

export function MovieCastSection({
  imdbId,
  className = ''
}: MovieCastSectionProps) {
  const [credits, setCredits] = useState<TMDBMovieCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllCast, setShowAllCast] = useState(false);

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

  // Loading state
  if (loading) {
    return (
      <div className={`bg-slate-50 p-4 rounded-lg animate-pulse ${className}`}>
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
    return null; // Gracefully hide if cast data unavailable
  }

  // Get cast sorted by prominence (order)
  const allCast = (credits.cast || []).sort((a, b) => a.order - b.order);

  // Show top 6 by default, all if expanded
  const displayCast = showAllCast ?
    allCast : allCast.slice(0, 6);
  const hasMoreCast = allCast.length > 6;

  // Get directors and writers from crew
  const directors = credits.crew?.filter(c => c.job === 'Director') || [];
  const writers = credits.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story') || [];

  if (allCast.length === 0 && directors.length === 0 && writers.length === 0) {
    return null; // No cast or crew data
  }

  return (
    <div className={`bg-slate-50 p-4 rounded-lg ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Cast & Characters</h3>
        </div>
        {hasMoreCast && (
          <button
            onClick={() => setShowAllCast(!showAllCast)}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            {showAllCast ?
              'Show Less' : `Show All (${allCast.length})`}
          </button>
        )}
      </div>

      {/* Director & Writer Credits */}
      {(directors.length > 0 || writers.length > 0) && (
        <div className="mb-4 pb-3 border-b border-slate-200 space-y-1">
          {directors.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-medium">Directed by:</span>{' '}
              <span className="text-slate-900">{directors.map(d => d.name).join(', ')}</span>
            </div>
          )}
          {writers.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-medium">Written by:</span>{' '}
              <span className="text-slate-900">{writers.map(w => w.name).join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Cast Grid - 6 cards per row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayCast.map((member) => (
          <CastMemberCard key={member.credit_id} member={member} />
        ))}
      </div>

      {/* TMDB Attribution */}
      <div className="mt-3 pt-3 border-t border-slate-200">
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

// ==================== CAST MEMBER CARD - VERTICAL CARD LAYOUT ====================

interface CastMemberCardProps {
  member: TMDBCastMember;
}

function CastMemberCard({ member }: CastMemberCardProps) {
  const profileUrl = tmdbCastService.getProfileImageUrl(member.profile_path, 'w185');
  const tmdbPersonUrl = `https://www.themoviedb.org/person/${member.id}`;

  return (
    <a
      href={tmdbPersonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Profile Image - Portrait aspect ratio */}
        <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={member.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="h-12 w-12 text-slate-400" />
            </div>
          )}

          {/* Optional: Heart button overlay (can be enabled if favorite feature exists) */}
          {/* <button
            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Add favorite logic here
            }}
          >
            <Heart className="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors" />
          </button> */}
        </div>

        {/* Actor & Character Info */}
        <div className="p-3">
          <p className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
            {member.name}
          </p>
          {member.character && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
              as {member.character}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}