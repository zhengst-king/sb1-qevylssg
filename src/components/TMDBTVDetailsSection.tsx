// src/components/TMDBTVDetailsSection.tsx
// Component to display TMDB-specific TV series information

import React, { useEffect, useState } from 'react';
import {
  Globe,
  ExternalLink,
  Users,
  Building2,
  MapPin,
  Tag,
  Tv,
  CheckCircle,
  Youtube
} from 'lucide-react';
import { tmdbService, TMDBTVSeriesDetails } from '../lib/tmdb';
import { StreamingAvailability } from './StreamingAvailability';

interface TMDBTVDetailsSectionProps {
  imdbId: string;
  className?: string;
}

export function TMDBTVDetailsSection({ imdbId, className = '' }: TMDBTVDetailsSectionProps) {
  const [tmdbData, setTmdbData] = useState<TMDBTVSeriesDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTMDBData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await tmdbService.getTVSeriesByImdbId(imdbId);
        setTmdbData(data);
      } catch (err) {
        console.error('[TMDB] Error fetching TV series data:', err);
        setError('Failed to load additional details');
      } finally {
        setLoading(false);
      }
    };

    if (imdbId) {
      fetchTMDBData();
    }
  }, [imdbId]);

  if (loading) {
    return (
      <div className={`bg-slate-50 p-4 rounded-lg animate-pulse ${className}`}>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error || !tmdbData) {
    return null; // Gracefully hide if TMDB data unavailable
  }

  // Find official trailer
  const trailer = tmdbData.videos?.results.find(
    v => v.type === 'Trailer' && v.site === 'YouTube' && v.official
  ) || tmdbData.videos?.results.find(
    v => v.type === 'Trailer' && v.site === 'YouTube'
  );

  return (
    <div className={`${className}`}>
      {/* Two-column grid layout matching OMDB fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        
        {/* Creator */}
        {tmdbData.created_by && tmdbData.created_by.length > 0 && (
          <div className="text-sm">
            <span className="text-slate-600">Created by: </span>
            <span className="text-slate-900">
              {tmdbData.created_by.map(creator => creator.name).join(', ')}
            </span>
          </div>
        )}

        {/* Networks - inline like "HBO" */}
        {tmdbData.networks && tmdbData.networks.length > 0 && (
          <div className="text-sm">
            <span className="text-slate-600">Networks: </span>
            <span className="text-slate-900">
              {tmdbData.networks.map(network => network.name).join(', ')}
            </span>
          </div>
        )}

        {/* Release Status */}
        {tmdbData.status && (
          <div className="text-sm">
            <span className="text-slate-600">Status: </span>
            <span className="text-slate-900">{tmdbData.status}</span>
          </div>
        )}

        {/* Production Companies - normal font, no borders */}
        {tmdbData.production_companies && tmdbData.production_companies.length > 0 && (
          <div className="text-sm">
            <span className="text-slate-600">Production: </span>
            <span className="text-slate-900">
              {tmdbData.production_companies.slice(0, 4).map(company => company.name).join(', ')}
            </span>
          </div>
        )}

        {/* Production Countries */}
        {tmdbData.production_countries && tmdbData.production_countries.length > 0 && (
          <div className="text-sm">
            <span className="text-slate-600">Produced in: </span>
            <span className="text-slate-900">
              {tmdbData.production_countries.map(c => c.name).join(', ')}
            </span>
          </div>
        )}

        {/* Official Website */}
        {tmdbData.homepage && (
          <div className="text-sm">
            <span className="text-slate-600">Official Site: </span>
            <a
              href={tmdbData.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 inline-flex items-center space-x-1"
            >
              <span className="underline">Visit Website</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Keywords - normal font with semicolons */}
        {tmdbData.keywords?.results && tmdbData.keywords.results.length > 0 && (
          <div className="text-sm md:col-span-2">
            <span className="text-slate-600">Keywords: </span>
            <span className="text-slate-900">
              {tmdbData.keywords.results.slice(0, 10).map(keyword => keyword.name).join('; ')}
            </span>
          </div>
        )}

        {/* Trailer - clickable YouTube icon */}
        {trailer && (
          <div className="text-sm md:col-span-2">
            <span className="text-slate-600">Trailer: </span>
            <a
              href={tmdbService.getTrailerUrl(trailer.key)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700"
              title="Watch on YouTube"
            >
              <Youtube className="h-4 w-4" />
              <span className="underline">Watch on YouTube</span>
            </a>
          </div>
        )}
      </div>

      {/* Streaming Availability */}
      {tmdbData.watch_providers && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <StreamingAvailability 
            tmdbData={tmdbData}
            title={tmdbData.name}
            year={tmdbData.first_air_date?.substring(0, 4)}
          />
        </div>
      )}
      
    </div>
  );
}