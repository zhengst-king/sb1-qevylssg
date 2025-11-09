// src/lib/blurayApi.ts - BROWSER-COMPATIBLE VERSION
// Uses Supabase Edge Functions for server-side scraping
import { supabase } from './supabase';

export interface BlurayTechnicalSpecs {
  id: string;
  title: string;
  year: number;
  // Technical specifications
  video_codec?: string;
  video_resolution?: string; // "1080p", "4K UHD", "3D"
  hdr_format?: string; // "HDR10", "Dolby Vision", "HDR10+"
  audio_codecs?: string[]; // ["Dolby Atmos", "DTS-X", "DTS-HD MA"]
  audio_channels?: string[]; // ["7.1", "5.1", "2.0"]
  region_codes?: string[]; // ["A", "B", "C"]
  disc_format: string; // "Blu-ray", "4K UHD", "DVD", "3D Blu-ray"
  studio?: string;
  distributor?: string;
  release_date?: string;
  special_features?: string[];
  // Marketplace data
  upc_code?: string;
  runtime_minutes?: number;
  aspect_ratio?: string;
  subtitles?: string[];
  languages?: string[];
  // Scraping metadata
  scraped_at: Date;
  bluray_com_url: string;
  data_quality: 'complete' | 'partial' | 'minimal';
}

export interface BluraySearchResult {
  url: string;
  title: string;
  year: number;
  format: string;
  edition?: string;
  studio?: string;
  releaseDate?: string;
  isDigital?: boolean;
}

class BlurayScrapingService {
  private readonly CACHE_DURATION_DAYS = 30; // Cache for 30 days
  
  /**
   * PUBLIC: Search blu-ray.com for physical media titles
   * This is a mock implementation for now - returns sample data
   * In production, this should call a Supabase Edge Function
   */
  async searchBlurayDotCom(query: string, year?: number): Promise<BluraySearchResult[]> {
    console.log('[BlurayAPI] Searching blu-ray.com for:', query, year);
    
    try {
      // For now, return mock data to prevent app crash
      // TODO: Implement Edge Function call when ready
      console.warn('[BlurayAPI] Using mock data - Edge Function not yet implemented');
      
      return this.getMockSearchResults(query, year);
      
      /* 
      // Future implementation with Edge Function:
      const { data, error } = await supabase.functions.invoke('bluray-search', {
        body: { query, year }
      });
      
      if (error) throw error;
      return this.enhanceSearchResults(data.results || []);
      */
      
    } catch (error) {
      console.error('[BlurayAPI] Search error:', error);
      return [];
    }
  }

  /**
   * PUBLIC: Get detailed specs for a specific blu-ray.com URL
   * This is a mock implementation for now
   */
  async scrapeDiscDetails(blurayUrl: string): Promise<BlurayTechnicalSpecs | null> {
    console.log('[BlurayAPI] Fetching specs for:', blurayUrl);
    
    try {
      // Check cache first
      const cached = await this.getCachedSpecsByUrl(blurayUrl);
      if (cached && this.isCacheValid(cached.scraped_at)) {
        console.log('[BlurayAPI] Using cached specs');
        return cached;
      }
      
      // For now, return mock data
      // TODO: Implement Edge Function call when ready
      console.warn('[BlurayAPI] Using mock data - Edge Function not yet implemented');
      
      return this.getMockDiscDetails(blurayUrl);
      
      /*
      // Future implementation with Edge Function:
      const { data, error } = await supabase.functions.invoke('bluray-scrape', {
        body: { url: blurayUrl }
      });
      
      if (error) throw error;
      
      if (data.specs) {
        await this.cacheSpecs(data.specs);
        return data.specs;
      }
      
      return null;
      */
      
    } catch (error) {
      console.error('[BlurayAPI] Scrape error:', error);
      return null;
    }
  }

  /**
   * Main method to get enhanced disc data (EXISTING METHOD - UNCHANGED)
   */
  async getDiscSpecs(title: string, year?: number): Promise<BlurayTechnicalSpecs | null> {
    try {
      // First check cache
      const cached = await this.getCachedSpecs(title, year);
      if (cached && this.isCacheValid(cached.scraped_at)) {
        console.log('[BlurayAPI] Using cached specs for:', title);
        return cached;
      }

      // Search blu-ray.com for the title
      const searchResults = await this.searchBlurayDotCom(title, year);
      if (searchResults.length === 0) {
        console.log('[BlurayAPI] No results found on blu-ray.com for:', title);
        return null;
      }

      // Get detailed specs for the best match
      const bestMatch = this.selectBestMatch(searchResults, title, year);
      const specs = await this.scrapeDiscDetails(bestMatch.url);
      
      if (specs) {
        // Cache the results
        await this.cacheSpecs(specs);
        return specs;
      }

      return null;
    } catch (error) {
      console.error('[BlurayAPI] Error getting disc specs:', error);
      return null;
    }
  }

