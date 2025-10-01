// src/components/WatchProvidersDisplay.tsx
import React, { useState } from 'react';
import { WatchProvidersData, WatchProvider } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';

interface WatchProvidersDisplayProps {
  watchProviders: WatchProvidersData | null | undefined;
  title: string;
}

const WatchProvidersDisplay: React.FC<WatchProvidersDisplayProps> = ({ 
  watchProviders, 
  title 
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('US');
  const [showAllRegions, setShowAllRegions] = useState(false);

  if (!watchProviders?.results) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Where to Watch
        </h3>
        <p className="text-slate-600 text-sm">
          No streaming information available for this title.
        </p>
      </div>
    );
  }

  const results = watchProviders.results;
  const availableRegions = Object.keys(results);

  if (availableRegions.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Where to Watch
        </h3>
        <p className="text-slate-600 text-sm">
          Not currently available for streaming in any region.
        </p>
      </div>
    );
  }

  // Default to US if available, otherwise first available region
  const defaultRegion = availableRegions.includes('US') ? 'US' : availableRegions[0];
  const currentRegion = availableRegions.includes(selectedRegion) ? selectedRegion : defaultRegion;
  const regionalData = results[currentRegion];

  const renderProviders = (providers: WatchProvider[] | undefined, label: string) => {
    if (!providers || providers.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">{label}</h4>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <div
              key={provider.provider_id}
              className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm"
              title={provider.provider_name}
            >
              {provider.logo_path ? (
                <img
                  src={tmdbService.getImageUrl(provider.logo_path, 'w92') || ''}
                  alt={provider.provider_name}
                  className="w-8 h-8 rounded"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-xs">
                  {provider.provider_name.substring(0, 2)}
                </div>
              )}
              <span className="text-sm font-medium text-slate-900">
                {provider.provider_name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOtherRegions = () => {
    const otherRegions = availableRegions.filter(r => r !== currentRegion);
    
    if (otherRegions.length === 0) return null;

    return (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <button
          onClick={() => setShowAllRegions(!showAllRegions)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAllRegions ? '− Hide' : '+ Show'} other regions ({otherRegions.length})
        </button>
        
        {showAllRegions && (
          <div className="mt-3 space-y-2">
            {otherRegions.map(region => {
              const data = results[region];
              const allProviders = [
                ...(data.flatrate || []),
                ...(data.buy || []),
                ...(data.rent || [])
              ];
              
              return (
                <div key={region} className="text-sm">
                  <span className="font-medium text-slate-700">{region}:</span>{' '}
                  <span className="text-slate-600">
                    {allProviders.map(p => p.provider_name).join(', ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Where to Watch
        </h3>
        
        {availableRegions.length > 1 && (
          <select
            value={currentRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
          >
            {availableRegions.map(region => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        )}
      </div>

      {regionalData.link && (
        <a
          href={regionalData.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 mb-3 inline-block"
        >
          View all options on JustWatch →
        </a>
      )}

      {renderProviders(regionalData.flatrate, 'Stream')}
      {renderProviders(regionalData.buy, 'Buy')}
      {renderProviders(regionalData.rent, 'Rent')}

      {!regionalData.flatrate && !regionalData.buy && !regionalData.rent && (
        <p className="text-slate-600 text-sm">
          No streaming options available in {currentRegion}.
        </p>
      )}

      {renderOtherRegions()}
    </div>
  );
};

export default WatchProvidersDisplay;