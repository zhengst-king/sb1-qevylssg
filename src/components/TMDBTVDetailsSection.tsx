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
  Play,
  Tv,
  CheckCircle,
  Clock
} from 'lucide-react';
import { tmdbService, TMDBTVSeriesDetails } from '../lib/tmdb';

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
    <div className={`space-y-4 ${className}`}>
      {/* Creator */}
      {tmdbData.created_by && tmdbData.created_by.length > 0 && (
        <div className="flex items-start space-x-2">
          <Users className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="font-medium text-slate-700">Created by: </span>
            <span className="text-slate-600">
              {tmdbData.created_by.map(creator => creator.name).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Networks */}
      {tmdbData.networks && tmdbData.networks.length > 0 && (
        <div className="flex items-start space-x-2">
          <Tv className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-slate-700">Networks: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {tmdbData.networks.map(network => (
                <div
                  key={network.id}
                  className="flex items-center space-x-1 bg-white border border-slate-200 rounded px-2 py-1"
                >
                  {network.logo_path && (
                    <img
                      src={tmdbService.getImageUrl(network.logo_path, 'w92') || ''}
                      alt={network.name}
                      className="h-4 object-contain"
                    />
                  )}
                  <span className="text-sm text-slate-600">{network.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Release Status */}
      {tmdbData.status && (
        <div className="flex items-start space-x-2">
          <CheckCircle className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-slate-700">Status: </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              tmdbData.status === 'Returning Series' ? 'bg-green-100 text-green-700' :
              tmdbData.status === 'Ended' ? 'bg-red-100 text-red-700' :
              tmdbData.status === 'In Production' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {tmdbData.status}
            </span>
          </div>
        </div>
      )}

      {/* Production Companies */}
      {tmdbData.production_companies && tmdbData.production_companies.length > 0 && (
        <div className="flex items-start space-x-2">
          <Building2 className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-slate-700">Production: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {tmdbData.production_companies.slice(0, 4).map(company => (
                <div
                  key={company.id}
                  className="flex items-center space-x-1 bg-white border border-slate-200 rounded px-2 py-1"
                >
                  {company.logo_path && (
                    <img
                      src={tmdbService.getImageUrl(company.logo_path, 'w92') || ''}
                      alt={company.name}
                      className="h-4 object-contain"
                    />
                  )}
                  <span className="text-sm text-slate-600">{company.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Production Countries */}
      {tmdbData.production_countries && tmdbData.production_countries.length > 0 && (
        <div className="flex items-start space-x-2">
          <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-slate-700">Produced in: </span>
            <span className="text-slate-600">
              {tmdbData.production_countries.map(c => c.name).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Official Website */}
      {tmdbData.homepage && (
        <div className="flex items-start space-x-2">
          <Globe className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-slate-700">Official Site: </span>
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
        </div>
      )}

      {/* Keywords */}
      {tmdbData.keywords?.results && tmdbData.keywords.results.length > 0 && (
        <div className="flex items-start space-x-2">
          <Tag className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-slate-700">Keywords: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {tmdbData.keywords.results.slice(0, 10).map(keyword => (
                <span
                  key={keyword.id}
                  className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs"
                >
                  {keyword.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trailer */}
      {trailer && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-slate-900">Watch Trailer</span>
            </div>
            <a
              href={tmdbService.getTrailerUrl(trailer.key)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 text-sm flex items-center space-x-1"
            >
              <span>Open in YouTube</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="aspect-video rounded overflow-hidden bg-black">
            <iframe
              src={tmdbService.getTrailerEmbedUrl(trailer.key)}
              title={trailer.name}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}