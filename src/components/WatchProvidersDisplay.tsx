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

// Map of provider app URL schemes and web URLs
const getProviderUrls = (title: string) => {
  const encodedTitle = encodeURIComponent(title);
  
  return {
    'Netflix': {
      pwa: `https://www.netflix.com/search?q=${encodedTitle}`, // PWA uses same URL as web
      app: `netflix://search?q=${encodedTitle}`,
      web: `https://www.netflix.com/search?q=${encodedTitle}`
    },
    'Hulu': {
      pwa: `https://www.hulu.com/search?q=${encodedTitle}`,
      app: `hulu://search?query=${encodedTitle}`,
      web: `https://www.hulu.com/search?q=${encodedTitle}`
    },
    'Amazon Prime Video': {
      pwa: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`,
      app: `aiv://search/${encodedTitle}`,
      web: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`
    },
    'Amazon Video': {
      pwa: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`,
      app: `aiv://search/${encodedTitle}`,
      web: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`
    },
    'Disney Plus': {
      pwa: `https://www.disneyplus.com/search?q=${encodedTitle}`,
      app: `disneyplus://search?q=${encodedTitle}`,
      web: `https://www.disneyplus.com/search?q=${encodedTitle}`
    },
    'Disney+': {
      pwa: `https://www.disneyplus.com/search?q=${encodedTitle}`,
      app: `disneyplus://search?q=${encodedTitle}`,
      web: `https://www.disneyplus.com/search?q=${encodedTitle}`
    },
    'HBO Max': {
      pwa: `https://www.max.com/search?q=${encodedTitle}`,
      app: `hbomax://search?query=${encodedTitle}`,
      web: `https://www.max.com/search?q=${encodedTitle}`
    },
    'Max': {
      pwa: `https://www.max.com/search?q=${encodedTitle}`,
      app: `hbomax://search?query=${encodedTitle}`,
      web: `https://www.max.com/search?q=${encodedTitle}`
    },
    'Apple TV Plus': {
      pwa: `https://tv.apple.com/search?q=${encodedTitle}`,
      app: `com.apple.tv://search?query=${encodedTitle}`,
      web: `https://tv.apple.com/search?q=${encodedTitle}`
    },
    'Apple TV': {
      pwa: `https://tv.apple.com/search?q=${encodedTitle}`,
      app: `com.apple.tv://search?query=${encodedTitle}`,
      web: `https://tv.apple.com/search?q=${encodedTitle}`
    },
    'Paramount Plus': {
      pwa: `https://www.paramountplus.com/search/?query=${encodedTitle}`,
      app: `paramountplus://search?query=${encodedTitle}`,
      web: `https://www.paramountplus.com/search/?query=${encodedTitle}`
    },
    'Paramount+': {
      pwa: `https://www.paramountplus.com/search/?query=${encodedTitle}`,
      app: `paramountplus://search?query=${encodedTitle}`,
      web: `https://www.paramountplus.com/search/?query=${encodedTitle}`
    },
    'Peacock': {
      pwa: `https://www.peacocktv.com/search/${encodedTitle}`,
      app: `peacock://search?q=${encodedTitle}`,
      web: `https://www.peacocktv.com/search/${encodedTitle}`
    },
    'Showtime': {
      pwa: `https://www.sho.com/search?q=${encodedTitle}`,
      app: `showtime://search?q=${encodedTitle}`,
      web: `https://www.sho.com/search?q=${encodedTitle}`
    },
    'Starz': {
      pwa: `https://www.starz.com/us/en/search?q=${encodedTitle}`,
      app: `starz://search?q=${encodedTitle}`,
      web: `https://www.starz.com/us/en/search?q=${encodedTitle}`
    },
    'Crave': {
      pwa: `https://www.crave.ca/en/search?query=${encodedTitle}`,
      app: `crave://search?query=${encodedTitle}`,
      web: `https://www.crave.ca/en/search?query=${encodedTitle}`
    },
    'fuboTV': {
      pwa: `https://www.fubo.tv/welcome/search?query=${encodedTitle}`,
      app: `fubotv://search?query=${encodedTitle}`,
      web: `https://www.fubo.tv/welcome/search?query=${encodedTitle}`
    },
    'Vudu': {
      pwa: `https://www.vudu.com/content/movies/search/${encodedTitle}`,
      web: `https://www.vudu.com/content/movies/search/${encodedTitle}`
    },
    'Google Play Movies': {
      web: `https://play.google.com/store/search?q=${encodedTitle}&c=movies`
    },
    'YouTube': {
      pwa: `https://www.youtube.com/results?search_query=${encodedTitle}+full`,
      app: `youtube://results?search_query=${encodedTitle}+full`,
      web: `https://www.youtube.com/results?search_query=${encodedTitle}+full`
    },
    'Microsoft Store': {
      web: `https://www.microsoft.com/en-us/search?q=${encodedTitle}`
    },
    'iTunes': {
      web: `https://www.apple.com/search/${encodedTitle}?src=itunes`
    }
  };
};

