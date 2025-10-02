// src/components/WatchProvidersDisplay.tsx
// Updated with clickable provider icons and smart app detection
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
      pwa: `https://www.netflix.com/search?q=${encodedTitle}`,
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
    'Apple Store': {
      pwa: `https://tv.apple.com/search?q=${encodedTitle}`,
      app: `com.apple.tv://search?query=${encodedTitle}`,
      web: `https://tv.apple.com/search?q=${encodedTitle}`
    },
    'Fandango At Home': {
      pwa: `https://www.vudu.com/content/browse`,
      web: `https://www.vudu.com/content/browse`
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
 * Try to open PWA by navigating to its scope URL
 */
const tryOpenPWA = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const pwaWindow = window.open(
      url,
      '_blank',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (pwaWindow) {
      setTimeout(() => {
        try {
          if (pwaWindow.closed || !pwaWindow.location) {
            resolve(true);
          } else {
            pwaWindow.close();
            resolve(false);
          }
        } catch (e) {
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
  try {
    const providerUrls = getProviderUrls(title);
    
    // Find matching provider
    let urls = providerUrls[providerName as keyof typeof providerUrls];
    
    if (!urls) {
      const partialMatch = Object.keys(providerUrls).find(key => 
        providerName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(providerName.toLowerCase())
      );
      
      if (partialMatch) {
        urls = providerUrls[partialMatch as keyof typeof providerUrls];
      }
    }
    
    if (!urls) {
      return; // Let default link behavior happen
    }
    
    e.preventDefault();
    
    const { pwa: pwaUrl, app: appUrl, web: webUrl } = urls;
    
    // STEP 1: Try native app first
    if (appUrl) {
      console.log('[Provider] Attempting to open native app:', providerName);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      
      let appOpened = false;
      
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, 1500);
        
        const onBlur = () => {
          appOpened = true;
          clearTimeout(timeout);
          console.log('[Provider] Native app opened successfully');
          window.removeEventListener('blur', onBlur);
          document.removeEventListener('visibilitychange', onVisibilityChange);
          resolve();
        };
        
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
      
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      
      if (appOpened) {
        return;
      }
      
      console.log('[Provider] Native app not available, trying PWA...');
    }
    
    // STEP 2: Try PWA
    if (pwaUrl) {
      console.log('[Provider] Attempting to open PWA:', providerName);
      
      const pwaOpened = await tryOpenPWA(pwaUrl);
      
      if (pwaOpened) {
        console.log('[Provider] PWA opened successfully');
        return;
      }
      
      console.log('[Provider] PWA not available, opening web version...');
    }
    
    // STEP 3: Fall back to web - force open in actual browser
    console.log('[Provider] Opening web version');
    
    // Try to force open in system browser (not PWA)
    const link = document.createElement('a');
    link.href = webUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[Provider] Error in handleProviderClick:', error);
    // Fallback: just open the href in new tab
    const fallbackUrl = getProviderSearchUrl(providerName, title);
    const link = document.createElement('a');
    link.href = fallbackUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Helper function to get library service URLs
const getLibraryServiceUrls = (title: string) => {
  const encodedTitle = encodeURIComponent(title);
  return {
    kanopy: `https://www.kanopy.com/search?query=${encodedTitle}`,
    hoopla: `https://www.hoopladigital.com/search?q=${encodedTitle}&type=video`
  };
};

// Helper function to get physical media marketplace URLs
const getPhysicalMediaUrls = (title: string) => {
  const encodedTitle = encodeURIComponent(title);
  return {
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encodedTitle}+blu-ray`,
    amazon: `https://www.amazon.com/s?k=${encodedTitle}+blu-ray`
  };
};

// Helper function to get web URL
const getProviderSearchUrl = (providerName: string, title: string): string => {
  const providerUrls = getProviderUrls(title);
  
  let urls = providerUrls[providerName as keyof typeof providerUrls];
  
  if (!urls) {
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
  
  const encodedTitle = encodeURIComponent(title);
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

  const defaultRegion = availableRegions.includes('US') ? 'US' : availableRegions[0];
  const currentRegion = availableRegions.includes(selectedRegion) ? selectedRegion : defaultRegion;
  const regionalData = results[currentRegion];

  // Combine buy and rent into one array for "Digital Purchase/Rental"
  const purchaseRentalProviders = [
    ...(regionalData.buy || []),
    ...(regionalData.rent || [])
  ].filter((provider, index, self) => 
    // Remove duplicates by provider_id
    index === self.findIndex(p => p.provider_id === provider.provider_id)
  );

  // Get library and physical media URLs
  const libraryUrls = getLibraryServiceUrls(title);
  const physicalUrls = getPhysicalMediaUrls(title);

  const renderProviders = (providers: WatchProvider[] | undefined, label: string) => {
    if (!providers || providers.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">{label}</h4>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => {
            // Map provider names for display
            let displayName = provider.provider_name;
            if (provider.provider_name === 'Apple TV' && label === 'Digital Purchase/Rental') {
              displayName = 'Apple Store';
            }
            
            const searchUrl = getProviderSearchUrl(displayName, title);
            
            return (
              <a
                key={provider.provider_id}
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  handleProviderClick(displayName, title, e);
                }}
                className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
                title={`Watch "${title}" on ${displayName}`}
              >
                {provider.logo_path ? (
                  <img
                    src={tmdbService.getImageUrl(provider.logo_path, 'w92') || ''}
                    alt={displayName}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                    <span className="text-xs text-slate-600">
                      {displayName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-slate-700 group-hover:text-purple-600 transition-colors">
                  {displayName}
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

      {/* DEBUG: Show what data we have */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>DEBUG:</strong> Stream: {regionalData.flatrate?.length || 0}, 
          Purchase/Rental: {purchaseRentalProviders.length}
        </div>
      )}

      {renderProviders(regionalData.flatrate, 'Stream')}
      {renderProviders(purchaseRentalProviders.length > 0 ? purchaseRentalProviders : undefined, 'Digital Purchase/Rental')}

      {/* Library Services Section */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Library Services</h4>
        <div className="text-sm text-slate-600">
          <a
            href={libraryUrls.kanopy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 underline"
            onClick={(e) => {
              e.preventDefault();
              const link = document.createElement('a');
              link.href = libraryUrls.kanopy;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Search on Kanopy
          </a>
          {' • '}
          <a
            href={libraryUrls.hoopla}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 underline"
            onClick={(e) => {
              e.preventDefault();
              const link = document.createElement('a');
              link.href = libraryUrls.hoopla;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Search on Hoopla
          </a>
        </div>
      </div>

      {/* Physical Media Section */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Physical Media</h4>
        <div className="text-sm text-slate-600">
          <a
            href={physicalUrls.ebay}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 underline"
            onClick={(e) => {
              e.preventDefault();
              const link = document.createElement('a');
              link.href = physicalUrls.ebay;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Buy on eBay
          </a>
          {' • '}
          <a
            href={physicalUrls.amazon}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 underline"
            onClick={(e) => {
              e.preventDefault();
              const link = document.createElement('a');
              link.href = physicalUrls.amazon;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Buy on Amazon
          </a>
        </div>
      </div>

      {!regionalData.flatrate && purchaseRentalProviders.length === 0 && (
        <p className="text-slate-600 text-sm">
          No streaming options available in {currentRegion}.
        </p>
      )}

      {renderOtherRegions()}
    </div>
  );
};

export default WatchProvidersDisplay;