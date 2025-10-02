// src/components/WatchProvidersDisplay.tsx
// Updated with clickable provider icons
import React, { useState } from 'react';
import { WatchProvidersData, WatchProvider } from '../lib/tmdb';
import { tmdbService } from '../lib/tmdb';
import { ExternalLink } from 'lucide-react';

interface WatchProvidersDisplayProps {
  watchProviders: WatchProvidersData | null | undefined;
  title: string;
}

// Helper function to build search URLs for streaming services
const getProviderSearchUrl = (providerName: string, title: string): string => {
  const encodedTitle = encodeURIComponent(title);
  
  // Special handling for Apple TV - use native app URL scheme on macOS/iOS
  const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.platform);
  
  // Map of provider names to their search URLs
  const searchUrls: { [key: string]: string } = {
    'Netflix': `https://www.netflix.com/search?q=${encodedTitle}`,
    'Hulu': `https://www.hulu.com/search?q=${encodedTitle}`,
    'Amazon Prime Video': `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`,
    'Amazon Video': `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`,
    'Disney Plus': `https://www.disneyplus.com/search?q=${encodedTitle}`,
    'Disney+': `https://www.disneyplus.com/search?q=${encodedTitle}`,
    'HBO Max': `https://www.max.com/search?q=${encodedTitle}`,
    'Max': `https://www.max.com/search?q=${encodedTitle}`,
    // Apple TV - use native app URL on Apple devices
    'Apple TV Plus': (isMacOS || isIOS) ? `com.apple.tv://search?query=${encodedTitle}` : `https://tv.apple.com/search?q=${encodedTitle}`,
    'Apple TV': (isMacOS || isIOS) ? `com.apple.tv://search?query=${encodedTitle}` : `https://tv.apple.com/search?q=${encodedTitle}`,
    'Paramount Plus': `https://www.paramountplus.com/search/?query=${encodedTitle}`,
    'Paramount+': `https://www.paramountplus.com/search/?query=${encodedTitle}`,
    'Peacock': `https://www.peacocktv.com/search/${encodedTitle}`,
    'Showtime': `https://www.sho.com/search?q=${encodedTitle}`,
    'Starz': `https://www.starz.com/us/en/search?q=${encodedTitle}`,
    'Crave': `https://www.crave.ca/en/search?query=${encodedTitle}`,
    'fuboTV': `https://www.fubo.tv/welcome/search?query=${encodedTitle}`,
    'Vudu': `https://www.vudu.com/content/movies/search/${encodedTitle}`,
    'Google Play Movies': `https://play.google.com/store/search?q=${encodedTitle}&c=movies`,
    'YouTube': `https://www.youtube.com/results?search_query=${encodedTitle}+full`,
    'Microsoft Store': `https://www.microsoft.com/en-us/search?q=${encodedTitle}`,
    'iTunes': `https://www.apple.com/search/${encodedTitle}?src=itunes`,
  };
  
  // Check for exact match or partial match
  const exactMatch = searchUrls[providerName];
  if (exactMatch) return exactMatch;
  
  // Try partial match (case-insensitive)
  const partialMatch = Object.keys(searchUrls).find(key => 
    providerName.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(providerName.toLowerCase())
  );
  
  if (partialMatch) return searchUrls[partialMatch];
  
  // Default: Google search for the provider and title
  return `https://www.google.com/search?q=${encodeURIComponent(providerName + ' ' + title)}`;
};

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
          {providers.map((provider) => {
            const searchUrl = getProviderSearchUrl(provider.provider_name, title);
            
            return (
              <a
                key={provider.provider_id}
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
                title={`Watch "${title}" on ${provider.provider_name}`}
              >
                {provider.logo_path ? (
                  <img
                    src={tmdbService.getImageUrl(provider.logo_path, 'w92') || ''}
                    alt={provider.provider_name}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                    <span className="text-xs text-slate-600">
                      {provider.provider_name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-slate-700 group-hover:text-purple-600 transition-colors">
                  {provider.provider_name}
                </span>
                <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOtherRegions = () => {
    const otherRegions = availableRegions.filter(region => region !== currentRegion);
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
          className="text-sm text-blue-600 hover:text-blue-700 mb-3 inline-flex items-center gap-1"
        >
          View all options on JustWatch
          <ExternalLink className="h-3 w-3" />
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