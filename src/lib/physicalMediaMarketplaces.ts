export interface Marketplace {
  name: string;
  searchUrl: (title: string, year?: string, format?: string) => string;
  icon: string; // URL or component
  types: ('dvd' | 'bluray' | '4k')[];
}

export const MARKETPLACES: Marketplace[] = [
  {
    name: 'Amazon',
    searchUrl: (title, year, format) => {
      const query = `${title} ${year || ''} ${format || 'blu-ray'}`.trim();
      return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    },
    icon: 'amazon',
    types: ['dvd', 'bluray', '4k']
  },
  {
    name: 'eBay',
    searchUrl: (title, year, format) => {
      const query = `${title} ${year || ''} ${format || 'blu-ray'}`.trim();
      return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
    },
    icon: 'ebay',
    types: ['dvd', 'bluray', '4k']
  }
];

export function getPhysicalMediaLinks(
  title: string, 
  year?: string,
  preferredFormat: 'dvd' | 'bluray' | '4k' = 'bluray'
) {
  return MARKETPLACES.map(marketplace => ({
    ...marketplace,
    url: marketplace.searchUrl(title, year, preferredFormat)
  }));
}