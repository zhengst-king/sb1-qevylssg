// src/components/EpisodeCastSection.tsx
// Component to display cast and characters for an episode

import React, { useEffect, useState } from 'react';
import { User, Users, Star, ExternalLink } from 'lucide-react';
import { tmdbCastService, TMDBEpisodeCredits, TMDBCastMember } from '../services/tmdbCastService';

interface EpisodeCastSectionProps {
  imdbId: string;
  seasonNumber: number;
  episodeNumber: number;
  className?: string;
}

export function EpisodeCastSection({
  imdbId,
  seasonNumber,
  episodeNumber,
  className = ''
}: EpisodeCastSectionProps) {
  const [credits, setCredits] = useState<TMDBEpisodeCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllCast, setShowAllCast] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[EpisodeCast] Fetching credits for S${seasonNumber}E${episodeNumber}`);
        const data = await tmdbCastService.getEpisodeCredits(imdbId, seasonNumber, episodeNumber);
        
        setCredits(data);
      } catch (err) {
        console.error('[EpisodeCast] Error fetching episode credits:', err);
        setError('Failed to load cast information');
      } finally {
        setLoading(false);
      }
    };

    if (imdbId && seasonNumber && episodeNumber) {
      fetchCredits();
    }
  }, [imdbId, seasonNumber, episodeNumber]);

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

  // Combine regular cast and guest stars, sorted by order/prominence
  const allCast = [
    ...(credits.cast || []),
    ...(credits.guest_stars || [])
  ].sort((a, b) => a.order - b.order);

  // Show top 6 by default, all if expanded
  const displayCast = showAllCast ? allCast : allCast.slice(0, 6);
  const hasMoreCast = allCast.length > 6;

  // Get directors and writers from crew
  const directors = credits.crew?.filter(c => c.job === 'Director') || [];
  const writers = credits.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay') || [];

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
            {showAllCast ? 'Show Less' : `Show All (${allCast.length})`}
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

      {/* Cast Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayCast.map((member) => (
          <CastMemberCard key={member.credit_id} member={member} />
        ))}
      </div>

      {/* Guest Stars Badge */}
      {credits.guest_stars && credits.guest_stars.length > 0 && !showAllCast && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            <Star className="h-3 w-3 inline-block mr-1" />
            <span className="font-medium">{credits.guest_stars.length} Guest Stars</span> in this episode
          </div>
        </div>
      )}

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

// ==================== CAST MEMBER CARD ====================

interface CastMemberCardProps {
  member: TMDBCastMember;
}

function CastMemberCard({ member }: CastMemberCardProps) {
  const profileUrl = tmdbCastService.getProfileImageUrl(member.profile_path, 'w185');
  const tmdbPersonUrl = `https://www.themoviedb.org/person/${member.id}`;

  return (
    <div className="flex items-start space-x-3 p-2 rounded-lg bg-white hover:bg-slate-50 transition-colors group">
      {/* Profile Image */}
      <div className="flex-shrink-0">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={member.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-200"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="h-6 w-6 text-slate-400" />
          </div>
        )}
      </div>

      {/* Actor & Character Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {/* Actor Name */}
            <a
              href={tmdbPersonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-900 hover:text-purple-600 transition-colors line-clamp-1 group-hover:underline"
            >
              {member.name}
            </a>
            
            {/* Character Name */}
            {member.character && (
              <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                as <span className="italic">{member.character}</span>
              </div>
            )}
          </div>

          {/* Order Badge (for main cast) */}
          {member.order < 5 && (
            <div className="ml-2 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-[10px] font-bold text-purple-600">{member.order + 1}</span>
              </div>
            </div>
          )}
        </div>

        {/* Popularity Indicator (optional) */}
        {member.popularity > 10 && (
          <div className="mt-1 flex items-center space-x-1">
            <Star className="h-3 w-3 text-amber-400 fill-current" />
            <span className="text-[10px] text-slate-400">
              {member.popularity > 50 ? 'Very Popular' : 'Popular'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}