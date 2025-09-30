// src/components/StreamingAvailability.tsx
import React from 'react';
import { useUserRegion, REGIONS } from '../hooks/useUserRegion';
import { TMDBTVSeriesDetails } from '../lib/tmdb';
import { getLibrarySearchLinks } from '../lib/libraryServices';
import { getPhysicalMediaLinks } from '../lib/physicalMediaMarketplaces';

interface StreamingAvailabilityProps {
  tmdbData: TMDBTVSeriesDetails;
  title: string;
  year?: string;
}

export function StreamingAvailability({ 
  tmdbData, 
  title, 
  year 
}: StreamingAvailabilityProps) {
  const { region } = useUserRegion();
  const watchProviders = tmdbData.watch_providers?.results;
  
  // Get user's region providers
  const userRegionProviders = watchProviders?.[region];
  
  // Get top 5 other regions
  const otherRegions = ['GB', 'CA', 'AU', 'DE', 'FR'].filter(r => r !== region);
  
  // Get other regions with availability
  const otherRegionsWithProviders = otherRegions
    .map(regionCode => ({
      code: regionCode,
      name: REGIONS[regionCode as keyof typeof REGIONS],
      providers: watchProviders?.[regionCode]
    }))
    .filter(r => r.providers?.flatrate?.length);
  
  // Library services
  const libraryLinks = getLibrarySearchLinks(title, year);
  
  // Physical media
  const physicalLinks = getPhysicalMediaLinks(title, year);
  
  // Check if anything is available
  const hasAnyAvailability = 
    userRegionProviders?.flatrate?.length ||
    userRegionProviders?.buy?.length ||
    userRegionProviders?.rent?.length ||
    Object.keys(watchProviders || {}).length > 0;
  
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-900">Where to Watch</h3>
      
      {/* User's Region */}
      {userRegionProviders && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            Streaming ({REGIONS[region as keyof typeof REGIONS]})
          </h4>
          
          {/* Flatrate (Subscription) */}
          {userRegionProviders.flatrate && userRegionProviders.flatrate.length > 0 && (
            <div className="text-sm mb-2">
              <span className="text-slate-600">✓ </span>
              <span className="text-slate-900">
                {userRegionProviders.flatrate.map(p => p.provider_name).join(', ')}
              </span>
            </div>
          )}
          
          {/* Digital Purchase */}
          {userRegionProviders.buy && userRegionProviders.buy.length > 0 && (
            <div className="text-sm mb-2">
              <span className="text-slate-600">Digital Purchase: </span>
              <span className="text-slate-900">
                {userRegionProviders.buy.map(p => p.provider_name).join(', ')}
              </span>
            </div>
          )}
          
          {/* Digital Rental */}
          {userRegionProviders.rent && userRegionProviders.rent.length > 0 && (
            <div className="text-sm">
              <span className="text-slate-600">Digital Rental: </span>
              <span className="text-slate-900">
                {userRegionProviders.rent.map(p => p.provider_name).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Other Regions */}
      {otherRegionsWithProviders.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            Available in other regions
          </h4>
          {otherRegionsWithProviders.map(({ code, name, providers }) => (
            <div key={code} className="text-sm mb-1">
              <span className="text-slate-600">{name}: </span>
              <span className="text-slate-900">
                {providers?.flatrate?.map(p => p.provider_name).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Library Services */}
      <div className="text-sm">
        <span className="text-slate-600">Library Services: </span>
        {libraryLinks.map((service, i) => (
          <React.Fragment key={service.name}>
            {i > 0 && ' • '}
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 underline"
            >
              Search on {service.name}
            </a>
          </React.Fragment>
        ))}
      </div>
      
      {/* Physical Media */}
      <div className="text-sm">
        <span className="text-slate-600">Physical Media: </span>
        {physicalLinks.map((marketplace, i) => (
          <React.Fragment key={marketplace.name}>
            {i > 0 && ' • '}
            <a
              href={marketplace.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 underline"
            >
              Buy on {marketplace.name}
            </a>
          </React.Fragment>
        ))}
      </div>
      
      {/* Not Available Message */}
      {!hasAnyAvailability && (
        <div className="text-sm text-slate-500 italic">
          Not available for streaming
        </div>
      )}
    </div>
  );
}