/**
 * Check if a PWA is installed using the getInstalledRelatedApps API
 */
const checkPWAInstalled = async (manifestUrl: string): Promise<boolean> => {
  // Check if API is available (Chrome/Edge 85+)
  if ('getInstalledRelatedApps' in navigator) {
    try {
      const relatedApps = await (navigator as any).getInstalledRelatedApps();
      return relatedApps.length > 0;
    } catch (error) {
      console.log('[PWA] getInstalledRelatedApps not supported:', error);
    }
  }
  return false;
};

/**
 * Try to open PWA by navigating to its scope URL
 * Chrome/Edge will open the PWA window if it's installed
 */
const tryOpenPWA = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Open in a new window with specific dimensions (PWA indicator)
    const pwaWindow = window.open(
      url,
      '_blank',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    
    // If window opened, check if it's a PWA
    if (pwaWindow) {
      // PWAs usually open almost instantly
      setTimeout(() => {
        try {
          // If we can't access the window, it might be a PWA (different origin/process)
          // Or it closed (which means PWA took over)
          if (pwaWindow.closed || !pwaWindow.location) {
            resolve(true); // Likely opened as PWA
          } else {
            pwaWindow.close(); // Close our test window
            resolve(false); // Not a PWA
          }
        } catch (e) {
          // Cross-origin error likely means PWA opened
          pwaWindow.close();
          resolve(true);
        }
      }, 500);
    } else {
      resolve(false);
    }
  });
};

/**
 * Smart handler that tries Native App → PWA → Web (in that order)
 */
const handleProviderClick = async (providerName: string, title: string, e: React.MouseEvent) => {
  const providerUrls = getProviderUrls(title);
  
  // Find matching provider (exact or partial match)
  let urls = providerUrls[providerName as keyof typeof providerUrls];
  
  if (!urls) {
    // Try partial match
    const partialMatch = Object.keys(providerUrls).find(key => 
      providerName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(providerName.toLowerCase())
    );
    
    if (partialMatch) {
      urls = providerUrls[partialMatch as keyof typeof providerUrls];
    }
  }
  
  // If no special URLs, just use default web behavior
  if (!urls) {
    return;
  }
  
  e.preventDefault();
  
  const { pwa: pwaUrl, app: appUrl, web: webUrl } = urls;
  
  // STEP 1: Try native app first (if available)
  if (appUrl) {
    console.log('[Provider] Attempting to open native app:', providerName);
    
    // Try to open the native app
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = appUrl;
    document.body.appendChild(iframe);
    
    let appOpened = false;
    
    // Wait to see if app opens
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 1500);
      
      // Listen for blur event - indicates app opened successfully
      const onBlur = () => {
        appOpened = true;
        clearTimeout(timeout);
        console.log('[Provider] Native app opened successfully');
        window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        resolve();
      };
      
      // Also listen for visibility change (more reliable on some browsers)
      const onVisibilityChange = () => {
        if (document.hidden) {
          appOpened = true;
          clearTimeout(timeout);
          console.log('[Provider] Native app opened (visibility change)');
          document.removeEventListener('visibilitychange', onVisibilityChange);
          window.removeEventListener('blur', onBlur);
          resolve();
        }
      };
      
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibilityChange);
    });
    
    // Clean up iframe
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
    
    if (appOpened) {
      return; // Success! Native app opened
    }
    
    console.log('[Provider] Native app not available, trying PWA...');
  }
  
  // STEP 2: Try PWA (if available and native app didn't work)
  if (pwaUrl) {
    console.log('[Provider] Attempting to open PWA:', providerName);
    
    // Try opening as PWA
    const pwaOpened = await tryOpenPWA(pwaUrl);
    
    if (pwaOpened) {
      console.log('[Provider] PWA opened successfully');
      return; // Success! PWA opened
    }
    
    console.log('[Provider] PWA not available, opening web version...');
  }
  
  // STEP 3: Fall back to web (if no native app or PWA)
  console.log('[Provider] Opening web version');
  window.open(webUrl, '_blank');
};

// Helper function to build search URLs for streaming services
const getProviderSearchUrl = (providerName: string, title: string): string => {
  const providerUrls = getProviderUrls(title);
  
  // Get the web URL from our mapping
  let urls = providerUrls[providerName as keyof typeof providerUrls];
  
  if (!urls) {
    // Try partial match
    const partialMatch = Object.keys(providerUrls).find(key => 
      providerName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(providerName.toLowerCase())
    );
    
    if (partialMatch) {
      urls = providerUrls[partialMatch as keyof typeof providerUrls];
    }
  }
  
  if (urls && urls.web) {
    return urls.web;
  }
  
  // Default: Google search for the provider and title
  const encodedTitle = encodeURIComponent(title);
  return `https://www.google.com/search?q=${encodeURIComponent(providerName + ' ' + title)}`;
};

// Remove the old searchUrls object and replace with the code above
  
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
                onClick={(e) => {
                  // Handle async PWA detection
                  handleProviderClick(provider.provider_name, title, e);
                }}
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