  // Mock data for development/testing
  private getMockSearchResults(query: string, year?: number): BluraySearchResult[] {
    const queryLower = query.toLowerCase();
    
    // Generate realistic mock results based on query
    const mockResults: BluraySearchResult[] = [
      {
        url: `https://www.blu-ray.com/movies/${queryLower.replace(/\s+/g, '-')}-4k`,
        title: `${query}`,
        year: year || 2020,
        format: '4K UHD',
        edition: 'Steelbook Edition',
        studio: 'Universal Pictures',
        releaseDate: 'June 2020'
      },
      {
        url: `https://www.blu-ray.com/movies/${queryLower.replace(/\s+/g, '-')}-bluray`,
        title: `${query}`,
        year: year || 2020,
        format: 'Blu-ray',
        edition: 'Standard Edition',
        studio: 'Universal Pictures',
        releaseDate: 'June 2020'
      },
      {
        url: `https://www.blu-ray.com/movies/${queryLower.replace(/\s+/g, '-')}-dvd`,
        title: `${query}`,
        year: year || 2020,
        format: 'DVD',
        edition: 'Widescreen',
        studio: 'Universal Pictures',
        releaseDate: 'June 2020'
      },
      {
        url: `https://www.blu-ray.com/movies/${queryLower.replace(/\s+/g, '-')}-digital`,
        title: `${query}`,
        year: year || 2020,
        format: 'Digital',
        edition: 'Movies Anywhere',
        studio: 'Universal Pictures',
        releaseDate: 'June 2020',
        isDigital: true
      }
    ];
    
    return mockResults;
  }

  private getMockDiscDetails(url: string): BlurayTechnicalSpecs {
    const id = this.generateId('mock-title', 2020);
    
    return {
      id,
      title: 'Mock Title',
      year: 2020,
      video_codec: 'HEVC',
      video_resolution: '4K UHD',
      hdr_format: 'HDR10',
      audio_codecs: ['Dolby Atmos', 'DTS-HD MA 5.1'],
      audio_channels: ['7.1', '5.1'],
      region_codes: ['A'],
      disc_format: '4K UHD',
      studio: 'Universal Pictures',
      release_date: 'June 2020',
      special_features: ['Behind the Scenes', 'Deleted Scenes'],
      aspect_ratio: '2.39:1',
      subtitles: ['English', 'Spanish'],
      languages: ['English'],
      scraped_at: new Date(),
      bluray_com_url: url,
      data_quality: 'partial'
    };
  }

  // Cache management methods
  private async cacheSpecs(specs: BlurayTechnicalSpecs): Promise<void> {
    try {
      const { error } = await supabase
        .from('bluray_specs_cache')
        .upsert([specs], { onConflict: 'id' });
      
      if (error) {
        console.error('[BlurayAPI] Cache error:', error);
      }
    } catch (error) {
      console.error('[BlurayAPI] Cache storage failed:', error);
    }
  }

  private async getCachedSpecs(title: string, year?: number): Promise<BlurayTechnicalSpecs | null> {
    try {
      const id = this.generateId(title, year);
      const { data, error } = await supabase
        .from('bluray_specs_cache')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) return null;
      return data as BlurayTechnicalSpecs;
    } catch (error) {
      console.error('[BlurayAPI] Cache retrieval failed:', error);
      return null;
    }
  }

  private async getCachedSpecsByUrl(url: string): Promise<BlurayTechnicalSpecs | null> {
    try {
      const { data, error } = await supabase
        .from('bluray_specs_cache')
        .select('*')
        .eq('bluray_com_url', url)
        .single();
      
      if (error || !data) return null;
      return data as BlurayTechnicalSpecs;
    } catch (error) {
      console.error('[BlurayAPI] Cache retrieval failed:', error);
      return null;
    }
  }

  // Helper methods
  private generateId(title: string, year?: number): string {
    const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${normalized}_${year || 'unknown'}`;
  }

  private selectBestMatch(results: BluraySearchResult[], targetTitle: string, targetYear?: number): BluraySearchResult {
    // Find best match by title and year
    const targetLower = targetTitle.toLowerCase();
    
    // First try exact year match
    if (targetYear) {
      const exactYearMatch = results.find(r => 
        Math.abs(r.year - targetYear) <= 1 &&
        r.title.toLowerCase().includes(targetLower)
      );
      if (exactYearMatch) return exactYearMatch;
    }
    
    // Then try title match
    const titleMatch = results.find(r =>
      r.title.toLowerCase().includes(targetLower) ||
      targetLower.includes(r.title.toLowerCase())
    );
    
    return titleMatch || results[0];
  }

  private normalizeResolution(resolution?: string): string | undefined {
    if (!resolution) return undefined;
    
    const res = resolution.toLowerCase();
    if (res.includes('4k') || res.includes('2160p')) return '4K UHD';
    if (res.includes('1080p') || res.includes('1080i')) return '1080p';
    if (res.includes('720p')) return '720p';
    if (res.includes('3d')) return '3D';
    return resolution;
  }

  private assessDataQuality(rawData: any): 'complete' | 'partial' | 'minimal' {
    const hasVideoSpecs = !!(rawData.video_codec && rawData.video_resolution);
    const hasAudioSpecs = !!(rawData.audio_codecs && rawData.audio_codecs.length > 0);
    const hasDiscInfo = !!(rawData.disc_format && rawData.region_codes);
    
    const specCount = [hasVideoSpecs, hasAudioSpecs, hasDiscInfo].filter(Boolean).length;
    
    if (specCount === 3) return 'complete';
    if (specCount === 2) return 'partial';
    return 'minimal';
  }

  private isCacheValid(scrapedAt: Date): boolean {
    const cacheAge = Date.now() - new Date(scrapedAt).getTime();
    const maxAge = this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;
    return cacheAge < maxAge;
  }
}

// Export singleton instance
export const blurayApi = new BlurayScrapingService();

// Export types for the Collections feature
export interface PhysicalMediaCollection {
  id: string;
  user_id: string;
  // Core movie data (from OMDb)
  imdb_id: string;
  title: string;
  year: number;
  genre?: string;
  director?: string;
  poster_url?: string;
  
  // Physical collection specific
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  purchase_date?: Date;
  purchase_price?: number;
  purchase_location?: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  
  // Enhanced technical specs from blu-ray.com
  technical_specs?: BlurayTechnicalSpecs;
  
  // User metadata
  personal_rating?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}