export interface LibraryService {
  name: string;
  searchUrl: (title: string, year?: string) => string;
  logo?: string;
  requiresLibraryCard: boolean;
}

export const LIBRARY_SERVICES: LibraryService[] = [
  {
    name: 'Kanopy',
    searchUrl: (title, year) => 
      `https://www.kanopy.com/search?query=${encodeURIComponent(title)}`,
    requiresLibraryCard: true
  },
  {
    name: 'Hoopla',
    searchUrl: (title, year) => 
      `https://www.hoopladigital.com/search?q=${encodeURIComponent(title)}&type=video`,
    requiresLibraryCard: true
  }
];

export function getLibrarySearchLinks(title: string, year?: string) {
  return LIBRARY_SERVICES.map(service => ({
    ...service,
    url: service.searchUrl(title, year)
  }));
}