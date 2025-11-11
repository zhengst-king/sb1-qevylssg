// src/services/blurayLinkService.ts
/**
 * Service for generating blu-ray.com search links and parsing edition URLs
 * No scraping required - just smart linking!
 */

export interface BlurayEditionInfo {
  url: string;
  editionName?: string;
  format?: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  id?: string;
}

class BlurayLinkService {
  private readonly BLURAY_BASE_URL = 'https://www.blu-ray.com';

  /**
   * Generate a Google search link for a movie on blu-ray.com
   * Opens in new tab for user to find their specific edition
   */
  generateGoogleSearchLink(title: string, year?: number): string {
    const searchQuery = year 
      ? `site:blu-ray.com "${title}" ${year}`
      : `site:blu-ray.com "${title}"`;
    
    return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  }

  /**
   * Generate a direct blu-ray.com search link
   * Opens their site search directly
   */
  generateBluraySearchLink(title: string, year?: number): string {
    const searchQuery = year ? `${title} ${year}` : title;
    return `${this.BLURAY_BASE_URL}/search/?quicksearch=1&quicksearch_keyword=${encodeURIComponent(searchQuery)}&section=bluraymovies`;
  }

  /**
   * Parse a blu-ray.com URL to extract edition information
   * Example: https://www.blu-ray.com/movies/Iron-Man-4K-Blu-ray/225134/
   */
  parseBlurayUrl(url: string): BlurayEditionInfo | null {
    try {
      // Match blu-ray.com movie URLs
      const movieMatch = url.match(/blu-ray\.com\/movies\/([^/]+)\/(\d+)/i);
      
      if (movieMatch) {
        const editionSlug = movieMatch[1]; // "Iron-Man-4K-Blu-ray"
        const id = movieMatch[2]; // "225134"
        
        // Parse format from URL slug
        const format = this.detectFormatFromSlug(editionSlug);
        
        // Clean up edition name
        const editionName = this.parseEditionName(editionSlug);
        
        return {
          url,
          editionName,
          format,
          id
        };
      }

      // Also support shorter format: /Iron-Man/18783/
      const shortMatch = url.match(/blu-ray\.com\/([^/]+)\/(\d+)/i);
      if (shortMatch) {
        const editionSlug = shortMatch[1];
        const id = shortMatch[2];
        
        return {
          url,
          editionName: this.parseEditionName(editionSlug),
          format: this.detectFormatFromSlug(editionSlug),
          id
        };
      }

      return null;
    } catch (error) {
      console.error('[BlurayLink] Error parsing URL:', error);
      return null;
    }
  }

  /**
   * Detect format from URL slug
   */
  private detectFormatFromSlug(slug: string): 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray' | undefined {
    const lowerSlug = slug.toLowerCase();
    
    if (lowerSlug.includes('-4k-') || lowerSlug.includes('-uhd-')) {
      return '4K UHD';
    }
    
    if (lowerSlug.includes('-3d-blu-ray') || lowerSlug.includes('-3d-')) {
      return '3D Blu-ray';
    }
    
    if (lowerSlug.includes('-blu-ray')) {
      return 'Blu-ray';
    }
    
    if (lowerSlug.includes('-dvd')) {
      return 'DVD';
    }
    
    // Default to Blu-ray if on blu-ray.com
    return 'Blu-ray';
  }

  /**
   * Parse edition name from URL slug
   * Example: "Iron-Man-4K-Blu-ray" → "Iron Man 4K"
   */
  private parseEditionName(slug: string): string {
    // Replace hyphens with spaces
    let name = slug.replace(/-/g, ' ');
    
    // Remove format suffix (already captured separately)
    name = name.replace(/\s+(Blu ray|DVD|4K|UHD|3D)\s*$/i, '');
    
    // Capitalize properly
    name = this.toTitleCase(name);
    
    return name.trim();
  }

  /**
   * Convert to title case
   */
  private toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Validate if a URL is from blu-ray.com
   */
  isBlurayUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.blu-ray.com' || urlObj.hostname === 'blu-ray.com';
    } catch {
      return false;
    }
  }

  /**
   * Generate multiple search options for user
   */
  generateSearchOptions(title: string, year?: number) {
    return {
      googleSearch: this.generateGoogleSearchLink(title, year),
      bluraySearch: this.generateBluraySearchLink(title, year),
      directSearchText: year ? `${title} ${year}` : title
    };
  }
}

// Export singleton instance
export const blurayLinkService = new BlurayLinkService();

// Export for components
export default blurayLinkService;