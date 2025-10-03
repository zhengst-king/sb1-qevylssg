// src/components/TMDBTVDetailsSection.tsx
// Displays TMDB data for TV series

import React, { useState, useEffect } from 'react';
import { ExternalLink, Youtube } from 'lucide-react';
import { tmdbService, TMDBTVSeriesDetails } from '../lib/tmdb';
import WatchProvidersDisplay from './WatchProvidersDisplay'; // ✅ Default export
import { SeriesCastDisplay } from './SeriesCastDisplay';
import { SeriesRecommendations } from './SeriesRecommendations';

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
      if (!imdbId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('[TMDBTVDetailsSection] Fetching data for:', imdbId);
        
        const data = await tmdbService.getTVSeriesByImdbId(imdbId);
        
        if (data) {
          console.log('[TMDBTVDetailsSection] Data received:', data);
          console.log('[TMDBTVDetailsSection] Credits:', data.credits ? `${data.credits.cast?.length} cast members` : 'No credits');
          setTmdbData(data);
        } else {
          setError('Could not fetch TMDB data');
        }
      } catch (err) {
        console.error('[TMDBTVDetailsSection] Error:', err);
        setError('Failed to load TMDB data');
      } finally {
        setLoading(false);
      }
    };

    fetchTMDBData();
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
    return null;
  }

  const trailer = tmdbData.videos?.results.find(
    v => v.type === 'Trailer' && v.site === 'YouTube' && v.official
  ) || tmdbData.videos?.results.find(
    v => v.type === 'Trailer' && v.site === 'YouTube'
  );

  const watchProviders = tmdbData['watch/providers'];
  console.log('[TMDBTVDetailsSection] Watch providers for display:', watchProviders);

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

        {/* First Air Date */}
        {tmdbData.first_air_date && (
          <div className="text-sm">
            <span className="text-slate-600">First Aired: </span>
            <span className="text-slate-900">
              {new Date(tmdbData.first_air_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Last Air Date */}
        {tmdbData.last_air_date && (
          <div className="text-sm">
            <span className="text-slate-600">Last Aired: </span>
            <span className="text-slate-900">
              {new Date(tmdbData.last_air_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Networks */}
        {tmdbData.networks && tmdbData.networks.length > 0 && (
          <div className="text-sm">
            <span className="text-slate-600">Networks: </span>
            <span className="text-slate-900">
              {tmdbData.networks.map(network => network.name).join(', ')}
            </span>
          </div>
        )}

        {/* Status */}
        {tmdbData.status && (
          <div className="text-sm">
            <span className="text-slate-600">Status: </span>
            <span className="text-slate-900">{tmdbData.status}</span>
          </div>
        )}

        {/* Production Companies */}
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

        {/* Keywords */}
        {tmdbData.keywords?.results && tmdbData.keywords.results.length > 0 && (
          <div className="text-sm md:col-span-2">
            <span className="text-slate-600">Keywords: </span>
            <span className="text-slate-900">
              {tmdbData.keywords.results.slice(0, 10).map(keyword => keyword.name).join('; ')}
            </span>
          </div>
        )}

        {/* Trailer */}
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

      {/* Cast Section */}
      {tmdbData.credits && tmdbData.credits.cast && tmdbData.credits.cast.length > 0 && (
        <div className="mt-6">
          <SeriesCastDisplay credits={tmdbData.credits} />
        </div>
      )}

      {/* Recommendations & Similar Series Section */}
      {(tmdbData.recommendations || tmdbData.similar) && (
        <div className="mt-6">
          <SeriesRecommendations 
            recommendations={tmdbData.recommendations}
            similar={tmdbData.similar}
          />
        </div>
      )}

      {/* Watch Providers Section */}
      {watchProviders && watchProviders.results && Object.keys(watchProviders.results).length > 0 ? (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <WatchProvidersDisplay 
            watchProviders={watchProviders}
            title={tmdbData.name}
          />
        </div>
      ) : (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="text-sm text-slate-500 italic">
            No streaming availability information found
          </div>
        </div>
      )}
      
    </div>
  );
}